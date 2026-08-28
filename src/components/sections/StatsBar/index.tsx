import { useEffect, useMemo, useState } from "react";
import { cn, formatBytes, formatMoney } from "@/utils";
import { useAppConfig } from "@/config";
import { useIsMobile } from "@/hooks/useMobile";
import { CurrentTimeChip, StatChip } from "./StatChips";
import { GroupSelector } from "./GroupSelector";
import { SortToggleMenu } from "./SortToggleMenu";
import { StatsToggleMenu } from "./StatsToggleMenu";
import { useLocale } from "@/config/hooks";
import type { StatsBarProps, SortKey } from "./types";
import { Card } from "@/components/ui/card";
import { PriceStatsMenu } from "./PriceStatsMenu";
import type {
  PriceDisplayCurrency,
  PriceDisplayPeriod,
} from "./types";
export type { StatsBarProps, SortKey };

const PRICE_SETTINGS_STORAGE_KEY = "purcarte-price-display";

const isPriceDisplayPeriod = (
  value: unknown
): value is PriceDisplayPeriod =>
  value === "total" || value === "monthly" || value === "daily";

const isPriceDisplayCurrency = (
  value: unknown
): value is PriceDisplayCurrency => value === "USD" || value === "CNY";

const readStoredPriceSettings = (enabled: boolean) => {
  if (!enabled || typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(PRICE_SETTINGS_STORAGE_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return null;

    const settings = parsed as {
      period?: unknown;
      currency?: unknown;
    };

    return {
      period: isPriceDisplayPeriod(settings.period)
        ? settings.period
        : undefined,
      currency: isPriceDisplayCurrency(settings.currency)
        ? settings.currency
        : undefined,
    };
  } catch {
    return null;
  }
};

interface StatEntry {
  key: string;
  label: string;
  lines: string[];
  isLabelVertical?: boolean;
  textLeft?: boolean;
}

export const StatsBar = (props: StatsBarProps) => {
  const {
    displayOptions,
    setDisplayOptions,
    stats,
    loading,
    groups,
    selectedGroup,
    onSelectGroup,
    onSort: onSortProp,
    sortKey: sortKeyProp,
    sortDirection: sortDirectionProp,
  } = props;

  const {
    isShowStatsInHeader,
    mergeGroupsWithStats,
    enableGroupedBar,
    enableSortControl,
    siteStatus,
    enableLocalStorage,
  } = useAppConfig();
  const isMobile = useIsMobile();
  const { t } = useLocale();
  const storedPriceSettings = readStoredPriceSettings(enableLocalStorage);
  const [pricePeriod, setPricePeriod] =
    useState<PriceDisplayPeriod>(
      () => storedPriceSettings?.period ?? "monthly"
    );
  const [priceCurrency, setPriceCurrency] =
    useState<PriceDisplayCurrency>(
      () => storedPriceSettings?.currency ?? "USD"
    );

  useEffect(() => {
    if (!enableLocalStorage) return;

    try {
      window.localStorage.setItem(
        PRICE_SETTINGS_STORAGE_KEY,
        JSON.stringify({ period: pricePeriod, currency: priceCurrency })
      );
    } catch {
      // Ignore unavailable local storage.
    }
  }, [enableLocalStorage, priceCurrency, pricePeriod]);

  const canViewPricing =
    siteStatus === "authenticated" || siteStatus === "private-authenticated";

  const [sortState, setSortState] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({
    key: sortKeyProp ?? null,
    direction: sortDirectionProp ?? "desc",
  });

  useEffect(() => {
    setSortState({
      key: sortKeyProp ?? null,
      direction: sortDirectionProp ?? "desc",
    });
  }, [sortKeyProp, sortDirectionProp]);

  const { key: sortKey, direction: sortDirection } = sortState;

  const handleSort = (key: SortKey) => {
    let newDirection: "asc" | "desc" = "desc";
    if (key !== null && key === sortKey) {
      newDirection = sortDirection === "desc" ? "asc" : "desc";
    }
    setSortState({ key, direction: newDirection });
    if (onSortProp) {
      onSortProp(key, newDirection);
    }
  };

  const resolvedStats = useMemo<StatEntry[]>(() => {
    const getLabel = (compactLabel: string, fullLabel: string) =>
      isShowStatsInHeader ? (isMobile ? fullLabel : compactLabel) : fullLabel;

    const entries: StatEntry[] = [];
    if (displayOptions.currentOnline) {
      entries.push({
        key: "currentOnline",
        label: getLabel(
          t("statsBar.currentOnline"),
          t("statsBar.currentOnline")
        ),
        lines: [loading ? "..." : `${stats.onlineCount} / ${stats.totalCount}`],
      });
    }
    if (displayOptions.regionOverview) {
      entries.push({
        key: "regionOverview",
        label: getLabel(t("statsBar.region"), t("statsBar.region")),
        lines: [loading ? "..." : String(stats.uniqueRegions)],
      });
    }
    if (displayOptions.trafficOverview) {
      entries.push({
        key: "trafficOverview",
        label: getLabel(t("statsBar.trafficShort"), t("statsBar.traffic")),
        lines: loading
          ? ["..."]
          : [
              `${t("node.uploadPrefix")} ${formatBytes(stats.totalTrafficUp)}`,
              `${t("node.downloadPrefix")} ${formatBytes(
                stats.totalTrafficDown
              )}`,
            ],
        isLabelVertical: !isMobile && isShowStatsInHeader,
        textLeft: true,
      });
    }
    if (displayOptions.trafficUsage) {
      entries.push({
        key: "trafficUsage",
        label: getLabel(t("statsBar.trafficUsage"), t("statsBar.trafficUsage")),
        lines: loading
          ? ["..."]
          : [
              `${t("statsBar.trafficUsed")} ${formatBytes(stats.totalTrafficUsed)}`,
              `${t("statsBar.trafficTotal")} ${formatBytes(stats.totalTrafficLimit)}`,
            ],
        isLabelVertical: !isMobile && isShowStatsInHeader,
        textLeft: true,
      });
    }
    if (displayOptions.networkSpeed) {
      entries.push({
        key: "networkSpeed",
        label: getLabel(
          t("statsBar.networkSpeedShort"),
          t("statsBar.networkSpeed")
        ),
        lines: loading
          ? ["..."]
          : [
              `${t("node.uploadPrefix")} ${formatBytes(
                stats.currentSpeedUp
              )}/s`,
              `${t("node.downloadPrefix")} ${formatBytes(
                stats.currentSpeedDown
              )}/s`,
            ],
        isLabelVertical: !isMobile && isShowStatsInHeader,
        textLeft: true,
      });
    }
    return entries;
  }, [displayOptions, loading, stats, isMobile, isShowStatsInHeader, t]);

  const priceStat = useMemo<StatEntry | null>(() => {
    if (!canViewPricing) return null;

    const amountByPeriod: Record<PriceDisplayPeriod, number> = {
      total:
        priceCurrency === "USD" ? stats.totalPriceUsd : stats.totalPriceCny,
      monthly:
        priceCurrency === "USD"
          ? stats.monthlyPriceUsd
          : stats.monthlyPriceCny,
      daily:
        priceCurrency === "USD" ? stats.dailyPriceUsd : stats.dailyPriceCny,
    };
    const periodLabel =
      pricePeriod === "total"
        ? t("statsBar.priceTotal")
        : pricePeriod === "monthly"
        ? t("statsBar.priceMonthly")
        : t("statsBar.priceDaily");

    return {
      key: "serverCost",
      label: t("statsBar.serverCost"),
      lines: loading
        ? ["..."]
        : [`${periodLabel} ${formatMoney(amountByPeriod[pricePeriod], priceCurrency)}`],
      isLabelVertical: !isMobile && isShowStatsInHeader,
      textLeft: true,
    };
  }, [
    canViewPricing,
    isMobile,
    isShowStatsInHeader,
    loading,
    priceCurrency,
    pricePeriod,
    stats,
    t,
  ]);

  const renderPriceStat = (isInHeader: boolean) =>
    priceStat ? (
      <div className="flex min-w-0 items-center justify-center">
        <StatChip
          {...priceStat}
          isInHeader={isInHeader}
          isMobile={isMobile}
        />
        <PriceStatsMenu
          period={pricePeriod}
          currency={priceCurrency}
          onPeriodChange={setPricePeriod}
          onCurrencyChange={setPriceCurrency}
        />
      </div>
    ) : null;

  const hasVisibleStats =
    Object.values(displayOptions).some(Boolean) || Boolean(priceStat);

  if (isShowStatsInHeader && !isMobile) {
    return (
      <div className="flex items-center gap-2">
        {enableGroupedBar && mergeGroupsWithStats && (
          <GroupSelector
            groups={groups}
            selectedGroup={selectedGroup}
            onSelectGroup={onSelectGroup}
          />
        )}
        <div className="flex items-center gap-1.5">
          {displayOptions.currentTime && (
            <CurrentTimeChip isInHeader={true} isMobile={isMobile} />
          )}
          {resolvedStats.map(({ key, ...rest }) => (
            <StatChip
              key={key}
              {...rest}
              isInHeader={true}
              isMobile={isMobile}
            />
          ))}
          {renderPriceStat(true)}
          <StatsToggleMenu
            displayOptions={displayOptions}
            setDisplayOptions={setDisplayOptions}
          />
          {enableSortControl && (
            <SortToggleMenu
              onSort={handleSort}
              sortKey={sortKey}
              sortDirection={sortDirection}
            />
          )}
        </div>
      </div>
    );
  }

  const getGridTemplateColumns = () => {
    if (!isMobile) {
      return "repeat(auto-fit, minmax(100px, 1fr))";
    }
    const visibleCount =
      resolvedStats.length +
      (displayOptions.currentTime ? 1 : 0) +
      (priceStat ? 1 : 0) +
      (enableGroupedBar && mergeGroupsWithStats ? 1 : 0);

    return visibleCount >= 5 ? "repeat(3, 1fr)" : "repeat(2, 1fr)";
  };

  return (
    <Card
      className={cn(
        "relative flex items-center text-primary my-4",
        isMobile ? "text-xs p-2" : "text-sm px-4 min-w-[300px] min-h-[5rem]"
      )}>
      <div
        className="grid w-full gap-2 text-center items-center py-3"
        style={{
          gridTemplateColumns: getGridTemplateColumns(),
          gridAutoRows: "min-content",
        }}>
        {enableGroupedBar && mergeGroupsWithStats && (
          <div className="flex flex-col items-center">
            <GroupSelector
              groups={groups}
              selectedGroup={selectedGroup}
              onSelectGroup={onSelectGroup}
            />
          </div>
        )}

        {hasVisibleStats ? (
          <>
            {displayOptions.currentTime && (
              <CurrentTimeChip isMobile={isMobile} />
            )}
            {resolvedStats.map(({ key, ...rest }) => (
              <StatChip key={key} {...rest} isMobile={isMobile} />
            ))}
            {renderPriceStat(false)}
          </>
        ) : (
          <span className="text-xs text-secondary-foreground">
            {t("statsBar.statsHidden")}
          </span>
        )}
      </div>
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <StatsToggleMenu
          displayOptions={displayOptions}
          setDisplayOptions={setDisplayOptions}
        />
        {enableSortControl && (
          <SortToggleMenu
            onSort={handleSort}
            sortKey={sortKey}
            sortDirection={sortDirection}
          />
        )}
      </div>
    </Card>
  );
};
