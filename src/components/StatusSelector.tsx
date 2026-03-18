"use client";

import { CustomDropdown } from "./bd/CustomDropdown";
import { ExecutionStatus } from "../types/operations";
import { getBookingStatusStyles } from "../utils/bookingStatus";
import { cn } from "./ui/utils";
import { ChevronDown } from "lucide-react";

interface StatusSelectorProps {
  status: ExecutionStatus;
  onUpdateStatus?: (newStatus: ExecutionStatus) => void;
  readOnly?: boolean;
  className?: string;
  showIcon?: boolean;
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export function StatusSelector({ 
  status, 
  onUpdateStatus, 
  readOnly = false,
  className,
  showIcon = true,
  buttonProps,
}: StatusSelectorProps) {
  const style = getBookingStatusStyles(status);
  const Icon = style.icon;

  // Full list of selectable statuses
  const availableStatuses: ExecutionStatus[] = [
    "Draft",
    "Created",
    "Confirmed",
    "Pending",
    "For Delivery",
    "In Transit",
    "In Progress",
    "Delivered",
    "Completed", 
    "On Hold",
    "Cancelled",
    "Closed"
  ];

  // Map to CustomDropdown options
  const options = availableStatuses.map(s => {
    const sStyle = getBookingStatusStyles(s);
    const SIcon = sStyle.icon;
    return {
      value: s,
      label: s,
      icon: SIcon ? <SIcon size={16} /> : undefined
    };
  });

  // Read-only view (just a badge)
  if (readOnly) {
    return (
      <button 
        type="button"
        disabled
        className={cn(
          "inline-flex items-center px-4 py-2.5 rounded-full text-[13px] font-medium gap-2 transition-all duration-200 outline-none cursor-default opacity-100",
          className
        )}
        style={{
          backgroundColor: style.bg,
          color: style.text,
          border: style.borderColor ? `1px solid ${style.borderColor}` : undefined
        }}
      >
        {showIcon && Icon && <Icon size={16} />}
        {status}
      </button>
    );
  }

  // Interactive view using CustomDropdown
  return (
    <CustomDropdown
      value={status}
      onChange={(val) => onUpdateStatus?.(val as ExecutionStatus)}
      options={options}
      size="md"
      buttonClassName={cn("rounded-full font-medium min-w-[160px]", className)}
      buttonStyle={{
        backgroundColor: style.bg,
        color: style.text,
        border: style.borderColor ? `1px solid ${style.borderColor}` : undefined
      }}
      buttonProps={buttonProps}
    />
  );
}
