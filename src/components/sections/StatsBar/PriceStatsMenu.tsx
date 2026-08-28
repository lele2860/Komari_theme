import { memo } from "react";
import { Check, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/config/hooks";
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
    const periods: Array<{ key: PriceDisplayPeriod; label: string }> = [
      { key: "total", label: t("statsBar.priceTotal") },
      { key: "monthly", label: t("statsBar.priceMonthly") },
      { key: "daily", label: t("statsBar.priceDaily") },
    ];
    const currencies: Array<{
      key: PriceDisplayCurrency;
      label: string;
    }> = [
      { key: "USD", label: t("statsBar.currencyUsd") },
      { key: "CNY", label: t("statsBar.currencyCny") },
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
            {t("statsBar.currencyRate", { rate: USD_TO_CNY_RATE })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

PriceStatsMenu.displayName = "PriceStatsMenu";
