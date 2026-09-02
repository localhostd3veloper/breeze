'use client';

import { useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { foldSeries, seriesColor } from '@/lib/genui/palette';
import type { GenUiChart } from '@/lib/genui/schema';

import { GenUiFrame } from './genui-frame';

/**
 * Recharts renders SVG text with its own defaults, so every label is pinned to a
 * text token here. Series colour never touches text -- it lives on the mark and
 * on the legend swatch only.
 */
const AXIS_TICK = {
  fill: 'var(--readout)',
  fontSize: 11,
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
};

const GRID_STROKE = 'var(--hairline)';

/** Series keys are positional (`s0`, `s1`…) so a series named "name" or "value"
 *  cannot collide with the category key. Display names are carried separately. */
type Row = Record<string, string | number>;

function useChartModel(spec: GenUiChart) {
  return useMemo(() => {
    if (spec.data?.length) {
      return {
        rows: spec.data.map((d) => ({ name: d.name, s0: d.value })) as Row[],
        names: [''],
        single: true,
      };
    }

    const x = spec.x ?? [];
    const series = foldSeries(spec.series ?? []);

    return {
      rows: x.map((label, i) => {
        const row: Row = { name: label };
        series.forEach((s, j) => {
          row[`s${j}`] = s.data[i] ?? 0;
        });
        return row;
      }),
      names: series.map((s) => s.name),
      single: series.length <= 1,
    };
  }, [spec]);
}

function ChartTooltip({ unit }: { unit?: string }) {
  return (
    <Tooltip
      cursor={{ fill: 'var(--accent)', fillOpacity: 0.4, stroke: 'none' }}
      contentStyle={{
        background: 'var(--popover)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        fontSize: 12,
        color: 'var(--popover-foreground)',
        boxShadow: '0 2px 10px rgb(0 0 0 / 0.08)',
      }}
      labelStyle={{ color: 'var(--foreground)', fontWeight: 500, marginBottom: 2 }}
      itemStyle={{ color: 'var(--muted-foreground)' }}
      // Params are left uninferred: Recharts types value/name as possibly
      // undefined, and narrowing them here fights the library rather than the data.
      formatter={(value, name) => [`${value ?? ''}${unit ? ` ${unit}` : ''}`, String(name ?? '')]}
    />
  );
}

function ChartLegend() {
  return (
    <Legend
      verticalAlign="bottom"
      height={26}
      iconType="circle"
      iconSize={8}
      wrapperStyle={{
        fontSize: 11,
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        color: 'var(--readout)',
      }}
    />
  );
}

export function GenUiChartWidget({ spec }: { spec: GenUiChart }) {
  const { rows, names, single } = useChartModel(spec);
  const keys = names.map((_, i) => `s${i}`);
  // Recharts animates independently of `motion`, so reduced-motion has to be
  // threaded into it explicitly or the entrance sweep runs regardless.
  const animate = !useReducedMotion();

  // A legend is mandatory at >= 2 series so identity is never colour-alone.
  // A single series is named by the title instead, so it gets no legend box.
  const showLegend = !single;

  /**
   * Relief rule: slots 2 (brass) and 6 (moss) fall below 3:1 on the light
   * surface, so a faint mark must be backed by a readable number. Bars carry
   * value labels while the category count stays low enough not to collide.
   * This is not decoration -- see tasks/chart-design.md.
   */
  const directLabelBars = single && rows.length <= 8;

  const body = (() => {
    if (spec.variant === 'pie') {
      return (
        <PieChart>
          <ChartTooltip unit={spec.unit} />
          <Pie
            data={rows}
            dataKey="s0"
            nameKey="name"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={2}
            // 2px surface gap between adjacent fills.
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={animate}
            animationDuration={420}
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={seriesColor(i)} />
            ))}
          </Pie>
          <ChartLegend />
        </PieChart>
      );
    }

    if (spec.variant === 'line' || spec.variant === 'area') {
      const Chart = spec.variant === 'line' ? LineChart : AreaChart;
      return (
        <Chart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="name"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
          <ChartTooltip unit={spec.unit} />
          {showLegend && <ChartLegend />}
          {keys.map((key, i) =>
            spec.variant === 'line' ? (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={names[i] || spec.title || 'Value'}
                stroke={seriesColor(i)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                isAnimationActive={animate}
                animationDuration={420}
              />
            ) : (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={names[i] || spec.title || 'Value'}
                stroke={seriesColor(i)}
                strokeWidth={2}
                fill={seriesColor(i)}
                fillOpacity={0.14}
                stackId={spec.stacked ? 'a' : undefined}
                isAnimationActive={animate}
                animationDuration={420}
              />
            )
          )}
        </Chart>
      );
    }

    return (
      <BarChart data={rows} margin={{ top: 14, right: 12, bottom: 0, left: 0 }} barGap={2}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey="name"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
        />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
        <ChartTooltip unit={spec.unit} />
        {showLegend && <ChartLegend />}
        {keys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            name={names[i] || spec.title || 'Value'}
            fill={seriesColor(i)}
            stackId={spec.stacked ? 'a' : undefined}
            // Round the data-end only; the base stays anchored to the baseline.
            radius={spec.stacked ? 0 : [4, 4, 0, 0]}
            // 2px surface gap between stacked segments.
            stroke={spec.stacked ? 'var(--card)' : undefined}
            strokeWidth={spec.stacked ? 2 : 0}
            isAnimationActive={animate}
            animationDuration={420}
          >
            {directLabelBars && (
              <LabelList
                dataKey={key}
                position="top"
                offset={6}
                fill="var(--readout)"
                fontSize={11}
                fontFamily="var(--font-mono), ui-monospace, monospace"
                formatter={(v) => `${v ?? ''}${spec.unit ?? ''}`}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    );
  })();

  return (
    <GenUiFrame
      eyebrow={spec.unit ? `FIGURE · ${spec.unit}` : 'FIGURE'}
      title={spec.title}
      subtitle={spec.subtitle}
    >
      <div className="px-2 pt-3 pb-2">
        <ResponsiveContainer width="100%" height={rows.length > 12 ? 280 : 240}>
          {body}
        </ResponsiveContainer>
      </div>
    </GenUiFrame>
  );
}
