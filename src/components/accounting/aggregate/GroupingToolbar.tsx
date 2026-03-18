/**
 * GroupingToolbar — Unified filter bar for aggregate financial views.
 *
 * Follows the same two-row open layout used in Projects:
 *   Row 1: Full-width search bar (identical to Projects)
 *   Row 2: [📅 Scope chip] [⊞ Group chip] [Status segmented control]    count badge
 *
 * No outer card — just flex-col gap, matching the Projects toolbar pattern.
 */

import { useState, useRef, useEffect } from "react";
import { Search, X, LayoutGrid, ChevronDown } from "lucide-react";
import type { GroupOption, StatusOption, DateScope } from "./types";
import type { AgingBucket } from "./types";
import { formatCurrencyCompact } from "./types";
import { ScopeBar } from "./ScopeBar";
import { CustomDropdown } from "../../bd/CustomDropdown";

interface GroupingToolbarProps {
  scope?: DateScope;
  onScopeChange?: (scope: DateScope) => void;
  scopeButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;

  groupByOptions: GroupOption[];
  groupBy: string;
  onGroupByChange: (value: string) => void;

  searchQuery: string;
  onSearchChange: (value: string) => void;

  statusOptions: StatusOption[];
  activeStatus: string;
  onStatusChange: (value: string) => void;

  totalCount: number;
  groupCount: number;

  // Optional aging dropdown (Invoices & Collections only)
  agingBuckets?: AgingBucket[];
  activeAgingBucket?: string | null;
  onAgingBucketChange?: (label: string | null) => void;

  // Optional booking type filter (Billings & Expenses)
  bookingTypeOptions?: string[];
  activeBookingType?: string;
  onBookingTypeChange?: (value: string | null) => void;
}

export function GroupingToolbar({
  scope,
  onScopeChange,
  scopeButtonProps,
  groupByOptions,
  groupBy,
  onGroupByChange,
  searchQuery,
  onSearchChange,
  statusOptions,
  activeStatus,
  onStatusChange,
  totalCount,
  groupCount,
  agingBuckets,
  activeAgingBucket,
  onAgingBucketChange,
  bookingTypeOptions,
  activeBookingType,
  onBookingTypeChange,
}: GroupingToolbarProps) {
  const hasStatus = statusOptions.length > 0;
  const hasAging = agingBuckets && agingBuckets.length > 0 && onAgingBucketChange;
  const hasBookingType = bookingTypeOptions && bookingTypeOptions.length > 0 && onBookingTypeChange;
  const [groupOpen, setGroupOpen] = useState(false);
  const [agingOpen, setAgingOpen] = useState(false);
  const [bookingTypeOpen, setBookingTypeOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const agingRef = useRef<HTMLDivElement>(null);
  const bookingTypeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!groupOpen && !agingOpen && !bookingTypeOpen) return;
    const handler = (e: MouseEvent) => {
      if (groupOpen && groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setGroupOpen(false);
      }
      if (agingOpen && agingRef.current && !agingRef.current.contains(e.target as Node)) {
        setAgingOpen(false);
      }
      if (bookingTypeOpen && bookingTypeRef.current && !bookingTypeRef.current.contains(e.target as Node)) {
        setBookingTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [groupOpen, agingOpen, bookingTypeOpen]);

  const activeGroupLabel =
    groupByOptions.find((o) => o.value === groupBy)?.label || groupBy;

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Full-width search bar — matches Projects pattern */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "#667085" }}
        />
        <input
          type="text"
          placeholder="Search records..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full py-2.5 pl-10 pr-10 rounded-lg text-[14px]"
          style={{
            border: "1px solid #E5E7EB",
            outline: "none",
            color: "#12332B",
            backgroundColor: "#FFFFFF",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X size={14} style={{ color: "#667085" }} />
          </button>
        )}
      </div>

      {/* Row 2: Scope chip | Group chip | Status segmented control | Count badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Scope chip */}
        {scope && onScopeChange && (
          <ScopeBar scope={scope} onScopeChange={onScopeChange} standalone buttonProps={scopeButtonProps} />
        )}

        {/* Group-by chip dropdown */}
        <div className="relative" ref={groupRef}>
          <button
            onClick={() => setGroupOpen(!groupOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-gray-50"
            style={{
              border: "1px solid #E5E7EB",
              color: "#12332B",
              backgroundColor: groupOpen ? "#F0FDFA" : "#FFFFFF",
            }}
          >
            <LayoutGrid
              size={14}
              style={{ color: groupOpen ? "#0F766E" : "#667085" }}
            />
            <span>{activeGroupLabel}</span>
            <ChevronDown
              size={12}
              style={{ color: "#667085" }}
              className={`transition-transform ${groupOpen ? "rotate-180" : ""}`}
            />
          </button>

          {groupOpen && (
            <div
              className="absolute top-full left-0 mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[180px]"
              style={{
                border: "1px solid #E5E7EB",
                backgroundColor: "#FFFFFF",
              }}
            >
              {groupByOptions.map((opt) => {
                const isActive = groupBy === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onGroupByChange(opt.value);
                      setGroupOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-gray-50"
                    style={{
                      color: isActive ? "#0F766E" : "#12332B",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {isActive ? (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "#0F766E" }}
                      />
                    ) : (
                      <span className="w-1.5" />
                    )}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Aging dropdown (Invoices & Collections only) */}
        {hasAging && (
          <div className="relative" ref={agingRef}>
            <button
              onClick={() => setAgingOpen(!agingOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-gray-50"
              style={{
                border: `1px solid ${activeAgingBucket ? (agingBuckets!.find(b => b.label === activeAgingBucket)?.color || "#E5E7EB") + "60" : "#E5E7EB"}`,
                color: activeAgingBucket ? agingBuckets!.find(b => b.label === activeAgingBucket)?.color || "#12332B" : "#12332B",
                backgroundColor: agingOpen ? "#F0FDFA" : activeAgingBucket ? `${agingBuckets!.find(b => b.label === activeAgingBucket)?.color || "#0F766E"}08` : "#FFFFFF",
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: activeAgingBucket
                    ? agingBuckets!.find(b => b.label === activeAgingBucket)?.color || "#0F766E"
                    : "#667085",
                }}
              />
              <span>{activeAgingBucket || "Aging"}</span>
              <ChevronDown
                size={12}
                style={{ color: "#667085" }}
                className={`transition-transform ${agingOpen ? "rotate-180" : ""}`}
              />
            </button>

            {agingOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[240px]"
                style={{
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                }}
              >
                {/* All / Clear option */}
                <button
                  onClick={() => {
                    onAgingBucketChange!(null);
                    setAgingOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-gray-50"
                  style={{
                    color: !activeAgingBucket ? "#0F766E" : "#12332B",
                    fontWeight: !activeAgingBucket ? 600 : 400,
                    borderBottom: "1px solid #F3F4F6",
                  }}
                >
                  {!activeAgingBucket ? (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#0F766E" }} />
                  ) : (
                    <span className="w-1.5" />
                  )}
                  All Aging
                </button>

                {agingBuckets!.map((bucket) => {
                  const isActive = activeAgingBucket === bucket.label;
                  return (
                    <button
                      key={bucket.label}
                      onClick={() => {
                        onAgingBucketChange!(isActive ? null : bucket.label);
                        setAgingOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-gray-50"
                      style={{
                        color: isActive ? bucket.color : "#12332B",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: bucket.color }}
                      />
                      <span className="flex-1 text-left">{bucket.label}</span>
                      <span
                        className="text-[11px] tabular-nums"
                        style={{ color: isActive ? bucket.color : "#667085" }}
                      >
                        {formatCurrencyCompact(bucket.amount)}
                      </span>
                      <span
                        className="text-[10px] px-1.5 rounded-full"
                        style={{
                          backgroundColor: isActive ? `${bucket.color}15` : "#F3F4F6",
                          color: isActive ? bucket.color : "#667085",
                        }}
                      >
                        {bucket.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Booking type dropdown (Billings & Expenses) */}
        {hasBookingType && (
          <div className="relative" ref={bookingTypeRef}>
            <button
              onClick={() => setBookingTypeOpen(!bookingTypeOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-gray-50"
              style={{
                border: `1px solid ${activeBookingType ? "#E5E7EB" + "60" : "#E5E7EB"}`,
                color: activeBookingType ? "#12332B" : "#12332B",
                backgroundColor: bookingTypeOpen ? "#F0FDFA" : activeBookingType ? "#F0FDFA" : "#FFFFFF",
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: activeBookingType
                    ? "#0F766E"
                    : "#667085",
                }}
              />
              <span>{activeBookingType || "Booking Type"}</span>
              <ChevronDown
                size={12}
                style={{ color: "#667085" }}
                className={`transition-transform ${bookingTypeOpen ? "rotate-180" : ""}`}
              />
            </button>

            {bookingTypeOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-50 rounded-lg shadow-lg py-1 min-w-[240px]"
                style={{
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                }}
              >
                {/* All / Clear option */}
                <button
                  onClick={() => {
                    onBookingTypeChange!(null);
                    setBookingTypeOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-gray-50"
                  style={{
                    color: !activeBookingType ? "#0F766E" : "#12332B",
                    fontWeight: !activeBookingType ? 600 : 400,
                    borderBottom: "1px solid #F3F4F6",
                  }}
                >
                  {!activeBookingType ? (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#0F766E" }} />
                  ) : (
                    <span className="w-1.5" />
                  )}
                  All Booking Types
                </button>

                {bookingTypeOptions!.map((type) => {
                  const isActive = activeBookingType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        onBookingTypeChange!(isActive ? null : type);
                        setBookingTypeOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-gray-50"
                      style={{
                        color: isActive ? "#0F766E" : "#12332B",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: isActive ? "#0F766E" : "#667085" }}
                      />
                      <span className="flex-1 text-left">{type}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Status filter dropdown */}
        {hasStatus && (
          <CustomDropdown
            label=""
            value={activeStatus || "all"}
            onChange={(value) => onStatusChange(value === "all" ? "" : value)}
            options={[
              { value: "all", label: "All Status" },
              ...statusOptions.map((opt) => ({
                value: opt.value,
                label: opt.label,
              })),
            ]}
          />
        )}

        {/* Record count badge removed — "X in Y groups" was redundant */}
      </div>
    </div>
  );
}
