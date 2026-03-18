import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  value: string;
  options: FormSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export function FormSelect({ value, options, onChange, placeholder = "Select...", disabled = false, buttonProps }: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const interactionGroupId = (buttonProps as Record<string, unknown> | undefined)?.["data-demo-interaction-group"] as string | undefined;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || !interactionGroupId || !buttonRef.current) {
      if (!interactionGroupId) setMenuPos(null);
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left, minWidth: rect.width });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [interactionGroupId, isOpen]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: "13px",
          color: selectedOption ? "var(--neuron-ink-base)" : "var(--neuron-ink-muted)",
          backgroundColor: disabled ? "#F9FAFB" : "white",
          border: "1px solid var(--neuron-ui-border)",
          borderRadius: "6px",
          cursor: disabled ? "default" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "left",
          outline: "none",
          transition: "all 0.15s ease",
          opacity: disabled ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "var(--neuron-brand-teal)";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "var(--neuron-ui-border)";
          }
        }}
        disabled={disabled}
        {...buttonProps}
      >
        <span>{displayValue}</span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: "var(--neuron-ink-muted)",
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
            marginLeft: "8px"
          }} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (() => {
        const menu = (
        <div
          ref={menuRef}
          data-demo-interaction-group={interactionGroupId}
          style={{
            position: interactionGroupId ? "fixed" : "absolute",
            top: interactionGroupId ? menuPos?.top : "calc(100% + 4px)",
            left: interactionGroupId ? menuPos?.left : 0,
            right: interactionGroupId ? undefined : 0,
            minWidth: interactionGroupId ? menuPos?.minWidth : undefined,
            backgroundColor: "white",
            border: "1px solid var(--neuron-ui-border)",
            borderRadius: "6px",
            boxShadow: "0px 4px 6px -2px rgba(16, 24, 40, 0.03), 0px 12px 16px -4px rgba(16, 24, 40, 0.08)",
            zIndex: interactionGroupId ? 9999 : 1000,
            maxHeight: "240px",
            overflowY: "auto"
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "13px",
                color: value === option.value ? "var(--neuron-brand-teal)" : "var(--neuron-ink-base)",
                backgroundColor: value === option.value ? "#E8F5F3" : "white",
                border: "none",
                borderBottom: "1px solid #F3F4F6",
                textAlign: "left",
                cursor: "pointer",
                transition: "background-color 0.15s ease"
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.backgroundColor = "#F9FAFB";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = value === option.value ? "#E8F5F3" : "white";
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        );

        if (interactionGroupId && menuPos) {
          return createPortal(menu, document.body);
        }

        return menu;
      })()}
    </div>
  );
}
