import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { checkMarketDataHealth } from './server/marketDataHealth.js'
import { createPortfolioRepository } from './server/portfolioRepository.js'
import { validatePortfolioAssets, validatePortfolioSnapshot } from './server/portfolioValidation.js'
import { fetchFundamentals } from './server/fundamentals.js'
import { fetchCompanyNews } from './server/companyNews.js'
import { fetchEarningsCalendar } from './server/earningsCalendar.js'
import { fetchDividends } from './server/dividends.js'
import { fetchAnalystRatings } from './server/analystRatings.js'
import { fetchSecFilings } from './server/secFilings.js'
import { fetchPeers } from './server/peers.js'

const primaryQuoteSource = 'finnhub.io'
const fallbackQuoteSource = 'stooq.com'
const marketCache = new Map()
const cacheTtlMs = {
  quotes: 20 * 1000,
  history: 6 * 60 * 60 * 1000,
  search: 10 * 60 * 1000,
  health: 60 * 1000,
  fundamentals: 6 * 60 * 60 * 1000,
  companyNews: 30 * 60 * 1000,
  earnings: 6 * 60 * 60 * 1000,
  dividends: 24 * 60 * 60 * 1000,
  analystRatings: 6 * 60 * 60 * 1000,
  secFilings: 24 * 60 * 60 * 1000,
  peers: 24 * 60 * 60 * 1000,
}

async function readThroughCache(key, ttlMs, loadValue) {
  const now = Date.now()
  const cached = marketCache.get(key)

  if (cached && cached.expiresAt > now) {
    return { value: cached.value, cacheStatus: 'hit', expiresAt: cached.expiresAt }
  }

  const value = await loadValue()
  const expiresAt = now + ttlMs
  marketCache.set(key, { value, expiresAt })
  return { value, cacheStatus: 'miss', expiresAt }
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

function isProviderAccessDenied(error) {
  return /\b(upstream 401|upstream 403)\b/.test(error.message)
}

function unavailableDividendsPayload(symbol, error) {
  return {
    symbol,
    source: 'finnhub.io',
    fetchedAt: new Date().toISOString(),
    status: 'unavailable',
    reason: 'provider_access_denied',
    message: error.message,
    items: [],
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', (chunk) => chunks.push(chunk))
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch (error) {
        reject(error)
      }
    })
    request.on('error', reject)
  })
}

function toStooqSymbol(symbol) {
  return `${symbol.replace('.', '-').toLowerCase()}.us`
}

function normalizeStooqQuote(symbol, payload) {
  const rawQuote = payload?.symbols?.[0]
  const close = Number(rawQuote?.close)
  const open = Number(rawQuote?.open)
  const change = Number.isFinite(open) ? close - open : 0

  if (!Number.isFinite(close)) {
    throw new Error(`${symbol}: invalid stooq payload`)
  }

  return {
    symbol,
    name: rawQuote.name,
    price: close,
    change,
    changePct: Number.isFinite(open) && open > 0 ? (change / open) * 100 : 0,
    volume: rawQuote.volume,
    source: fallbackQuoteSource,
    fetchedAt: new Date().toISOString(),
    asOf: `${rawQuote.date}T${rawQuote.time}`,
  }
}

async function fetchQuote(symbol) {
  const token = process.env.FINNHUB_API_KEY

  try {
    if (!token) {
      throw new Error(`${symbol}: missing FINNHUB_API_KEY`)
    }

    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`${symbol}: ${response.status}`)
    }

    const payload = await response.json()
    const price = Number(payload.c)
    const previousClose = Number(payload.pc)
    const change = Number(payload.d)
    const changePct = Number(payload.dp)

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`${symbol}: invalid finnhub payload`)
    }

    return {
      symbol,
      price,
      change: Number.isFinite(change) ? change : price - previousClose,
      changePct: Number.isFinite(changePct) ? changePct : 0,
      previousClose: Number.isFinite(previousClose) ? previousClose : null,
      source: primaryQuoteSource,
      fetchedAt: new Date().toISOString(),
      asOf: payload.t ? new Date(payload.t * 1000).toISOString() : undefined,
    }
  } catch {
    const fallbackResponse = await fetch(`https://stooq.com/q/l/?s=${toStooqSymbol(symbol)}&f=sd2t2ohlcvn&h&e=json`, {
      headers: { accept: 'application/json' },
    })
    if (!fallbackResponse.ok) {
      throw new Error(`${symbol}: ${fallbackResponse.status}`)
    }

    return normalizeStooqQuote(symbol, await fallbackResponse.json())
  }
}

function normalizeTimeSeries(symbol, payload) {
  if (payload?.status === 'error') {
    throw new Error(`${symbol}: ${payload.message ?? 'Twelve Data error'}`)
  }

  if (!Array.isArray(payload?.values)) {
    throw new Error(`${symbol}: invalid Twelve Data payload`)
  }

  return payload.values
    .map((point) => ({
      date: String(point.datetime).slice(0, 10),
      close: Number(point.close),
      open: Number(point.open),
      high: Number(point.high),
      low: Number(point.low),
      volume: Number(point.volume),
    }))
    .filter((point) => Number.isFinite(point.close))
    .reverse()
}

async function fetchHistory(symbol, days) {
  const token = process.env.TWELVE_DATA_API_KEY
  if (!token) {
    throw new Error('TWELVE_DATA_API_KEY is required for factual historical data')
  }

  const url = new URL('https://api.twelvedata.com/time_series')
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', '1day')
  url.searchParams.set('outputsize', String(days))
  url.searchParams.set('order', 'desc')
  url.searchParams.set('apikey', token)

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`${symbol}: ${response.status}`)
  }

  return normalizeTimeSeries(symbol, await response.json())
}

async function searchSymbols(query) {
  const token = process.env.FINNHUB_API_KEY
  if (!token) {
    throw new Error('FINNHUB_API_KEY is required for symbol search')
  }

  const url = new URL('https://finnhub.io/api/v1/search')
  url.searchParams.set('q', query)
  url.searchParams.set('token', token)

  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Finnhub search failed: ${response.status}`)
  }

  const payload = await response.json()
  return Array.isArray(payload.result)
    ? payload.result
      .filter((item) => item.symbol && item.description)
      .map((item) => ({
        symbol: item.symbol,
        description: item.description,
        type: item.type,
      }))
      .slice(0, 12)
    : []
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const finnhubApiKey = env.FINNHUB_API_KEY
  const twelveDataApiKey = env.TWELVE_DATA_API_KEY
  if (finnhubApiKey) {
    process.env.FINNHUB_API_KEY = finnhubApiKey
  }
  if (twelveDataApiKey) {
    process.env.TWELVE_DATA_API_KEY = twelveDataApiKey
  }

  return {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
            if (id.includes('katex')) return 'vendor-katex'
            if (id.includes('lucide-react')) return 'vendor-icons'
            return undefined
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'financial-quotes-api',
        configureServer(server) {
          const portfolioRepository = createPortfolioRepository()

          server.middlewares.use('/api/health/market-data', async (request, response) => {
            if (request.method !== 'GET') {
              sendJson(response, 405, { error: 'method not allowed' })
              return
            }

            try {
              const { value, cacheStatus, expiresAt } = await readThroughCache(
                'health:market-data',
                cacheTtlMs.health,
                () => checkMarketDataHealth({
                  finnhubApiKey: process.env.FINNHUB_API_KEY,
                  twelveDataApiKey: process.env.TWELVE_DATA_API_KEY,
                }),
              )

              sendJson(response, value.status === 'degraded' ? 207 : 200, {
                ...value,
                cache: {
                  status: cacheStatus,
                  ttlMs: cacheTtlMs.health,
                  expiresAt: new Date(expiresAt).toISOString(),
                },
              })
            } catch (error) {
              sendJson(response, 503, {
                status: 'down',
                checkedAt: new Date().toISOString(),
                error: error.message,
              })
            }
          })

          server.middlewares.use('/api/quotes', async (request, response) => {
            const requestUrl = new URL(request.url ?? '', 'http://localhost')
            const symbols = (requestUrl.searchParams.get('symbols') ?? '')
              .split(',')
              .map((symbol) => symbol.trim().toUpperCase())
              .filter(Boolean)
              .slice(0, 30)

            if (!symbols.length) {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json')
              response.end(JSON.stringify({ error: 'symbols query parameter is required' }))
              return
            }

            const { value, cacheStatus, expiresAt } = await readThroughCache(
              `quotes:${symbols.join(',')}`,
              cacheTtlMs.quotes,
              async () => {
                const settled = await Promise.allSettled(symbols.map(fetchQuote))
                const quotes = settled
                  .filter((result) => result.status === 'fulfilled')
                  .map((result) => result.value)
                const errors = settled
                  .filter((result) => result.status === 'rejected')
                  .map((result) => result.reason.message)

                return {
                  source: quotes.some((quote) => quote.source === primaryQuoteSource) ? primaryQuoteSource : fallbackQuoteSource,
                  fetchedAt: new Date().toISOString(),
                  quotes,
                  errors,
                  primaryConfigured: Boolean(process.env.FINNHUB_API_KEY),
                }
              },
            )
            const quotes = value.quotes

            response.statusCode = quotes.length ? 200 : 502
            response.setHeader('Content-Type', 'application/json')
            response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify({
              ...value,
              cache: {
                status: cacheStatus,
                ttlMs: cacheTtlMs.quotes,
                expiresAt: new Date(expiresAt).toISOString(),
              },
          }))
        })

        server.middlewares.use('/api/history', async (request, response) => {
          const requestUrl = new URL(request.url ?? '', 'http://localhost')
          const symbol = (requestUrl.searchParams.get('symbol') ?? '').trim().toUpperCase()
          const days = Math.min(Math.max(Number(requestUrl.searchParams.get('days') ?? 30), 5), 365)

          if (!symbol) {
            response.statusCode = 400
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: 'symbol query parameter is required' }))
            return
          }

          try {
            const { value: points, cacheStatus, expiresAt } = await readThroughCache(
              `history:${symbol}:${days}`,
              cacheTtlMs.history,
              () => fetchHistory(symbol, days),
            )
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.setHeader('Cache-Control', 'no-store')
            response.end(JSON.stringify({
              symbol,
              source: 'twelvedata.com',
              fetchedAt: new Date().toISOString(),
              cache: {
                status: cacheStatus,
                ttlMs: cacheTtlMs.history,
                expiresAt: new Date(expiresAt).toISOString(),
              },
              points,
            }))
          } catch (error) {
            response.statusCode = 503
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: error.message, source: 'twelvedata.com' }))
          }
        })

        server.middlewares.use('/api/dividends', async (request, response) => {
          const requestUrl = new URL(request.url ?? '', 'http://localhost')
          const symbol = (requestUrl.searchParams.get('symbol') ?? '').trim().toUpperCase()

          if (!symbol) {
            sendJson(response, 400, { error: 'symbol query parameter is required' })
            return
          }

          try {
            const { value, cacheStatus, expiresAt } = await readThroughCache(
              `dividends:${symbol}`,
              cacheTtlMs.dividends,
              () => fetchDividends(symbol, {
                finnhubApiKey: process.env.FINNHUB_API_KEY,
                alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY,
                twelveDataApiKey: process.env.TWELVE_DATA_API_KEY,
              }),
            )
            sendJson(response, 200, {
              ...value,
              cache: {
                status: cacheStatus,
                ttlMs: cacheTtlMs.dividends,
                expiresAt: new Date(expiresAt).toISOString(),
              },
            })
          } catch (error) {
            if (isProviderAccessDenied(error)) {
              sendJson(response, 200, {
                ...unavailableDividendsPayload(symbol, error),
                cache: {
                  status: 'miss',
                  ttlMs: cacheTtlMs.dividends,
                  expiresAt: new Date(Date.now() + cacheTtlMs.dividends).toISOString(),
                },
              })
              return
            }
            sendJson(response, 502, { error: error.message, source: 'finnhub.io' })
          }
        })

        server.middlewares.use('/api/earnings', async (request, response) => {
          const requestUrl = new URL(request.url ?? '', 'http://localhost')
          const symbol = (requestUrl.searchParams.get('symbol') ?? '').trim().toUpperCase()

          if (!symbol) {
            sendJson(response, 400, { error: 'symbol query parameter is required' })
            return
          }

          try {
            const { value, cacheStatus, expiresAt } = await readThroughCache(
              `earnings:${symbol}`,
              cacheTtlMs.earnings,
              () => fetchEarningsCalendar(symbol, { finnhubApiKey: process.env.FINNHUB_API_KEY }),
            )
            sendJson(response, 200, {
              ...value,
              cache: {
                status: cacheStatus,
                ttlMs: cacheTtlMs.earnings,
                expiresAt: new Date(expiresAt).toISOString(),
              },
            })
          } catch (error) {
            sendJson(response, 502, { error: error.message, source: 'finnhub.io' })
          }
        })

        server.middlewares.use('/api/company-news', async (request, response) => {
          const requestUrl = new URL(request.url ?? '', 'http://localhost')
          const symbol = (requestUrl.searchParams.get('symbol') ?? '').trim().toUpperCase()
          const limit = Math.min(Math.max(Number(requestUrl.searchParams.get('limit') ?? 10), 1), 25)

          if (!symbol) {
            sendJson(response, 400, { error: 'symbol query parameter is required' })
            return
          }

          try {
            const { value, cacheStatus, expiresAt } = await readThroughCache(
              `company-news:${symbol}:${limit}`,
              cacheTtlMs.companyNews,
              () => fetchCompanyNews(symbol, { finnhubApiKey: process.env.FINNHUB_API_KEY, limit }),
            )
            sendJson(response, 200, {
              ...value,
              cache: {
                status: cacheStatus,
                ttlMs: cacheTtlMs.companyNews,
                expiresAt: new Date(expiresAt).toISOString(),
              },
            })
          } catch (error) {
            sendJson(response, 502, { error: error.message, source: 'finnhub.io' })
          }
        })

        server.middlewares.use('/api/analyst-ratings', async (request, response) => {
          const requestUrl = new URL(request.url ?? '', 'http://localhost')
          const symbol = (requestUrl.searchParams.get('symbol') ?? '').trim().toUpperCase()

          if (!symbol) {
            sendJson(response, 400, { error: 'symbol query parameter is required' })
            return
          }

          try {
            const { value, cacheStatus, expiresAt } = await readThroughCache(
              `analyst-ratings:${symbol}`,
              cacheTtlMs.analystRatings,
              () => fetchAnalystRatings(symbol, { finnhubApiKey: process.env.FINNHUB_API_KEY }),
            )
            sendJson(response, 200, {
              ...value,
              cache: {
                status: cacheStatus,
                ttlMs: cacheTtlMs.analystRatings,
                expiresAt: new Date(expiresAt).toISOString(),
              },
            })
          } catch (error) {
            sendJson(response, 502, { error: error.message, source: 'finnhub.io' })
          }
        })

        server.middlewares.use('/api/peers', async (request, response) => {
          const requestUrl = new URL(request.url ?? '', 'http://localhost')
          const symbol = (requestUrl.searchParams.get('symbol') ?? '').trim().toUpperCase()
          const limit = Math.min(Math.max(Number(requestUrl.searchParams.get('limit') ?? 10), 1), 25)

          if (!symbol) {
            sendJson(response, 400, { error: 'symbol query parameter is required' })
            return
          }

          try {
            const { value, cacheStatus, expiresAt } = await readThroughCache(
              `peers:${symbol}:${limit}`,
              cacheTtlMs.peers,
              () => fetchPeers(symbol, { finnhubApiKey: process.env.FINNHUB_API_KEY, limit }),
            )
            sendJson(response, 200, {
              ...value,
              cache: {
                status: cacheStatus,
                ttlMs: cacheTtlMs.peers,
                expiresAt: new Date(expiresAt).toISOString(),
              },
            })
          } catch (error) {
            sendJson(response, 502, { error: error.message, source: 'finnhub.io' })
          }
        })

        server.middlewares.use('/api/sec-filings', async (request, response) => {
          const requestUrl = new URL(request.url ?? '', 'http://localhost')
          const symbol = (requestUrl.searchParams.get('symbol') ?? '').trim().toUpperCase()
          const limit = Math.min(Math.max(Number(requestUrl.searchParams.get('limit') ?? 15), 1), 25)

          if (!symbol) {
            sendJson(response, 400, { error: 'symbol query parameter is required' })
            return
          }

          try {
            const { value, cacheStatus, expiresAt } = await readThroughCache(
              `sec-filings:${symbol}:${limit}`,
              cacheTtlMs.secFilings,
              () => fetchSecFilings(symbol, { finnhubApiKey: process.env.FINNHUB_API_KEY, limit }),
            )
            sendJson(response, 200, {
              ...value,
              cache: {
                status: cacheStatus,
                ttlMs: cacheTtlMs.secFilings,
                expiresAt: new Date(expiresAt).toISOString(),
              },
            })
          } catch (error) {
            sendJson(response, 502, { error: error.message, source: 'finnhub.io' })
          }
        })

        server.middlewares.use('/api/fundamentals', async (request, response) => {
          const requestUrl = new URL(request.url ?? '', 'http://localhost')
          const symbol = (requestUrl.searchParams.get('symbol') ?? '').trim().toUpperCase()

          if (!symbol) {
            sendJson(response, 400, { error: 'symbol query parameter is required' })
            return
          }

          try {
            const { value, cacheStatus, expiresAt } = await readThroughCache(
              `fundamentals:${symbol}`,
              cacheTtlMs.fundamentals,
              () => fetchFundamentals(symbol, { finnhubApiKey: process.env.FINNHUB_API_KEY }),
            )
            sendJson(response, 200, {
              ...value,
              cache: {
                status: cacheStatus,
                ttlMs: cacheTtlMs.fundamentals,
                expiresAt: new Date(expiresAt).toISOString(),
              },
            })
          } catch (error) {
            sendJson(response, 502, { error: error.message, source: 'finnhub.io' })
          }
        })

        server.middlewares.use('/api/search', async (request, response) => {
          const requestUrl = new URL(request.url ?? '', 'http://localhost')
          const query = (requestUrl.searchParams.get('q') ?? '').trim()

          if (query.length < 2) {
            response.statusCode = 400
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: 'q query parameter must contain at least 2 characters' }))
            return
          }

          try {
            const { value: results, cacheStatus, expiresAt } = await readThroughCache(
              `search:${query.toLowerCase()}`,
              cacheTtlMs.search,
              () => searchSymbols(query),
            )
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.setHeader('Cache-Control', 'no-store')
            response.end(JSON.stringify({
              source: primaryQuoteSource,
              fetchedAt: new Date().toISOString(),
              cache: {
                status: cacheStatus,
                ttlMs: cacheTtlMs.search,
                expiresAt: new Date(expiresAt).toISOString(),
              },
              results,
            }))
          } catch (error) {
            response.statusCode = 503
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: error.message, source: primaryQuoteSource }))
          }
        })

        server.middlewares.use('/api/portfolio/snapshots', async (request, response) => {
          if (request.method === 'GET') {
            const requestUrl = new URL(request.url ?? '', 'http://localhost')
            const limit = requestUrl.searchParams.get('limit') ?? 120

            sendJson(response, 200, {
              snapshots: portfolioRepository.listSnapshots(limit),
              source: 'sqlite',
            })
            return
          }

          if (request.method !== 'POST') {
            sendJson(response, 405, { error: 'method not allowed' })
            return
          }

          try {
            const payload = await readJsonBody(request)
            sendJson(response, 201, {
              snapshot: portfolioRepository.saveSnapshot(validatePortfolioSnapshot(payload.snapshot ?? payload)),
              source: 'sqlite',
            })
          } catch (error) {
            sendJson(response, 400, { error: error.message })
          }
        })

        server.middlewares.use('/api/portfolio', async (request, response) => {
          if (request.method === 'GET') {
            sendJson(response, 200, {
              assets: portfolioRepository.listAssets(),
              source: 'sqlite',
            })
            return
          }

          if (request.method !== 'PUT') {
            sendJson(response, 405, { error: 'method not allowed' })
            return
          }

          try {
            const payload = await readJsonBody(request)
            const assets = validatePortfolioAssets(payload.assets ?? [])
            sendJson(response, 200, {
              assets: portfolioRepository.saveAssets(assets),
              updatedAt: new Date().toISOString(),
              source: 'sqlite',
            })
          } catch (error) {
            sendJson(response, 400, { error: error.message })
          }
        })
      },
    },
    ],
    test: {
      environment: 'jsdom',
      globals: true,
      css: false,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        'root-copy/**',
        'financial-intelligence-suite/**',
      ],
    },
  }
})
