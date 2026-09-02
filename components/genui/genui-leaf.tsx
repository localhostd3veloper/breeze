'use client';

import type { GenUiLeaf } from '@/lib/genui/schema';

import { GenUiCardWidget } from './genui-card';
import { GenUiChartWidget } from './genui-chart';
import { GenUiComparisonWidget } from './genui-comparison';
import { GenUiMetricsWidget } from './genui-metrics';
import { GenUiTableWidget } from './genui-table';

/**
 * Dispatch for everything that can appear inside a tab panel.
 *
 * The map is exhaustive over `GenUiLeaf['type']` and switched on a literal —
 * there is no lookup from a model-supplied string into a component registry, so
 * a spec cannot name a component that the compiler has not already approved.
 */
export function GenUiLeafWidget({ spec }: { spec: GenUiLeaf }) {
  switch (spec.type) {
    case 'chart':
      return <GenUiChartWidget spec={spec} />;
    case 'metrics':
      return <GenUiMetricsWidget spec={spec} />;
    case 'card':
      return <GenUiCardWidget spec={spec} />;
    case 'table':
      return <GenUiTableWidget spec={spec} />;
    case 'comparison':
      return <GenUiComparisonWidget spec={spec} />;
    default: {
      // Exhaustiveness guard: adding a leaf type without a renderer fails the build.
      const _never: never = spec;
      return _never;
    }
  }
}
