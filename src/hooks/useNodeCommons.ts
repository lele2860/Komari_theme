import { useMemo, useState } from "react";
import {
  convertPriceToCny,
  formatPriceForDisplay,
  getDailyPriceCny,
  USD_TO_CNY_RATE,
} from "@/utils";
import type { NodeData } from "@/types/node";
import type { RpcNodeStatus } from "@/types/rpc";
import { useNodeData } from "@/contexts/NodeDataContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import type { NodeDataContextType } from "@/contexts/NodeDataContext";
import type { LiveDataContextType } from "@/contexts/LiveDataContext";
import { useLocale, useAppConfig } from "@/config/hooks";
import { useTheme } from "@/hooks/useTheme";

type SortKey =
  | "trafficUp"
  | "trafficDown"
  | "speedUp"
  | "speedDown"
  | "dailyPrice"
  | "country"
  | null;
type SortOrder = "asc" | "desc";

export const useNodeListCommons = (searchTerm: string) => {
  const {
    nodes: staticNodes,
    loading,
    getGroups,
  } = useNodeData() as NodeDataContextType;
  const { liveData } = useLiveData() as LiveDataContextType;
  const { t } = useLocale();
  const { isOfflineNodesBehind, defaultSelectedGroup } = useAppConfig();
  const { currencyRates } = useTheme();
  const [selectedGroup, setSelectedGroup] = useState(
    defaultSelectedGroup || t("group.all")
  );
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (key: SortKey, direction?: SortOrder) => {
    setSortKey(key);
    setSortOrder(
      direction ?? (sortKey === key && sortOrder === "desc" ? "asc" : "desc")
    );
  };

  const combinedNodes = useMemo(() => {
    if (!staticNodes) return [];
    return staticNodes.map((node: NodeData) => {
      const stats = liveData ? liveData[node.uuid] : undefined;
      return {
        ...node,
        stats: stats,
      };
    });
  }, [staticNodes, liveData]);

  const groups = useMemo(
    () => [t("group.all"), ...getGroups()],
    [getGroups, t]
  );

  const filteredNodes = useMemo(() => {
    let nodes = combinedNodes
      .filter(
        (node: NodeData & { stats?: any }) =>
          selectedGroup === t("group.all") || node.group === selectedGroup
      )
      .filter((node: NodeData) =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (isOfflineNodesBehind || sortKey) {
      nodes.sort((a, b) => {
        const compareCountry = () => {
          const aRegion = (a.region || "").trim().toUpperCase() || "ZZ";
          const bRegion = (b.region || "").trim().toUpperCase() || "ZZ";
          return aRegion.localeCompare(bRegion) * (sortOrder === "asc" ? 1 : -1);
        };

        if (sortKey === "country") {
          const countryDifference = compareCountry();
          if (countryDifference !== 0) return countryDifference;
        }

        if (isOfflineNodesBehind) {
          const aOnline = a.stats?.online || false;
          const bOnline = b.stats?.online || false;
          if (aOnline !== bOnline) {
            return aOnline ? -1 : 1;
          }
        }

        if (sortKey === "dailyPrice") {
          const aValue = getDailyPriceCny(
            a.price,
            a.currency,
            a.billing_cycle,
            currencyRates
          );
          const bValue = getDailyPriceCny(
            b.price,
            b.currency,
            b.billing_cycle,
            currencyRates
          );

          // Keep nodes without a comparable price at the end in either
          // direction so the sort remains useful for mixed node metadata.
          if (aValue === null || bValue === null) {
            if (aValue === null && bValue === null) return 0;
            return aValue === null ? 1 : -1;
          }

          return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        }

        if (sortKey && sortKey !== "country") {
          const sortMap: Record<
            Exclude<SortKey, "country" | "dailyPrice" | null>,
            keyof RpcNodeStatus
          > = {
            trafficUp: "net_total_up",
            trafficDown: "net_total_down",
            speedUp: "net_out",
            speedDown: "net_in",
          };
          const statsKey = sortMap[sortKey];

          const aValue = Number(a.stats?.[statsKey] || 0);
          const bValue = Number(b.stats?.[statsKey] || 0);

          if (sortOrder === "asc") {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        }

        return sortKey === "country" ? a.name.localeCompare(b.name) : 0;
      });
    }

    return nodes;
  }, [
    combinedNodes,
    selectedGroup,
    searchTerm,
    sortKey,
    sortOrder,
    t,
    isOfflineNodesBehind,
    currencyRates,
  ]);

  const stats = useMemo(() => {
    const getTrafficUsed = (node: (typeof combinedNodes)[number]) => {
      const up = Number(node.stats?.net_total_up || 0);
      const down = Number(node.stats?.net_total_down || 0);

      switch (node.traffic_limit_type) {
        case "up":
          return up;
        case "down":
          return down;
        case "min":
          return Math.min(up, down);
        case "sum":
          return up + down;
        default:
          return Math.max(up, down);
      }
    };

    const priceTotals = combinedNodes.reduce(
      (totals, node) => {
        const price = Number(node.price);
        const priceCny =
          price > 0
            ? convertPriceToCny(price, node.currency, currencyRates)
            : null;
        if (priceCny === null) return totals;

        totals.totalCny += priceCny;
        if (node.billing_cycle > 0) {
          totals.dailyCny += priceCny / node.billing_cycle;
          totals.monthlyCny += (priceCny * 30) / node.billing_cycle;
        }
        return totals;
      },
      { totalCny: 0, monthlyCny: 0, dailyCny: 0 }
    );
    const usdRate = currencyRates.USD || USD_TO_CNY_RATE;

    return {
      onlineCount: filteredNodes.filter((n) => n.stats?.online).length,
      totalCount: filteredNodes.length,
      uniqueRegions: new Set(filteredNodes.map((n) => n.region)).size,
      totalTrafficUp: filteredNodes.reduce(
        (acc, node) => acc + (node.stats?.net_total_up || 0),
        0
      ),
      totalTrafficDown: filteredNodes.reduce(
        (acc, node) => acc + (node.stats?.net_total_down || 0),
        0
      ),
      totalTrafficUsed: combinedNodes.reduce(
        (acc, node) => acc + getTrafficUsed(node),
        0
      ),
      totalTrafficLimit: combinedNodes.reduce(
        (acc, node) => acc + Number(node.traffic_limit || 0),
        0
      ),
      currentSpeedUp: filteredNodes.reduce(
        (acc, node) => acc + (node.stats?.net_out || 0),
        0
      ),
      currentSpeedDown: filteredNodes.reduce(
        (acc, node) => acc + (node.stats?.net_in || 0),
        0
      ),
      totalPriceCny: priceTotals.totalCny,
      monthlyPriceCny: priceTotals.monthlyCny,
      dailyPriceCny: priceTotals.dailyCny,
      totalPriceUsd: priceTotals.totalCny / usdRate,
      monthlyPriceUsd: priceTotals.monthlyCny / usdRate,
      dailyPriceUsd: priceTotals.dailyCny / usdRate,
    };
  }, [combinedNodes, filteredNodes, currencyRates]);

  return {
    loading,
    groups,
    filteredNodes,
    stats,
    selectedGroup,
    setSelectedGroup,
    handleSort,
    sortKey,
    sortOrder,
  };
};

export const useNodeCommons = (node: NodeData & { stats?: any }) => {
  const { stats } = node;
  const { t } = useLocale();
  const isOnline = stats ? stats.online : false;
  const { siteStatus, priceTagRequiresLogin } = useAppConfig();
  const {
    currencyRates,
    priceDisplayCurrency,
    priceDisplayPeriod,
    priceNodeFollowCurrency,
    priceNormalizationEnabled,
  } = useTheme();
  const normalization =
    priceNormalizationEnabled && priceDisplayPeriod !== "total"
      ? priceDisplayPeriod
      : "original";
  const canViewPriceTag =
    !priceTagRequiresLogin ||
    siteStatus === "authenticated" ||
    siteStatus === "private-authenticated";
  const price = canViewPriceTag
    ? formatPriceForDisplay(
        node.price,
        node.currency,
        node.billing_cycle,
        normalization,
        priceNodeFollowCurrency ? priceDisplayCurrency : "original",
        currencyRates
      )
    : "";

  const cpuUsage = stats && isOnline ? stats.cpu : 0;
  const memUsage =
    stats && isOnline && node.mem_total > 0
      ? (stats.ram / node.mem_total) * 100
      : 0;
  const swapUsage =
    stats && isOnline && node.swap_total > 0
      ? (stats.swap / node.swap_total) * 100
      : 0;
  const diskUsage =
    stats && isOnline && node.disk_total > 0
      ? (stats.disk / node.disk_total) * 100
      : 0;

  const load =
    stats && isOnline
      ? `${stats.load.toFixed(2)} | ${stats.load5.toFixed(
          2
        )} | ${stats.load15.toFixed(2)}`
      : t("node.notAvailable");

  const daysLeft =
    node.expired_at && new Date(node.expired_at).getTime() > 0
      ? Math.ceil(
          (new Date(node.expired_at).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  let daysLeftTag = null;
  if (daysLeft !== null) {
    const daysLeftText = t("node.daysLeft", { daysLeft: daysLeft });
    if (daysLeft < 0) {
      daysLeftTag = `${t("node.expired")}<red>`;
    } else if (daysLeft <= 7) {
      daysLeftTag = `${daysLeftText}<red>`;
    } else if (daysLeft <= 15) {
      daysLeftTag = `${daysLeftText}<orange>`;
    } else if (daysLeft < 36500) {
      daysLeftTag = `${daysLeftText}<green>`;
    } else {
      daysLeftTag = `${t("node.longTerm")}<green>`;
    }
  }

  const expired_at =
    daysLeft !== null && daysLeft > 36500
      ? t("node.longTerm")
      : node.expired_at && new Date(node.expired_at).getTime() > 0
      ? new Date(node.expired_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : t("node.notSet");

  const groupTag = node.group ? `${node.group}<violet>` : null;
  const tagList = [
    ...(price ? [price] : []),
    ...(daysLeftTag ? [daysLeftTag] : []),
    ...(groupTag ? [groupTag] : []),
    ...(typeof node.tags === "string"
      ? node.tags
          .split(";")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []),
  ];

  // 计算流量使用百分比
  const trafficPercentage = useMemo(() => {
    if (!node.traffic_limit || !stats || !isOnline) return 0;

    // 根据流量限制类型确定使用的流量值
    let usedTraffic = 0;
    switch (node.traffic_limit_type) {
      case "up":
        usedTraffic = stats.net_total_up;
        break;
      case "down":
        usedTraffic = stats.net_total_down;
        break;
      case "sum":
        usedTraffic = stats.net_total_up + stats.net_total_down;
        break;
      case "min":
        usedTraffic = Math.min(stats.net_total_up, stats.net_total_down);
        break;
      default: // max 或者未设置
        usedTraffic = Math.max(stats.net_total_up, stats.net_total_down);
        break;
    }

    return (usedTraffic / node.traffic_limit) * 100;
  }, [node.traffic_limit, node.traffic_limit_type, stats, isOnline]);

  return {
    stats,
    isOnline,
    tagList,
    cpuUsage,
    memUsage,
    swapUsage,
    diskUsage,
    load,
    expired_at,
    trafficPercentage,
  };
};
