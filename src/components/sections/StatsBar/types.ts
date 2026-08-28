export type DisplayOptions = {
  currentTime: boolean;
  currentOnline: boolean;
  regionOverview: boolean;
  trafficOverview: boolean;
  trafficUsage: boolean;
  networkSpeed: boolean;
};

export type PriceBreakdownEntry = {
  total: number;
  monthly: number;
  daily: number;
};

export type StatsSnapshot = {
  onlineCount: number;
  totalCount: number;
  uniqueRegions: number;
  totalTrafficUp: number;
  totalTrafficDown: number;
  totalTrafficUsed: number;
  totalTrafficLimit: number;
  currentSpeedUp: number;
  currentSpeedDown: number;
  totalPriceUsd: number;
  monthlyPriceUsd: number;
  dailyPriceUsd: number;
  totalPriceCny: number;
  monthlyPriceCny: number;
  dailyPriceCny: number;
  priceByCurrency: Record<string, PriceBreakdownEntry>;
};

export type PriceDisplayPeriod = "total" | "monthly" | "daily";
export type PriceDisplayCurrency = "original" | "USD" | "CNY";

export type SortKey =
  | "trafficUp"
  | "trafficDown"
  | "speedUp"
  | "speedDown"
  | "dailyPrice"
  | "country"
  | null;

export interface StatsBarProps {
  displayOptions: DisplayOptions;
  setDisplayOptions: (options: Partial<DisplayOptions>) => void;
  stats: StatsSnapshot;
  loading: boolean;
  enableGroupedBar?: boolean;
  groups?: string[];
  selectedGroup?: string;
  onSelectGroup?: (group: string) => void;
  isShowStatsInHeader?: boolean;
  onSort?: (key: SortKey, direction: "asc" | "desc") => void;
  sortKey?: SortKey;
  sortDirection?: "asc" | "desc";
}
