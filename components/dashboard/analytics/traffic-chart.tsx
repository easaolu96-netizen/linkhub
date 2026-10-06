"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { DailyPoint } from "@/lib/analytics-data";

// Validated categorical slots 1–2 (CVD-safe on the white card surface) and
// recessive chrome. Text never wears the series colour.
const VIZ = {
  views: "#2a78d6",
  clicks: "#eb6834",
  surface: "#f6f4ef",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#6b6a65",
} as const;

const SERIES = [
  { key: "views", label: "Page views", color: VIZ.views },
  { key: "clicks", label: "Link clicks", color: VIZ.clicks },
] as const;

const dayFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const longDayFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const formatDay = (day: string, long = false) =>
  (long ? longDayFormatter : dayFormatter).format(new Date(`${day}T00:00:00Z`));

function LineKey({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />;
}

function ChartTooltip({ active, label, data }: { active?: boolean; label?: unknown; data: DailyPoint[] }) {
  const point = active ? data.find((d) => d.day === label) : undefined;
  if (!point) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 text-xs text-muted-foreground">{formatDay(point.day, true)}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center gap-2">
          <LineKey color={s.color} />
          <span className="font-semibold tabular-nums">{point[s.key].toLocaleString()}</span>
          <span className="text-muted-foreground">{s.label.toLowerCase()}</span>
        </p>
      ))}
    </div>
  );
}

export function TrafficChart({ data }: { data: DailyPoint[] }) {
  const [showTable, setShowTable] = useState(false);
  const peak = Math.max(1, ...data.flatMap((d) => [d.views, d.clicks]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex gap-4 text-sm" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-muted-foreground">
              <LineKey color={s.color} />
              {s.label}
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
          {showTable ? "Show chart" : "Show as table"}
        </Button>
      </div>

      {showTable ? (
        <div className="max-h-80 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <caption className="sr-only">Page views and link clicks per day (UTC)</caption>
            <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Date</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Page views</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Link clicks</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...data].reverse().map((d) => (
                <tr key={d.day} className="border-t">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">{formatDay(d.day, true)}</th>
                  <td className="px-3 py-1.5 text-right">{d.views.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right">{d.clicks.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72 w-full" role="img" aria-label="Line chart of daily page views and link clicks. Use “Show as table” for exact values.">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={VIZ.grid} strokeWidth={1} />
              <XAxis
                dataKey="day"
                tickFormatter={(day: string) => formatDay(day)}
                tick={{ fill: VIZ.muted, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: VIZ.axis }}
                minTickGap={24}
                interval="preserveStartEnd"
                tickMargin={8}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, peak < 5 ? 5 : "auto"]}
                tick={{ fill: VIZ.muted, fontSize: 12 }}
                tickFormatter={(v: number) => v.toLocaleString()}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ stroke: VIZ.axis, strokeWidth: 1 }}
                content={({ active, label }) => <ChartTooltip active={active} label={label} data={data} />}
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4.5, fill: s.color, stroke: VIZ.surface, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Days are in UTC.</p>
    </div>
  );
}
