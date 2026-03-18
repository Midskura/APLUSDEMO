import { SegmentedToggle } from "../../ui/SegmentedToggle";

interface MovementToggleProps {
  value: "IMPORT" | "EXPORT";
  onChange: (value: "IMPORT" | "EXPORT") => void;
  className?: string;
  layoutIdPrefix?: string;
  disabled?: boolean;
}

export function MovementToggle({ value, onChange, className, layoutIdPrefix = "movement-pill", disabled = false }: MovementToggleProps) {
  return (
    <SegmentedToggle 
      value={value}
      onChange={disabled ? (() => {}) : onChange}
      className={className}
      layoutIdPrefix={layoutIdPrefix}
      options={[
        { value: "IMPORT", label: "Import" },
        { value: "EXPORT", label: "Export" }
      ]}
      buttonPropsMap={disabled ? {
        IMPORT: { disabled: true },
        EXPORT: { disabled: true },
      } : undefined}
    />
  );
}
