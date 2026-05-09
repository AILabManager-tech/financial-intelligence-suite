import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const primaryQuoteSource = 'finnhub.io'
const fallbackQuoteSource = 'stooq.com'

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
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'financial-quotes-api',
        configureServer(server) {
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

            const settled = await Promise.allSettled(symbols.map(fetchQuote))
            const quotes = settled
              .filter((result) => result.status === 'fulfilled')
              .map((result) => result.value)
            const errors = settled
              .filter((result) => result.status === 'rejected')
              .map((result) => result.reason.message)

            response.statusCode = quotes.length ? 200 : 502
            response.setHeader('Content-Type', 'application/json')
            response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify({
              source: quotes.some((quote) => quote.source === primaryQuoteSource) ? primaryQuoteSource : fallbackQuoteSource,
              fetchedAt: new Date().toISOString(),
              quotes,
              errors,
              primaryConfigured: Boolean(process.env.FINNHUB_API_KEY),
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
            const points = await fetchHistory(symbol, days)
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.setHeader('Cache-Control', 'no-store')
            response.end(JSON.stringify({
              symbol,
              source: 'twelvedata.com',
              fetchedAt: new Date().toISOString(),
              points,
            }))
          } catch (error) {
            response.statusCode = 503
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: error.message, source: 'twelvedata.com' }))
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
            const results = await searchSymbols(query)
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.setHeader('Cache-Control', 'no-store')
            response.end(JSON.stringify({
              source: primaryQuoteSource,
              fetchedAt: new Date().toISOString(),
              results,
            }))
          } catch (error) {
            response.statusCode = 503
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: error.message, source: primaryQuoteSource }))
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
