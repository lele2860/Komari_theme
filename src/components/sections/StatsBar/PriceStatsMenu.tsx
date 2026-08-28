import { memo } from "react";
import { Check, DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/config/hooks";
import { useTheme } from "@/hooks/useTheme";
import { USD_TO_CNY_RATE } from "@/utils";
import type {
  PriceDisplayCurrency,
  PriceDisplayPeriod,
} from "./types";

interface PriceStatsMenuProps {
  period: PriceDisplayPeriod;
  currency: PriceDisplayCurrency;
  onPeriodChange: (period: PriceDisplayPeriod) => void;
  onCurrencyChange: (currency: PriceDisplayCurrency) => void;
}

export const PriceStatsMenu = memo(
  ({
    period,
    currency,
    onPeriodChange,
    onCurrencyChange,
  }: PriceStatsMenuProps) => {
    const { t } = useLocale();
    const {
      priceNormalizationEnabled,
      setPriceNormalizationEnabled,
      exchangeRateSource,
      setExchangeRateSource,
      manualCurrencyRates,
      setManualCurrencyRates,
      exchangeRateUpdatedAt,
      exchangeRateError,
      isExchangeRateLoading,
      refreshExchangeRates,
      currencyRates,
    } = useTheme();
    const usdToCnyRate = currencyRates.USD || USD_TO_CNY_RATE;
    const periods: Array<{ key: PriceDisplayPeriod; label: string }> = [
      { key: "total", label: t("statsBar.priceTotal") },
      { key: "monthly", label: t("statsBar.priceMonthly") },
      { key: "daily", label: t("statsBar.priceDaily") },
    ];
    const currencies: Array<{
      key: PriceDisplayCurrency;
      label: string;
    }> = [
      { key: "original", label: t("statsBar.currencyOriginal") },
      { key: "CNY", label: t("statsBar.currencyCny") },
      { key: "USD", label: t("statsBar.currencyUsd") },
    ];

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 rounded-full cursor-pointer"
            title={t("statsBar.priceSettings")}
            aria-label={t("statsBar.priceSettings")}>
            <DollarSign className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("statsBar.priceSettings")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t("statsBar.pricePeriod")}
          </DropdownMenuLabel>
          {periods.map(({ key, label }) => (
            <DropdownMenuItem
              key={key}
              className="flex items-center justify-between cursor-pointer"
              onSelect={() => onPeriodChange(key)}>
              <span>{label}</span>
              {period === key && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t("statsBar.priceCurrency")}
          </DropdownMenuLabel>
          {currencies.map(({ key, label }) => (
            <DropdownMenuItem
              key={key}
              className="flex items-center justify-between cursor-pointer"
              onSelect={() => onCurrencyChange(key)}>
              <span>{label}</span>
              {currency === key && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          <div className="px-2 py-1 text-xs text-muted-foreground">
            {t("statsBar.currencyRate", {
              rate: usdToCnyRate.toFixed(4),
            })}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t("statsBar.exchangeRateSettings")}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="flex items-center justify-between cursor-pointer"
            onSelect={(event) => event.preventDefault()}>
            <span>{t("statsBar.exchangeRateAuto")}</span>
            <Switch
              checked={exchangeRateSource === "auto"}
              onCheckedChange={(checked) =>
                setExchangeRateSource(checked ? "auto" : "manual")
              }
            />
          </DropdownMenuItem>
          {exchangeRateSource === "auto" ? (
            <div className="px-2 py-1 space-y-1">
              <div className="text-xs text-muted-foreground">
                {t("statsBar.exchangeRateProvider")}
              </div>
              <div className="text-xs text-muted-foreground">
                {isExchangeRateLoading
                  ? t("statsBar.exchangeRateUpdating")
                  : exchangeRateError
                  ? t("statsBar.exchangeRateFallback")
                  : exchangeRateUpdatedAt
                  ? t("statsBar.exchangeRateUpdated", {
                      date: exchangeRateUpdatedAt,
                    })
                  : t("statsBar.exchangeRateNotUpdated")}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={isExchangeRateLoading}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void refreshExchangeRates();
                }}>
                <RefreshCw
                  className={isExchangeRateLoading ? "animate-spin" : ""}
                />
                {t("statsBar.exchangeRateRefresh")}
              </Button>
            </div>
          ) : (
            <div
              className="px-2 py-1 space-y-1"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}>
              <Input
                type="text"
                value={manualCurrencyRates}
                onChange={(event) => setManualCurrencyRates(event.target.value)}
                placeholder="USD=7.2,CAD=5.0"
                aria-label={t("statsBar.exchangeRateManual")}
              />
              <div className="text-xs text-muted-foreground">
                {t("statsBar.exchangeRateManualHelp")}
              </div>
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t("statsBar.priceNormalization")}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="flex items-center justify-between cursor-pointer"
            onSelect={(event) => event.preventDefault()}>
            <span>{t("statsBar.priceNormalize")}</span>
            <Switch
              checked={priceNormalizationEnabled}
              onCheckedChange={setPriceNormalizationEnabled}
            />
          </DropdownMenuItem>
          <div className="px-2 py-1 text-xs text-muted-foreground">
            {t("statsBar.priceNormalizeFollowPeriod")}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

PriceStatsMenu.displayName = "PriceStatsMenu";
