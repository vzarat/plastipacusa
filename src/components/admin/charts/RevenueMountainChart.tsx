"use client";

import React, { useState, useMemo, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { formatCurrency } from "@/lib/utils";
import type { AdminOrder } from "@/actions/admin";
import {
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

type TimePeriod = "7D" | "1M" | "1Y" | "YTD";

interface ChartDataPoint {
  label: string;
  fullDate: string;
  revenue: number;
  pallets: number;
  truckloads: number;
  growth: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatGrowth(current: number, previous: number): string {
  if (previous <= 0) return "0%";
  const delta = ((current - previous) / previous) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

function periodRevenueDelta(orders: AdminOrder[], period: TimePeriod): number {
  const now = Date.now();
  let start = now - 365 * DAY_MS;
  if (period === "7D") start = now - 7 * DAY_MS;
  else if (period === "1M") start = now - 28 * DAY_MS;
  else if (period === "YTD") {
    const yearStart = new Date();
    yearStart.setMonth(0, 1);
    yearStart.setHours(0, 0, 0, 0);
    start = yearStart.getTime();
  }
  const span = now - start;
  const sumBetween = (from: number, to: number) =>
    orders.reduce((sum, order) => {
      if (!isRevenueOrder(order)) return sum;
      const created = new Date(order.createdAt || 0).getTime();
      if (created < from || created >= to) return sum;
      return sum + Number(order.totalUsd || 0);
    }, 0);
  const current = sumBetween(start, now);
  const previous = sumBetween(start - span, start);
  if (previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

function formatAxisMoney(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}

function orderPallets(order: AdminOrder): number {
  return (order.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );
}

function isRevenueOrder(order: AdminOrder): boolean {
  return order.paymentStatus === "paid";
}

function buildRevenueSeries(
  orders: AdminOrder[],
  period: TimePeriod
): ChartDataPoint[] {
  const now = new Date();
  const buckets: { start: Date; end: Date; label: string; fullDate: string }[] = [];

  if (period === "7D") {
    for (let i = 6; i >= 0; i -= 1) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString("en-US", { weekday: "short" }),
        fullDate: start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });
    }
  } else if (period === "1M") {
    for (let i = 3; i >= 0; i -= 1) {
      const end = new Date(now);
      end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - i * 7 + 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      buckets.push({
        start,
        end,
        label: `Wk ${4 - i}`,
        fullDate: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(end.getTime() - 1).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      });
    }
  } else {
    const months = period === "YTD" ? now.getMonth() + 1 : 12;
    for (let i = months - 1; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString("en-US", { month: "short" }),
        fullDate: start.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      });
    }
  }

  let previousRevenue = 0;
  return buckets.map((bucket) => {
    const inBucket = orders.filter((order) => {
      const created = new Date(order.createdAt || 0);
      return created >= bucket.start && created < bucket.end && isRevenueOrder(order);
    });
    const revenue = inBucket.reduce((sum, order) => sum + Number(order.totalUsd || 0), 0);
    const pallets = inBucket.reduce((sum, order) => sum + orderPallets(order), 0);
    const point: ChartDataPoint = {
      label: bucket.label,
      fullDate: bucket.fullDate,
      revenue,
      pallets,
      truckloads: 0,
      growth: formatGrowth(revenue, previousRevenue),
    };
    previousRevenue = revenue;
    return point;
  });
}

/**
 * Generates a smooth cubic Bezier curve SVG path string from points.
 */
function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

export function RevenueMountainChart({ orders = [] }: { orders?: AdminOrder[] }) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<TimePeriod>("1Y");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const data = useMemo(
    () => buildRevenueSeries(orders, period),
    [orders, period]
  );
  const periodGrowth = useMemo(
    () => periodRevenueDelta(orders, period),
    [orders, period]
  );

  // Overall totals for current period
  const totalPeriodRevenue = useMemo(
    () => data.reduce((sum, d) => sum + d.revenue, 0),
    [data]
  );
  const totalPeriodPallets = useMemo(
    () => data.reduce((sum, d) => sum + d.pallets, 0),
    [data]
  );
  const peakRevenue = useMemo(
    () => Math.max(1, ...data.map((d) => d.revenue), 0),
    [data]
  );

  // SVG Dimension Constants
  const width = 800;
  const height = 300;
  const paddingLeft = 55;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Scales
  const maxRev = peakRevenue * 1.15;
  const maxPallets = Math.max(1, ...data.map((d) => d.pallets), 0) * 1.25;

  const pointsRev = useMemo(() => {
    return data.map((d, i) => {
      const x =
        paddingLeft +
        (i / Math.max(1, data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.revenue / maxRev) * chartHeight;
      return { x, y, data: d };
    });
  }, [data, chartWidth, chartHeight, maxRev]);

  const pointsPallets = useMemo(() => {
    return data.map((d, i) => {
      const x =
        paddingLeft +
        (i / Math.max(1, data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.pallets / maxPallets) * chartHeight;
      return { x, y, data: d };
    });
  }, [data, chartWidth, chartHeight, maxPallets]);

  // Spline paths
  const revLinePath = useMemo(() => generateSmoothPath(pointsRev), [pointsRev]);
  const revAreaPath = useMemo(() => {
    if (pointsRev.length === 0) return "";
    const firstX = pointsRev[0].x;
    const lastX = pointsRev[pointsRev.length - 1].x;
    const bottomY = paddingTop + chartHeight;
    return `${revLinePath} L ${lastX.toFixed(2)} ${bottomY} L ${firstX.toFixed(2)} ${bottomY} Z`;
  }, [revLinePath, pointsRev, chartHeight]);

  const palletsLinePath = useMemo(
    () => generateSmoothPath(pointsPallets),
    [pointsPallets]
  );

  // Handle Mouse movement over SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    // Find closest index
    let closestIndex = 0;
    let minDistance = Infinity;

    pointsRev.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    });

    setHoveredIdx(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  const activePointRev = hoveredIdx !== null ? pointsRev[hoveredIdx] : null;
  const activePointPallets =
    hoveredIdx !== null ? pointsPallets[hoveredIdx] : null;

  // Y-axis tick marks
  const yTicks =
    totalPeriodRevenue <= 0
      ? [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
          value: maxRev * ratio,
          label: "$0",
        }))
      : [
          { value: maxRev, label: formatAxisMoney(maxRev) },
          { value: maxRev * 0.75, label: formatAxisMoney(maxRev * 0.75) },
          { value: maxRev * 0.5, label: formatAxisMoney(maxRev * 0.5) },
          { value: maxRev * 0.25, label: formatAxisMoney(maxRev * 0.25) },
          { value: 0, label: "$0" },
        ];

  return (
    <div className="bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-all rounded-2xl p-6 space-y-6 flex flex-col justify-between">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-800 border border-blue-200">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>{t("admin.bentoRevenueTitle")}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border ${
                periodGrowth > 0
                  ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                  : periodGrowth < 0
                    ? "text-rose-600 bg-rose-50 border-rose-100"
                    : "text-slate-500 bg-slate-50 border-slate-200"
              }`}
            >
              {periodGrowth > 0 ? <ArrowUpRight className="w-3 h-3" /> : null}
              <span>
                {periodGrowth === 0
                  ? "0%"
                  : `${periodGrowth > 0 ? "+" : ""}${periodGrowth.toFixed(1)}%`}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-1">
            {t("admin.bentoRevenueSubtitle")}
          </p>
        </div>

        {/* Time Period Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/70">
          {(["7D", "1M", "1Y", "YTD"] as TimePeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                period === p
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              {t(`admin.bentoTime${p}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Callouts & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t("admin.bentoRevenue")}
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalPeriodRevenue)}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t("admin.bentoPallets")}
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {(Number(totalPeriodPallets) || 0).toLocaleString("en-US")}{" "}
              <span className="text-xs font-semibold text-slate-400">Pallets</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 shadow-xs" />
            <span className="text-slate-700">{t("admin.bentoRevenue")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-xs" />
            <span className="text-slate-700">{t("admin.bentoPallets")}</span>
          </div>
        </div>
      </div>

      {/* SVG Mountain / Spline Area Chart */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[260px] sm:h-[300px] overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Mountain Translucent Gradient */}
            <linearGradient id="mountainAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#6366f1" stopOpacity="0.18" />
              <stop offset="90%" stopColor="#6366f1" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>

            {/* Pallet Volume Glow */}
            <linearGradient id="palletsGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + chartHeight - (tick.value / maxRev) * chartHeight;
            return (
              <g key={i} className="text-slate-400">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray={i === yTicks.length - 1 ? "none" : "4 4"}
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="600"
                  fill="#94a3b8"
                >
                  {tick.label}
                </text>
              </g>
            );
          })}

          {/* Mountain Fill Area */}
          <path d={revAreaPath} fill="url(#mountainAreaGradient)" />

          {/* Primary Spline Mountain Stroke (Revenue) */}
          <path
            d={revLinePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Secondary Spline Stroke (Pallets Shipped) */}
          <path
            d={palletsLinePath}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.2"
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Regular Data Points (Revenue) */}
          {pointsRev.map((p, i) => (
            <circle
              key={`rev-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? 6 : 3.5}
              fill={hoveredIdx === i ? "#1d4ed8" : "#ffffff"}
              stroke="#2563eb"
              strokeWidth={hoveredIdx === i ? 3 : 2}
              className="transition-all duration-150"
            />
          ))}

          {/* Regular Data Points (Pallets) */}
          {pointsPallets.map((p, i) => (
            <circle
              key={`pal-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? 5 : 2.5}
              fill={hoveredIdx === i ? "#0891b2" : "#ffffff"}
              stroke="#06b6d4"
              strokeWidth={hoveredIdx === i ? 2.5 : 1.5}
              className="transition-all duration-150"
            />
          ))}

          {/* X-Axis Tick Labels */}
          {pointsRev.map((p, i) => (
            <text
              key={`label-${i}`}
              x={p.x}
              y={height - 12}
              textAnchor="middle"
              fontSize="11"
              fontWeight={hoveredIdx === i ? "800" : "600"}
              fill={hoveredIdx === i ? "#0f172a" : "#64748b"}
              className="transition-colors"
            >
              {p.data.label}
            </text>
          ))}

          {/* Active Hover Crosshair Line */}
          {activePointRev && (
            <line
              x1={activePointRev.x}
              y1={paddingTop}
              x2={activePointRev.x}
              y2={paddingTop + chartHeight}
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Active Glow Ring for Hovered Point */}
          {activePointRev && (
            <circle
              cx={activePointRev.x}
              cy={activePointRev.y}
              r="8"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeOpacity="0.5"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* Dynamic Floating Tooltip */}
        {hoveredIdx !== null && activePointRev && (
          <div
            className="absolute pointer-events-none z-20 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-xl p-3 shadow-xl border border-slate-700 space-y-1.5 transition-all duration-75"
            style={{
              left: `${Math.min(
                Math.max(12, (activePointRev.x / width) * 100),
                80
              )}%`,
              top: `${Math.max(10, (activePointRev.y / height) * 100 - 30)}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-1 text-[11px] font-bold text-slate-300">
              <span>{activePointRev.data.fullDate}</span>
              <span className="text-emerald-400">{activePointRev.data.growth}</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>{t("admin.bentoRevenue")}:</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {formatCurrency(activePointRev.data.revenue)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>{t("admin.bentoPallets")}:</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {activePointRev.data.pallets} units
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

