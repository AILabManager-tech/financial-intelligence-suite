export const PERIOD_OPTIONS = [
  { key: "1D", label: "1J", description: "1 jour intraday" },
  { key: "5D", label: "5J", description: "5 jours intraday" },
  { key: "1M", label: "1M", description: "1 mois", isDefault: true },
  { key: "6M", label: "6M", description: "6 mois" },
  { key: "YTD", label: "YTD", description: "Année en cours" },
  { key: "1Y", label: "1A", description: "1 an" },
  { key: "5Y", label: "5A", description: "5 ans" },
];

export const PERIOD_KEYS = PERIOD_OPTIONS.map((option) => option.key);

const PERIOD_KEY_SET = new Set(PERIOD_KEYS);

export function isValidPeriod(period) {
  return typeof period === "string" && PERIOD_KEY_SET.has(period);
}

function ytdDailyBusinessDays(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const calendarDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  return Math.max(1, Math.round((calendarDays * 5) / 7));
}

export function mapPeriodToTwelveData(period, now = new Date()) {
  switch (period) {
    case "1D":
      return { interval: "1h", outputsize: 8, timeUnit: "intraday" };
    case "5D":
      return { interval: "30min", outputsize: 65, timeUnit: "intraday" };
    case "1M":
      return { interval: "1day", outputsize: 22, timeUnit: "daily" };
    case "6M":
      return { interval: "1day", outputsize: 130, timeUnit: "daily" };
    case "YTD":
      return { interval: "1day", outputsize: ytdDailyBusinessDays(now), timeUnit: "daily" };
    case "1Y":
      return { interval: "1day", outputsize: 260, timeUnit: "daily" };
    case "5Y":
      return { interval: "1week", outputsize: 260, timeUnit: "weekly" };
    default:
      throw new Error(`Unknown period: ${period}`);
  }
}

export const DEFAULT_PERIOD = PERIOD_OPTIONS.find((option) => option.isDefault)?.key ?? "1M";
