const defaultTimeoutMs = 5000;

function nowIso() {
  return new Date().toISOString();
}

function providerResult(provider, status, details = {}) {
  return {
    provider,
    status,
    checkedAt: nowIso(),
    ...details,
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = defaultTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function measureProvider(provider, check) {
  const startedAt = performance.now();

  try {
    const result = await check();
    return {
      ...result,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return providerResult(provider, "down", {
      latencyMs: Math.round(performance.now() - startedAt),
      error: error.name === "AbortError" ? "request timeout" : error.message,
    });
  }
}

export async function checkFinnhubHealth(token, fetcher = fetchWithTimeout) {
  if (!token) {
    return providerResult("finnhub.io", "missing_config", {
      configured: false,
      capability: "quotes/search",
    });
  }

  return measureProvider("finnhub.io", async () => {
    const url = new URL("https://finnhub.io/api/v1/quote");
    url.searchParams.set("symbol", "AAPL");
    url.searchParams.set("token", token);

    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const price = Number(payload.c);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("invalid quote payload");
    }

    return providerResult("finnhub.io", "ok", {
      configured: true,
      capability: "quotes/search",
      sample: "AAPL",
    });
  });
}

export async function checkTwelveDataHealth(token, fetcher = fetchWithTimeout) {
  if (!token) {
    return providerResult("twelvedata.com", "missing_config", {
      configured: false,
      capability: "historical_prices",
    });
  }

  return measureProvider("twelvedata.com", async () => {
    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", "AAPL");
    url.searchParams.set("interval", "1day");
    url.searchParams.set("outputsize", "1");
    url.searchParams.set("apikey", token);

    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.status === "error") {
      throw new Error(payload.message ?? "provider error");
    }

    if (!Array.isArray(payload?.values) || !payload.values.length) {
      throw new Error("invalid time series payload");
    }

    return providerResult("twelvedata.com", "ok", {
      configured: true,
      capability: "historical_prices",
      sample: "AAPL 1day",
    });
  });
}

export async function checkStooqHealth(fetcher = fetchWithTimeout) {
  return measureProvider("stooq.com", async () => {
    const response = await fetcher("https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcvn&h&e=json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const close = Number(payload?.symbols?.[0]?.close);

    if (!Number.isFinite(close) || close <= 0) {
      throw new Error("invalid quote payload");
    }

    return providerResult("stooq.com", "ok", {
      configured: true,
      capability: "quote_fallback",
      sample: "AAPL.US",
    });
  });
}

export function summarizeMarketDataHealth(providers) {
  if (providers.some((provider) => provider.status === "down")) {
    return "degraded";
  }

  if (providers.some((provider) => provider.status === "missing_config")) {
    return "partial";
  }

  return "ok";
}

export async function checkMarketDataHealth({ finnhubApiKey, twelveDataApiKey }) {
  const providers = await Promise.all([
    checkFinnhubHealth(finnhubApiKey),
    checkTwelveDataHealth(twelveDataApiKey),
    checkStooqHealth(),
  ]);

  return {
    status: summarizeMarketDataHealth(providers),
    checkedAt: nowIso(),
    providers,
  };
}
