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

export async function checkFinnhubFundamentalsHealth(token, fetcher = fetchWithTimeout) {
  if (!token) {
    return providerResult("finnhub.io", "missing_config", {
      configured: false,
      capability: "fundamentals",
    });
  }

  const result = await measureProvider("finnhub.io", async () => {
    const url = new URL("https://finnhub.io/api/v1/stock/metric");
    url.searchParams.set("symbol", "AAPL");
    url.searchParams.set("metric", "all");
    url.searchParams.set("token", token);

    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const metric = payload?.metric;
    if (!metric || typeof metric !== "object" || Object.keys(metric).length === 0) {
      throw new Error("empty metric payload");
    }

    return providerResult("finnhub.io", "ok", {
      configured: true,
      capability: "fundamentals",
      sample: "AAPL /stock/metric",
    });
  });

  // Capability is the audit handle for the healthcheck — the UI groups
  // providers by capability, so it must be present even when the probe failed.
  if (!result.capability) {
    result.capability = "fundamentals";
    result.configured = true;
  }
  return result;
}

export async function checkFinnhubCompanyNewsHealth(token, fetcher = fetchWithTimeout) {
  if (!token) {
    return providerResult("finnhub.io", "missing_config", {
      configured: false,
      capability: "company_news",
    });
  }

  const result = await measureProvider("finnhub.io", async () => {
    const today = new Date();
    const from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const url = new URL("https://finnhub.io/api/v1/company-news");
    url.searchParams.set("symbol", "AAPL");
    url.searchParams.set("from", from.toISOString().slice(0, 10));
    url.searchParams.set("to", today.toISOString().slice(0, 10));
    url.searchParams.set("token", token);

    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("invalid company-news payload");
    }

    return providerResult("finnhub.io", "ok", {
      configured: true,
      capability: "company_news",
      sample: "AAPL last 7d",
    });
  });

  if (!result.capability) {
    result.capability = "company_news";
    result.configured = true;
  }
  return result;
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

export async function checkFxHealth(fetcher = fetchWithTimeout) {
  // Frankfurter is keyless (ECB reference rates), so FX is always "configured".
  const result = await measureProvider("frankfurter.app", async () => {
    const url = new URL("https://api.frankfurter.app/latest");
    url.searchParams.set("from", "USD");
    url.searchParams.set("to", "EUR");

    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rate = Number(payload?.rates?.EUR);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("invalid fx payload");
    }

    return providerResult("frankfurter.app", "ok", {
      configured: true,
      capability: "fx_rates",
      sample: "USD→EUR",
    });
  });

  // Capability is the audit handle (UI groups by capability) — keep it present
  // even when the probe failed, like the fundamentals/company-news checks.
  if (!result.capability) {
    result.capability = "fx_rates";
    result.configured = true;
  }
  return result;
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

export async function checkMarketDataHealth({ finnhubApiKey, twelveDataApiKey, fetcher = fetchWithTimeout }) {
  const providers = await Promise.all([
    checkFinnhubHealth(finnhubApiKey, fetcher),
    checkFinnhubFundamentalsHealth(finnhubApiKey, fetcher),
    checkFinnhubCompanyNewsHealth(finnhubApiKey, fetcher),
    checkTwelveDataHealth(twelveDataApiKey, fetcher),
    checkStooqHealth(fetcher),
    checkFxHealth(fetcher),
  ]);

  return {
    status: summarizeMarketDataHealth(providers),
    checkedAt: nowIso(),
    providers,
  };
}
