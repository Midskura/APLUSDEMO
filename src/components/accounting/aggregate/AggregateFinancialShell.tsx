/**
 * AggregateFinancialShell — Shared container for aggregate financial views.
 * 
 * Renders: ScopeBar > KPIStrip > [AgingStrip?] > children (table/content)
 * 
 * Phase 1: ScopeBar + KPIStrip + children passthrough.
 * Phase 2+: Will add GroupingToolbar, GroupedDataTable, AgingStrip.
 */

import { ScopeBar } from "./ScopeBar";
import { KPIStrip } from "./KPIStrip";
import type { DateScope, KPICard } from "./types";

interface AggregateFinancialShellProps {
  /** Current date scope (controlled externally) */
  scope: DateScope;
  /** Callback when user changes scope */
  onScopeChange: (scope: DateScope) => void;
  /** KPI cards to display */
  kpiCards: KPICard[];
  /** Optional demo targets for individual KPI cards keyed by label */
  kpiCardTargetIds?: Record<string, string | undefined>;
  /** Loading state */
  isLoading?: boolean;
  /** Hide the built-in ScopeBar (when lifted to module header) */
  hideScopeBar?: boolean;
  /** Content below the KPI strip (table, grouped table, etc.) */
  children: React.ReactNode;
}

export function AggregateFinancialShell({
  scope,
  onScopeChange,
  kpiCards,
  kpiCardTargetIds,
  isLoading,
  hideScopeBar,
  children,
}: AggregateFinancialShellProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Scope Bar (hidden when lifted to module header) */}
      {!hideScopeBar && <ScopeBar scope={scope} onScopeChange={onScopeChange} />}

      {/* KPI Strip */}
      <KPIStrip cards={kpiCards} isLoading={isLoading} cardTargetIds={kpiCardTargetIds} />

      {/* Content (table / grouped table / etc.) */}
      <div className="mt-1 flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}
