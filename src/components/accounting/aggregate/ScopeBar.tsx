/**
 * ScopeBar — Compact date scope selector for aggregate financial views.
 *
 * Layout: [Preset Dropdown] [📅 From] to [📅 To]
 *
 * The date pickers ALWAYS show the resolved date range — even for presets
 * like "This Quarter". Manually changing a date auto-switches to "Custom".
 *
 * Supports two modes:
 *   - `embedded` (default): borderless, transparent — designed to sit inside the unified toolbar
 *   - `standalone`: has its own border — used on Dashboard tab
 */

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { CustomDatePicker } from "../../common/CustomDatePicker";
import type { DateScope, ScopePreset } from "./types";
import { createDateScope } from "./types";

interface ScopeBarProps {
  scope: DateScope;
  onScopeChange: (scope: DateScope) => void;
  /** When true, renders with its own border (for standalone use outside toolbar) */
  standalone?: boolean;
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

const PRESETS: { value: ScopePreset; label: string; shortLabel: string }[] = [
  { value: "this-week", label: "This Week", shortLabel: "This Week" },
  { value: "this-month", label: "This Month", shortLabel: "This Month" },
  { value: "this-quarter", label: "This Quarter", shortLabel: "This Quarter" },
  { value: "ytd", label: "Year to Date", shortLabel: "YTD" },
  { value: "all", label: "All Time", shortLabel: "All Time" },
];

const getPresetLabel = (preset: ScopePreset): string => {
  if (preset === "custom") return "Custom";
  return PRESETS.find((p) => p.value === preset)?.shortLabel || preset;
};

const toInputValue = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export function ScopeBar({ scope, onScopeChange, standalone, buttonProps }: ScopeBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const interactionGroupId = (buttonProps as Record<string, unknown> | undefined)?.["data-demo-interaction-group"] as string | undefined;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !interactionGroupId || !buttonRef.current) {
      if (!interactionGroupId) setMenuPos(null);
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, left: rect.left, minWidth: rect.width });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [interactionGroupId, open]);

  const handlePresetClick = (preset: ScopePreset) => {
    onScopeChange(createDateScope(preset));
    setOpen(false);
  };

  // When user picks a date from CustomDatePicker → auto-switch to "custom"
  const handleDatePickerChange = (field: "from" | "to", isoStr: string) => {
    if (!isoStr) return; // cleared — ignore
    const date = new Date(isoStr + "T00:00:00");
    if (isNaN(date.getTime())) return;
    onScopeChange({
      preset: "custom",
      from: field === "from" ? date : scope.from,
      to: field === "to" ? date : scope.to,
    });
  };

  // Resolve display values — always show the scope's from/to, even for "all"
  const displayFrom = scope.preset === "all" ? "" : toInputValue(scope.from);
  const displayTo = scope.preset === "all" ? "" : toInputValue(scope.to);

  return (
    <div className="flex items-center gap-2" ref={ref}>
      {/* Preset dropdown */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-gray-50"
          style={{
            border: standalone ? "1px solid #E5E7EB" : "none",
            color: "#12332B",
            backgroundColor: open ? "#F0FDFA" : standalone ? "#FFFFFF" : "transparent",
          }}
          {...buttonProps}
        >
          <Calendar size={14} style={{ color: open ? "#0F766E" : "#667085" }} />
          <span>{getPresetLabel(scope.preset)}</span>
          <ChevronDown
            size={12}
            style={{ color: "#667085" }}
            className={`ml-0.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown popover */}
        {open && (() => {
          const dropdownContent = (
          <div
            ref={menuRef}
            data-demo-interaction-group={interactionGroupId}
            className="rounded-lg shadow-lg py-1 min-w-[220px]"
            style={{
              position: interactionGroupId ? "fixed" : "absolute",
              top: interactionGroupId ? menuPos?.top : "calc(100% + 6px)",
              left: interactionGroupId ? menuPos?.left : 0,
              border: "1px solid var(--neuron-ui-border)",
              backgroundColor: "#FFFFFF",
              zIndex: interactionGroupId ? 9999 : 50,
              minWidth: interactionGroupId ? Math.max(menuPos?.minWidth || 220, 220) : undefined,
            }}
          >
            {PRESETS.map((p) => {
              const isActive = scope.preset === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => handlePresetClick(p.value)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors hover:bg-gray-50"
                  style={{
                    color: isActive ? "#0F766E" : "var(--neuron-ink-primary)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {isActive ? (
                    <Check size={12} style={{ color: "#0F766E" }} />
                  ) : (
                    <span className="w-3" />
                  )}
                  {p.label}
                </button>
              );
            })}
          </div>
          );

          if (interactionGroupId && menuPos) {
            return createPortal(dropdownContent, document.body);
          }

          return dropdownContent;
        })()}
      </div>

      {/* Date range pickers — always visible, always reflect scope.from / scope.to */}
      {scope.preset !== "all" && (
        <>
          <div style={{ minWidth: "130px" }}>
            <CustomDatePicker
              value={displayFrom}
              onChange={(val) => handleDatePickerChange("from", val)}
              placeholder="Start Date"
              minWidth="100%"
              className="w-full px-3 py-2 text-[13px]"
            />
          </div>
          <span className="text-[12px] font-medium" style={{ color: "#6B7280" }}>
            to
          </span>
          <div style={{ minWidth: "130px" }}>
            <CustomDatePicker
              value={displayTo}
              onChange={(val) => handleDatePickerChange("to", val)}
              placeholder="End Date"
              minWidth="100%"
              className="w-full px-3 py-2 text-[13px]"
            />
          </div>
        </>
      )}
    </div>
  );
}
