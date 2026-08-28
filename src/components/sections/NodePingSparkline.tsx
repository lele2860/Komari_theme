import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePingChart } from "@/hooks/usePingChart";
import type { NodeData } from "@/types/node";
import { generateColor, lableFormatter } from "@/utils/chartHelper";
import { useLocale } from "@/config/hooks";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { calculateTaskStats, interpolateNullsLinear } from "@/utils/RecordHelper";

interface NodePingSparklineProps {
  node: NodeData;
  hours?: number;
  height?: number;
}

interface HoverState {
  clientX: number;
  clientY: number;
  index: number;
}

export const NodePingSparkline = ({
  node,
  hours = 0.5, // 缩小时间跨度，折线更平滑清晰
  height = 32,
}: NodePingSparklineProps) => {
  const { pingHistory, loading } = usePingChart(node, hours);
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const { chartData, tasks, taskStats } = useMemo(() => {
    const tasks = pingHistory?.tasks || [];
    const records = pingHistory?.records || [];
    if (!tasks.length || !records.length) {
      return { chartData: [] as any[], tasks, taskStats: [] as any[] };
    }

    // 计算时间容差，把相近时间点的多个任务数据归并到同一行（否则经常只有一个任务有数据）
    const taskIntervals = tasks
      .map((t) => t.interval)
      .filter((v): v is number => typeof v === "number" && v > 0);
    const fallbackIntervalSec = taskIntervals.length
      ? Math.min(...taskIntervals)
      : 60;
    const toleranceMs = Math.min(
      6000,
      Math.max(800, Math.floor(fallbackIntervalSec * 1000 * 0.25))
    );

    const grouped: Record<number, any> = {};
    const anchors: number[] = [];
    for (const rec of records) {
      const ts = new Date(rec.time).getTime();
      let anchor: number | null = null;
      for (const a of anchors) {
        if (Math.abs(a - ts) <= toleranceMs) {
          anchor = a;
          break;
        }
      }
      const use = anchor ?? ts;
      if (!grouped[use]) {
        grouped[use] = { time: use };
        if (anchor === null) anchors.push(use);
      }
      grouped[use][rec.task_id] = rec.value < 0 ? null : rec.value;
    }

    let merged = Object.values(grouped).sort(
      (a: any, b: any) => a.time - b.time
    );

    // 对断续的空缺做线性插值，让折线更连续、不那么毛刺
    const keys = tasks.map((t) => String(t.id));
    merged = interpolateNullsLinear(merged as any[], keys, {
      maxGapMultiplier: 6,
      minCapMs: 2 * 60_000,
      maxCapMs: 30 * 60_000,
    });

    const taskStats = tasks.map((task) => {
      const stats = calculateTaskStats(records, task.id, null);
      return {
        id: task.id,
        name: task.name,
        value: stats.latestValue,
        loss: stats.loss,
      };
    });

    return { chartData: merged, tasks, taskStats };
  }, [pingHistory]);

  // The tooltip is rendered into document.body. When an SVG child misses its
  // mouseleave event, clear the hover state from document-level events too.
  useEffect(() => {
    if (!hover) return;

    const clearHover = () => setHover(null);
    const clearWhenPointerLeavesChart = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        clearHover();
      }
    };

    document.addEventListener("pointermove", clearWhenPointerLeavesChart, true);
    document.addEventListener("scroll", clearHover, true);
    window.addEventListener("blur", clearHover);
    window.addEventListener("resize", clearHover);

    return () => {
      document.removeEventListener(
        "pointermove",
        clearWhenPointerLeavesChart,
        true
      );
      document.removeEventListener("scroll", clearHover, true);
      window.removeEventListener("blur", clearHover);
      window.removeEventListener("resize", clearHover);
    };
  }, [hover]);

  if (loading || !tasks.length) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || chartData.length < 2) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const index = Math.round(ratio * (chartData.length - 1));
    setHover({ clientX: e.clientX, clientY: e.clientY, index });
  };

  const handleMouseLeave = () => setHover(null);

  const hoveredPoint = hover ? chartData[hover.index] : null;

  return (
    <div className="flex flex-col gap-1 text-xs">
      {/* 每个监测任务的小色块，居中显示，带任务名 */}
      <div className="flex flex-wrap justify-center gap-1">
        {taskStats.map((task: any) => (
          <div
            key={task.id}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border max-w-full"
            style={{ borderColor: generateColor(task.name, tasks) }}>
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: generateColor(task.name, tasks) }}
            />
            <span className="truncate">
              {task.name}
              {task.value !== null
                ? `: ${task.value.toFixed(0)}ms | ${task.loss.toFixed(0)}%`
                : `: ${t("node.notAvailable")}`}
            </span>
          </div>
        ))}
      </div>

      {/* 迷你折线图 */}
      <div
        ref={containerRef}
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                <XAxis
                     dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]} hide />
                <YAxis domain={["auto", "auto"]} hide />
              {hoveredPoint && (
                <ReferenceLine
                  x={hoveredPoint.time}
                  stroke="var(--theme-line-muted-color)"
                  strokeWidth={1}
                />
              )}
              {tasks.map((task) => (
                <Line
                  key={task.id}
                  type="monotone"
                  dataKey={String(task.id)}
                  stroke={generateColor(task.name, tasks)}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            {hoveredPoint &&
                tasks.map((task) => {
                  const val = hoveredPoint[String(task.id)];
                  if (val === null || val === undefined) return null;
                  return (
                    <ReferenceDot
                      key={`dot-${task.id}`}
                      x={hoveredPoint.time}
                      y={val}
                      r={4}
                      fill={generateColor(task.name, tasks)}
                      stroke="var(--color-background, #fff)"
                      strokeWidth={2}
                      isFront
                    />
                  );
                })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center h-full text-secondary-foreground">
            {t("node.notAvailable")}
          </div>
        )}
      </div>

      {/* 悬浮提示框，竖排列表，通过 Portal 挂载到 body，脱离卡片毛玻璃层级限制 */}
      {hoveredPoint &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: hover!.clientX + 12,
              top: hover!.clientY - 12,
              zIndex: 9999,
              pointerEvents: "none",
            }}
            className="flex flex-col gap-0.5 px-2 py-1.5 rounded purcarte-blur theme-card-style text-xs whitespace-nowrap">
            <span className="text-secondary-foreground">
              {lableFormatter(hoveredPoint.time, hours)}
            </span>
            {tasks.map((task) => {
              const val = hoveredPoint[String(task.id)];
              return (
                <span key={task.id} className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: generateColor(task.name, tasks) }}
                  />
                  <span className="flex-1">{task.name}</span>
                  <span className="font-medium">
                    {val !== null && val !== undefined ? `${Number(val).toFixed(0)}ms` : "-"}
                  </span>
                </span>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};
