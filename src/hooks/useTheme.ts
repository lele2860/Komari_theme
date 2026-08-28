import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  createContext,
  useContext,
} from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { useAppConfig } from "@/config";
import { DEFAULT_CONFIG, allAppearance } from "@/config/default";
import type { AppearanceType, ColorType, ViewModeType } from "@/config/default";
import {
  DEFAULT_CURRENCY_RATES_TO_CNY,
  parseCurrencyRates,
} from "@/utils";
import type {
  CurrencyRates,
  PriceNormalizationPeriod,
} from "@/utils";

type themeAppearanceType = "light" | "dark";
export type ExchangeRateSource = "auto" | "manual";
const defaultThemeAppearance: themeAppearanceType = "light";

export interface ThemeContextType {
  appearance: themeAppearanceType;
  rawAppearance: AppearanceType;
  setAppearance: (appearance: AppearanceType) => void;
  color: ColorType;
  setColor: (color: ColorType) => void;
  viewMode: ViewModeType;
  setViewMode: (mode: ViewModeType) => void;
  statusCardsVisibility: {
    currentTime: boolean;
    currentOnline: boolean;
    regionOverview: boolean;
    trafficOverview: boolean;
    trafficUsage: boolean;
    networkSpeed: boolean;
  };
  setStatusCardsVisibility: (
    visibility: Partial<ThemeContextType["statusCardsVisibility"]>
  ) => void;
  priceNormalization: PriceNormalizationPeriod;
  setPriceNormalization: (period: PriceNormalizationPeriod) => void;
  exchangeRateSource: ExchangeRateSource;
  setExchangeRateSource: (source: ExchangeRateSource) => void;
  manualCurrencyRates: string;
  setManualCurrencyRates: (value: string) => void;
  currencyRates: CurrencyRates;
  exchangeRateUpdatedAt: string | null;
  exchangeRateError: boolean;
  isExchangeRateLoading: boolean;
  refreshExchangeRates: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType>({
  appearance: defaultThemeAppearance,
  rawAppearance: DEFAULT_CONFIG.selectedDefaultAppearance as AppearanceType,
  setAppearance: () => {},
  color: DEFAULT_CONFIG.selectThemeColor as ColorType,
  setColor: () => {},
  viewMode: DEFAULT_CONFIG.selectedDefaultView as ViewModeType,
  setViewMode: () => {},
  statusCardsVisibility: {
    currentTime: true,
    currentOnline: true,
    regionOverview: true,
    trafficOverview: true,
    trafficUsage: true,
    networkSpeed: true,
  },
  setStatusCardsVisibility: () => {},
  priceNormalization: "original",
  setPriceNormalization: () => {},
  exchangeRateSource: "auto",
  setExchangeRateSource: () => {},
  manualCurrencyRates: "USD=7.2,CAD=5.0",
  setManualCurrencyRates: () => {},
  currencyRates: DEFAULT_CURRENCY_RATES_TO_CNY,
  exchangeRateUpdatedAt: null,
  exchangeRateError: false,
  isExchangeRateLoading: false,
  refreshExchangeRates: async () => {},
});

/**
 * 将 Radix UI 的 "system" 外观转换为实际的 "light" 或 "dark" 外观
 * @param appearance - 上下文中的外观设置（"light"、"dark" 或 "system"）。
 * 返回 Radix UI 已解析的外观（ "light" 或 "dark"）
 */
export const useSystemTheme = (
  appearance: AppearanceType
): themeAppearanceType => {
  const [systemTheme, setSystemTheme] = useState<themeAppearanceType>(() => {
    // Initial system theme detection
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    // Add listener for system theme changes
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Return the resolved theme
  if (appearance === "system") {
    return systemTheme;
  }

  return appearance as themeAppearanceType;
};

const useStoredState = <T>(
  key: string,
  defaultValue: T,
  validator?: (value: any) => value is T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const { enableLocalStorage } = useAppConfig();

  const [state, setState] = useState<T>(() => {
    if (enableLocalStorage) {
      try {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
          const parsedValue = JSON.parse(storedValue);
          if (!validator || validator(parsedValue)) {
            return parsedValue as T;
          }
        }
      } catch (error) {
        console.error("Error parsing stored state:", error);
        // Fallback to default value if parsing fails
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    if (enableLocalStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error("Error setting stored state:", error);
      }
    }
  }, [key, state, enableLocalStorage]);

  return [state, setState];
};

const isCurrencyRates = (value: unknown): value is CurrencyRates => {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).every(
    ([code, rate]) =>
      /^[A-Z]{3}$/.test(code) &&
      typeof rate === "number" &&
      Number.isFinite(rate) &&
      rate > 0
  );
};

export const useThemeManager = () => {
  const {
    selectedDefaultAppearance,
    selectThemeColor,
    selectedDefaultView,
    selectMobileDefaultView,
  } = useAppConfig();
  const defaultstatusCardsVisibility = useAppConfig().statusCardsVisibility;
  const isMobile = useIsMobile();

  const [appearance, setAppearance] = useStoredState<AppearanceType>(
    "appearance",
    selectedDefaultAppearance,
    (v): v is AppearanceType => allAppearance.includes(v)
  );

  const [color, setColor] = useStoredState<ColorType>(
    "color",
    selectThemeColor
  );

  const [viewMode, setViewMode] = useStoredState<ViewModeType>(
    "nodeViewMode",
    selectedDefaultView
  );

  useEffect(() => {
    if (selectMobileDefaultView && isMobile) {
      setViewMode(selectMobileDefaultView);
    }
    if (!isMobile) {
      setViewMode(selectedDefaultView);
    }
  }, [isMobile, selectMobileDefaultView, selectedDefaultView, setViewMode]);

  const [statusCardsVisibility, setStatusCardsVisibility] = useStoredState(
    "statusCardsVisibility",
    (() => {
      const visibility: { [key: string]: boolean } = {};
      defaultstatusCardsVisibility.split(",").forEach((item) => {
        const [key, value] = item.split(":");
        visibility[key] = value === "true";
      });
      return visibility as ThemeContextType["statusCardsVisibility"];
    })()
  );

  const [priceNormalization, setPriceNormalization] =
    useStoredState<PriceNormalizationPeriod>(
      "priceDisplayNormalization",
      "original",
      (value): value is PriceNormalizationPeriod =>
        value === "original" || value === "monthly" || value === "yearly"
    );

  const [exchangeRateSource, setExchangeRateSource] =
    useStoredState<ExchangeRateSource>(
      "priceExchangeRateSource",
      "auto",
      (value): value is ExchangeRateSource => value === "auto" || value === "manual"
    );
  const [manualCurrencyRates, setManualCurrencyRates] = useStoredState(
    "priceManualCurrencyRates",
    "USD=7.2,CAD=5.0"
  );
  const [cachedCurrencyRates, setCachedCurrencyRates] =
    useStoredState<CurrencyRates>(
      "priceAutoCurrencyRates",
      DEFAULT_CURRENCY_RATES_TO_CNY,
      isCurrencyRates
    );
  const [exchangeRateUpdatedAt, setExchangeRateUpdatedAt] = useStoredState<
    string | null
  >("priceAutoCurrencyRatesUpdatedAt", null, (value): value is string | null =>
    value === null || typeof value === "string"
  );
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false);
  const [exchangeRateError, setExchangeRateError] = useState(false);

  const refreshExchangeRates = useCallback(async () => {
    setIsExchangeRateLoading(true);
    setExchangeRateError(false);

    try {
      const response = await fetch(
        "https://api.frankfurter.dev/v1/latest?base=CNY"
      );
      if (!response.ok) {
        throw new Error(`Exchange rate request failed: ${response.status}`);
      }

      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object") {
        throw new Error("Exchange rate response was invalid");
      }

      const rates = (payload as { rates?: unknown }).rates;
      if (!rates || typeof rates !== "object") {
        throw new Error("Exchange rate response did not include rates");
      }

      const nextRates: CurrencyRates = { CNY: 1 };
      Object.entries(rates).forEach(([code, quoteRate]) => {
        const numericRate = Number(quoteRate);
        if (numericRate > 0 && Number.isFinite(numericRate)) {
          // The API returns quote units per CNY; invert to CNY per quote unit.
          nextRates[code.toUpperCase()] = 1 / numericRate;
        }
      });

      if (Object.keys(nextRates).length <= 1) {
        throw new Error("Exchange rate response was empty");
      }

      setCachedCurrencyRates(nextRates);
      const date = (payload as { date?: unknown }).date;
      setExchangeRateUpdatedAt(typeof date === "string" ? date : new Date().toISOString());
    } catch (error) {
      console.warn("Unable to update exchange rates; using cached values.", error);
      setExchangeRateError(true);
    } finally {
      setIsExchangeRateLoading(false);
    }
  }, [setCachedCurrencyRates, setExchangeRateUpdatedAt]);

  useEffect(() => {
    if (exchangeRateSource !== "auto") return;

    void refreshExchangeRates();
    const timer = window.setInterval(() => {
      void refreshExchangeRates();
    }, 24 * 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [exchangeRateSource, refreshExchangeRates]);

  const currencyRates = useMemo(() => {
    const configuredRates =
      exchangeRateSource === "manual"
        ? parseCurrencyRates(manualCurrencyRates)
        : cachedCurrencyRates;
    return { ...DEFAULT_CURRENCY_RATES_TO_CNY, ...configuredRates };
  }, [cachedCurrencyRates, exchangeRateSource, manualCurrencyRates]);

  // Add newly introduced statistics for visitors who already have saved display settings.
  useEffect(() => {
    if (statusCardsVisibility.trafficUsage === undefined) {
      setStatusCardsVisibility((prev) => ({ ...prev, trafficUsage: true }));
    }
  }, [statusCardsVisibility.trafficUsage, setStatusCardsVisibility]);

  const handleSetStatusCardsVisibility = (
    newVisibility: Partial<ThemeContextType["statusCardsVisibility"]>
  ) => {
    setStatusCardsVisibility((prev) => ({ ...prev, ...newVisibility }));
  };

  useEffect(() => {
    setColor(selectThemeColor);
  }, [selectThemeColor, setColor]);

  const resolvedAppearance = useSystemTheme(appearance);

  return {
    appearance: resolvedAppearance,
    rawAppearance: appearance,
    setAppearance,
    color,
    setColor,
    viewMode,
    setViewMode,
    statusCardsVisibility,
    setStatusCardsVisibility: handleSetStatusCardsVisibility,
    priceNormalization,
    setPriceNormalization,
    exchangeRateSource,
    setExchangeRateSource,
    manualCurrencyRates,
    setManualCurrencyRates,
    currencyRates,
    exchangeRateUpdatedAt,
    exchangeRateError,
    isExchangeRateLoading,
    refreshExchangeRates,
  };
};
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
