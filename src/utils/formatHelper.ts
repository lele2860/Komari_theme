import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to format bytes
export const formatBytes = (bytes: number, isSpeed = false, decimals = 2) => {
  if (bytes === 0) return isSpeed ? "0 B/s" : "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = isSpeed
    ? ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"]
    : ["B", "KB", "MB", "GB", "TB", "PB", "EB"];

  let i = Math.floor(Math.log(bytes) / Math.log(k));
  let value = bytes / Math.pow(k, i);

  // 如果值大于等于1000，则进位到下一个单位
  if (value >= 1000 && i < sizes.length - 1) {
    i++;
    value = bytes / Math.pow(k, i);
  }

  return parseFloat(value.toFixed(dm)) + " " + sizes[i];
};

// Helper function to format uptime
export const formatUptime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) {
    return "N/A";
  }
  const days = Math.floor(seconds / (3600 * 24));
  seconds -= days * 3600 * 24;
  const hrs = Math.floor(seconds / 3600);
  seconds -= hrs * 3600;
  const mns = Math.floor(seconds / 60);

  let uptimeString = "";
  if (days > 0) {
    uptimeString += `${days}天`;
  }
  if (hrs > 0) {
    uptimeString += `${hrs}小时`;
  }
  if (mns > 0 && days === 0) {
    // Only show minutes if uptime is less than a day
    uptimeString += `${mns}分钟`;
  }
  if (uptimeString === "") {
    return "刚刚";
  }

  return uptimeString;
};

/** Display mode for individual node prices. */
export type PriceNormalizationPeriod = "original" | "monthly" | "daily";

/** Exchange rates expressed as CNY for one unit of the currency. */
export type CurrencyRates = Record<string, number>;

// These values are only an offline fallback. Automatic rates or manual values
// take precedence whenever they are available.
export const DEFAULT_CURRENCY_RATES_TO_CNY: CurrencyRates = {
  CNY: 1,
  USD: 7.2,
  CAD: 5,
};

export const formatPrice = (
  price: number,
  currency: string,
  billingCycle: number,
  normalization: PriceNormalizationPeriod = "original"
) => {
  if (price === -1) return "免费";
  if (price === 0) return "";
  if (!currency || !billingCycle) return "N/A";

  if (normalization !== "original" && billingCycle > 0) {
    const days = normalization === "monthly" ? 30 : 1;
    const periodLabel = normalization === "monthly" ? "月" : "日";
    return `${currency}${((price * days) / billingCycle).toFixed(2)}/${periodLabel}`;
  }

  const cycleStr = getBillingCycleLabel(billingCycle);
  return billingCycle < 0
    ? `${currency}${price.toFixed(2)}`
    : `${currency}${price.toFixed(2)}/${cycleStr}`;
};

const getBillingCycleLabel = (billingCycle: number) => {
  if (billingCycle === 30 || billingCycle === 31) return "月";
  if (billingCycle >= 89 && billingCycle <= 92) return "季";
  if (billingCycle >= 180 && billingCycle <= 183) return "半年";
  if (billingCycle >= 364 && billingCycle <= 366) return "年";
  if (billingCycle >= 730 && billingCycle <= 732) return "两年";
  if (billingCycle >= 1095 && billingCycle <= 1097) return "三年";
  if (billingCycle >= 1825 && billingCycle <= 1827) return "五年";
  return `${billingCycle}天`;
};

export const formatTrafficLimit = (
  limit?: number,
  type?: "sum" | "max" | "min" | "up" | "down"
) => {
  if (!limit) return "未设置";

  const limitText = formatBytes(limit);

  const typeText =
    {
      sum: "总和",
      max: "最大值",
      min: "最小值",
      up: "上传",
      down: "下载",
    }[type || "max"] || "";

  return `总 ${limitText} (${typeText})`;
};

/** Currency used by the server cost summary and individual node prices. */
export type PriceDisplayCurrency = "original" | "USD" | "CNY";

/** Price period used by the server cost summary. */
export type PriceDisplayPeriod = "total" | "monthly" | "daily";

// Keep conversion deterministic and offline. Adjust this value when a
// deployment uses a different accounting exchange rate.
export const USD_TO_CNY_RATE = 7.2;

/** Normalize common currency symbols/names to ISO 4217 currency codes. */
export const normalizeCurrencyCode = (currency: string): string | null => {
  const value = (currency || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!value) return null;

  if (
    value === "¥" ||
    value === "￥" ||
    value === "CN¥" ||
    value === "CNY" ||
    value === "RMB" ||
    value.includes("人民币")
  ) {
    return "CNY";
  }
  if (
    value === "$" ||
    value === "US$" ||
    value === "USD" ||
    value.includes("美元")
  ) {
    return "USD";
  }
  if (
    value === "C$" ||
    value === "CA$" ||
    value === "CAD$" ||
    value === "CAD" ||
    value.includes("加元") ||
    value.includes("加拿大元")
  ) {
    return "CAD";
  }
  if (value === "€" || value === "EUR" || value.includes("欧元")) {
    return "EUR";
  }
  if (value === "£" || value === "GBP" || value.includes("英镑")) {
    return "GBP";
  }
  if (value === "HK$" || value === "HKD" || value.includes("港币")) {
    return "HKD";
  }
  if (value === "A$" || value === "AUD$" || value === "AUD" || value.includes("澳元")) {
    return "AUD";
  }
  if (value === "S$" || value === "SGD$" || value === "SGD" || value.includes("新加坡元")) {
    return "SGD";
  }
  if (value === "JP¥" || value === "JPY" || value.includes("日元")) {
    return "JPY";
  }

  return /^[A-Z]{3}$/.test(value) ? value : null;
};

/** Parse a comma/newline separated list such as `USD=7.2,CAD=5.0`. */
export const parseCurrencyRates = (value: string): CurrencyRates => {
  const rates: CurrencyRates = { CNY: 1 };
  value
    .split(/[;,\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const separatorIndex = entry.search(/[=:]/);
      if (separatorIndex < 1) return;

      const code = normalizeCurrencyCode(entry.slice(0, separatorIndex));
      const rate = Number(entry.slice(separatorIndex + 1).trim());
      if (code && Number.isFinite(rate) && rate > 0) {
        rates[code] = rate;
      }
    });
  return rates;
};

/**
 * Convert a Komari price to CNY. Komari commonly stores "$" and "¥", but
 * currency codes are accepted as well so mixed-price node lists work.
 */
export const convertPriceToCny = (
  price: number,
  currency: string,
  rates: CurrencyRates = DEFAULT_CURRENCY_RATES_TO_CNY
): number | null => {
  if (!Number.isFinite(price)) return null;

  const code = normalizeCurrencyCode(currency);
  if (!code) return null;

  const rate = rates[code] ?? DEFAULT_CURRENCY_RATES_TO_CNY[code];
  return Number.isFinite(rate) && rate > 0 ? price * rate : null;
};

/**
 * Return a node's comparable daily price in CNY. Free/zero-priced nodes are
 * treated as zero; unknown currencies or billing cycles are left unsortable.
 */
export const getDailyPriceCny = (
  price: number,
  currency: string,
  billingCycle: number,
  rates: CurrencyRates = DEFAULT_CURRENCY_RATES_TO_CNY
): number | null => {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return null;
  if (numericPrice <= 0) return 0;

  const priceCny = convertPriceToCny(numericPrice, currency, rates);
  const cycle = Number(billingCycle);
  if (priceCny === null || !Number.isFinite(cycle) || cycle <= 0) {
    return null;
  }

  return priceCny / cycle;
};

/**
 * Format a node price in its original currency, or convert it to the selected
 * display currency before applying the requested billing period.
 */
export const formatPriceForDisplay = (
  price: number,
  currency: string,
  billingCycle: number,
  normalization: PriceNormalizationPeriod = "original",
  displayCurrency: PriceDisplayCurrency = "original",
  rates: CurrencyRates = DEFAULT_CURRENCY_RATES_TO_CNY
) => {
  if (displayCurrency === "original") {
    return formatPrice(price, currency, billingCycle, normalization);
  }
  if (price === -1) return "免费";
  if (price === 0) return "";
  if (!currency || !billingCycle) return "N/A";

  const priceCny = convertPriceToCny(price, currency, rates);
  if (priceCny === null) {
    return formatPrice(price, currency, billingCycle, normalization);
  }

  const usdRate = rates.USD || DEFAULT_CURRENCY_RATES_TO_CNY.USD;
  const amount = displayCurrency === "USD" ? priceCny / usdRate : priceCny;
  const symbol = displayCurrency === "USD" ? "$" : "¥";
  const formattedAmount = (value: number) => `${symbol}${value.toFixed(2)}`;

  if (normalization === "monthly" && billingCycle > 0) {
    return `${formattedAmount((amount * 30) / billingCycle)}/月`;
  }
  if (normalization === "daily" && billingCycle > 0) {
    return `${formattedAmount(amount / billingCycle)}/日`;
  }

  return billingCycle < 0
    ? formattedAmount(amount)
    : `${formattedAmount(amount)}/${getBillingCycleLabel(billingCycle)}`;
};

/** Format a monetary value with a stable two-decimal currency display. */
export type ConvertiblePriceDisplayCurrency = Exclude<
  PriceDisplayCurrency,
  "original"
>;

export const formatMoney = (
  amount: number,
  currency: ConvertiblePriceDisplayCurrency
) =>
  new Intl.NumberFormat(currency === "USD" ? "en-US" : "zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

export const getProgressBarClass = (percentage: number) => {
  if (percentage > 90) return "bg-red-600";
  if (percentage > 50) return "bg-yellow-400";
  return "bg-green-500";
};
