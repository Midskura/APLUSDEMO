/**
 * GroupedDataTable â€” Collapsible grouped table for aggregate financial views.
 *
 * Renders groups with expandable headers (label, count badge, subtotal),
 * and paginated detail rows within each group.
 */

import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, ChevronsUpDown, Download } from "lucide-react";
import type { GroupedItems } from "./types";
import { formatCurrencyFull } from "./types";

// â”€â”€ Column Definition (mirrors DataTable's ColumnDef but simplified) â”€â”€

export interface AggColumnDef<T> {
  header: string;
  accessorKey?: string;
  width?: string;
  align?: "left" | "right" | "center";
  cell?: (item: T) => React.ReactNode;
}

// â”€â”€ Props â”€â”€

interface GroupedDataTableProps<T> {
  /** Grouped data */
  groups: GroupedItems<T>[];
  /** Column definitions for detail rows */
  columns: AggColumnDef<T>[];
  /** Loading state */
  isLoading?: boolean;
  /** Rows per page within each group */
  pageSize?: number;
  /** Empty message when no groups */
  emptyMessage?: string;
  /** Callback when a detail row is clicked */
  onRowClick?: (item: T) => void;
  /** Optional resolver for stable row ids */
  getRowId?: (item: T) => string | number | undefined;
  /** Optional row id to visually and interactively target */
  highlightedRowId?: string | number | null;
  /** Demo target id applied to the highlighted row */
  rowTargetId?: string;
  /** Label for the amount field in CSV export (defaults to "Amount") */
  exportLabel?: string;
  /** Tab name for CSV file naming */
  exportFileName?: string;
}

const ROWS_PER_PAGE = 25;

export function GroupedDataTable<T extends { id?: string | number }>({
  groups,
  columns,
  isLoading,
  pageSize = ROWS_PER_PAGE,
  emptyMessage = "No records found for the current scope and filters.",
  onRowClick,
  getRowId,
  highlightedRowId = null,
  rowTargetId,
  exportLabel,
  exportFileName = "financials",
}: GroupedDataTableProps<T>) {
  // Track collapsed state per group (default: first 5 expanded, rest collapsed)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const collapsed = new Set<string>();
    groups.forEach((g, i) => {
      if (i >= 5) collapsed.add(g.key);
    });
    return collapsed;
  });

  // Track current page per group
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAll = () => {
    const allCollapsed = groups.every((g) => collapsedGroups.has(g.key));
    if (allCollapsed) {
      setCollapsedGroups(new Set());
    } else {
      setCollapsedGroups(new Set(groups.map((g) => g.key)));
    }
  };

  const getPage = (key: string) => groupPages[key] || 0;

  const setPage = (key: string, page: number) => {
    setGroupPages((prev) => ({ ...prev, [key]: page }));
  };

  // Grand total across all groups (must be before early returns â€” Rules of Hooks)
  const grandTotal = useMemo(
    () => groups.reduce((sum, g) => sum + g.subtotal, 0),
    [groups]
  );
  const totalCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.count, 0),
    [groups]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--neuron-ui-border)" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "var(--neuron-state-hover)" }}>
              <div className="h-3 w-3 bg-gray-200 rounded" />
              <div className="h-3.5 w-40 bg-gray-200 rounded" />
              <div className="ml-auto h-3 w-24 bg-gray-200 rounded" />
            </div>
            {i === 0 && [0, 1, 2].map((j) => (
              <div key={j} className="px-4 py-2.5 flex items-center gap-4 border-t" style={{ borderColor: "var(--neuron-ui-divider)" }}>
                {columns.map((_, k) => (
                  <div key={k} className="h-3 bg-gray-100 rounded" style={{ width: `${60 + Math.random() * 60}px` }} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <div
        className="rounded-lg py-16 flex flex-col items-center justify-center gap-2"
        style={{ border: "1px solid var(--neuron-ui-border)", backgroundColor: "var(--neuron-bg-elevated)" }}
      >
        <ChevronsUpDown size={28} style={{ color: "var(--neuron-ink-muted)", opacity: 0.4 }} />
        <p className="text-[13px]" style={{ color: "var(--neuron-ink-muted)" }}>{emptyMessage}</p>
      </div>
    );
  }

  const allCollapsed = groups.every((g) => collapsedGroups.has(g.key));

  // CSV export
  const handleExport = () => {
    const headers = columns.map((c) => c.header);
    headers.unshift("Group");

    const rows: string[][] = [];
    for (const group of groups) {
      for (const item of group.items) {
        const row = columns.map((col) => {
          if (col.accessorKey) {
            return String((item as any)[col.accessorKey] ?? "");
          }
          // For cell renderers, try to extract a text value from common fields
          const headerLower = col.header.toLowerCase();
          if (headerLower === "amount" || headerLower === "balance") {
            const amt = Number((item as any).amount ?? (item as any).total_amount ?? 0);
            return amt.toFixed(2);
          }
          if (headerLower === "date") {
            const d = (item as any).created_at || (item as any).invoice_date || (item as any).collection_date || (item as any).expenseDate || "";
            return d ? new Date(d).toLocaleDateString("en-US") : "";
          }
          if (headerLower === "customer") return (item as any).customer_name || (item as any).customerName || "";
          if (headerLower === "status") return (item as any).status || "";
          if (headerLower === "description") return (item as any).description || (item as any).expenseName || "";
          if (headerLower === "vendor") return (item as any).vendorName || (item as any).vendor_name || "";
          if (headerLower === "category") return (item as any).quotation_category || (item as any).expenseCategory || (item as any).category || "";
          if (headerLower.includes("ref")) return (item as any).project_number || (item as any).quotation_number || (item as any).booking_id || "";
          if (headerLower.includes("invoice")) return (item as any).invoice_number || "";
          if (headerLower === "method") return (item as any).payment_method || (item as any).mode_of_payment || "";
          if (headerLower === "reference") return (item as any).reference_number || (item as any).or_number || "";
          if (headerLower === "due date") {
            const d = (item as any).due_date || "";
            return d ? new Date(d).toLocaleDateString("en-US") : "";
          }
          return "";
        });
        row.unshift(group.label);
        rows.push(row);
      }
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFileName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--neuron-ui-border)" }}>
      {/* Table header with expand/collapse all */}
      <div
        className="flex items-center px-4 py-2"
        style={{ backgroundColor: "var(--neuron-bg-page)", borderBottom: "1px solid var(--neuron-ui-border)" }}
      >
        <button
          onClick={toggleAll}
          className="flex items-center justify-center shrink-0 rounded hover:bg-black/5 transition-colors"
          style={{ color: "var(--neuron-ink-muted)", width: "20px", height: "20px" }}
          title={allCollapsed ? "Expand all" : "Collapse all"}
        >
          {allCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Column headers (aligned with detail rows) */}
        <div className="flex items-center flex-1 ml-1.5 min-w-0">
          {columns.map((col, i) => (
            <div
              key={i}
              className="text-[10px] font-semibold uppercase tracking-wider px-2 truncate min-w-0"
              style={{
                color: "var(--neuron-ink-muted)",
                width: col.width || "auto",
                flex: col.width ? "none" : 1,
                textAlign: col.align || "left",
              }}
            >
              {col.header}
            </div>
          ))}
        </div>
      </div>

      {/* Groups */}
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key);
        const page = getPage(group.key);
        const totalPages = Math.ceil(group.items.length / pageSize);
        const pagedItems = group.items.slice(page * pageSize, (page + 1) * pageSize);

        return (
          <div key={group.key}>
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center px-4 py-2.5 transition-colors hover:brightness-[0.98] cursor-pointer"
              style={{
                backgroundColor: isCollapsed ? "var(--neuron-bg-elevated)" : "var(--neuron-state-hover)",
                borderBottom: "1px solid var(--neuron-ui-divider)",
              }}
            >
              {/* Chevron */}
              <span className="transition-transform duration-150" style={{ color: "var(--neuron-ink-muted)" }}>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </span>

              {/* Group Label */}
              <span
                className="ml-2 text-[13px] font-semibold truncate"
                style={{ color: "var(--neuron-ink-primary)" }}
              >
                {group.label}
              </span>

              {/* Count badge */}
              <span
                className="ml-2.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor: "var(--neuron-brand-green-100)",
                  color: "var(--neuron-brand-green)",
                }}
              >
                {group.count}
              </span>

              {/* Subtotal */}
              <span
                className="ml-auto text-[13px] font-semibold tabular-nums"
                style={{ color: "var(--neuron-ink-primary)" }}
              >
                {formatCurrencyFull(group.subtotal)}
              </span>
            </button>

            {/* Detail Rows (only if expanded) */}
            {!isCollapsed && (
              <>
                {pagedItems.map((item, rowIdx) => {
                  const resolvedRowId = getRowId ? getRowId(item) : (item as any).id;
                  const isHighlighted = highlightedRowId !== null && resolvedRowId === highlightedRowId;
                  const defaultBackground = isHighlighted ? "#F1FBF7" : "var(--neuron-bg-elevated)";
                  const hoverBackground = isHighlighted ? "#ECF9F4" : "var(--neuron-state-hover)";

                  return (
                    <div
                      key={resolvedRowId || `${group.key}-${rowIdx}`}
                      onClick={() => onRowClick?.(item)}
                      data-demo-target={isHighlighted ? rowTargetId : undefined}
                      data-demo-highlight-target={isHighlighted ? rowTargetId : undefined}
                      className="flex items-center px-4 py-2 transition-colors"
                      style={{
                        borderBottom: "1px solid var(--neuron-ui-divider)",
                        backgroundColor: defaultBackground,
                        cursor: onRowClick ? "pointer" : "default",
                        boxShadow: isHighlighted ? "inset 4px 0 0 #0F766E" : undefined,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = hoverBackground;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = defaultBackground;
                      }}
                    >
                      {/* Indent spacer (matches header chevron + gap for column alignment) */}
                      <div className="shrink-0" style={{ width: "26px" }} />

                      {/* Columns */}
                      <div className="flex items-center flex-1 min-w-0">
                        {columns.map((col, colIdx) => (
                          <div
                            key={colIdx}
                            className="px-2 text-[12px] truncate min-w-0"
                            style={{
                              color: "var(--neuron-ink-secondary)",
                              width: col.width || "auto",
                              flex: col.width ? "none" : 1,
                              textAlign: col.align || "left",
                            }}
                          >
                            {col.cell
                              ? col.cell(item)
                              : col.accessorKey
                              ? String((item as any)[col.accessorKey] ?? "â€”")
                              : "â€”"}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination (only if more than 1 page) */}
                {totalPages > 1 && (
                  <div
                    className="flex items-center justify-between px-6 py-2"
                    style={{
                      backgroundColor: "var(--neuron-bg-page)",
                      borderBottom: "1px solid var(--neuron-ui-divider)",
                    }}
                  >
                    <span className="text-[11px]" style={{ color: "var(--neuron-ink-muted)" }}>
                      Showing {page * pageSize + 1}â€“{Math.min((page + 1) * pageSize, group.items.length)} of {group.items.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(group.key, Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-30"
                        style={{
                          border: "1px solid var(--neuron-ui-border)",
                          color: "var(--neuron-ink-muted)",
                        }}
                      >
                        Prev
                      </button>
                      <span className="text-[11px] px-2" style={{ color: "var(--neuron-ink-muted)" }}>
                        {page + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(group.key, Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-30"
                        style={{
                          border: "1px solid var(--neuron-ui-border)",
                          color: "var(--neuron-ink-muted)",
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Grand total row */}
      <div
        className="flex items-center px-4 py-2"
        style={{ backgroundColor: "var(--neuron-bg-page)", borderTop: "1px solid var(--neuron-ui-border)" }}
      >
        <div className="flex items-center flex-1 min-w-0">
          <span
            className="text-[13px] font-semibold"
            style={{ color: "var(--neuron-ink-primary)" }}
          >
            Grand Total
          </span>
          <span
            className="ml-2.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              backgroundColor: "var(--neuron-brand-green-100)",
              color: "var(--neuron-brand-green)",
            }}
          >
            {totalCount}
          </span>
          <span
            className="ml-auto text-[13px] font-semibold tabular-nums"
            style={{ color: "var(--neuron-ink-primary)" }}
          >
            {formatCurrencyFull(grandTotal)}
          </span>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center justify-center shrink-0 rounded hover:bg-black/5 transition-colors"
          style={{ color: "var(--neuron-ink-muted)", width: "20px", height: "20px" }}
          title="Export to CSV"
        >
          <Download size={14} />
        </button>
      </div>
    </div>
  );
}
