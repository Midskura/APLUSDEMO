import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { CreditCard, FileText, Home, LogOut, RotateCcw, Ship, ShoppingCart } from "lucide-react";
import { ExecutiveDashboard } from "../ExecutiveDashboard";
import { QuotationsListWithFilters } from "../pricing/QuotationsListWithFilters";
import { QuotationBuilderV3 } from "../pricing/quotations/QuotationBuilderV3";
import { QuotationDetail } from "../pricing/QuotationDetail";
import { ForwardingBookings } from "../operations/forwarding/ForwardingBookings";
import { ForwardingBookingDetails } from "../operations/forwarding/ForwardingBookingDetails";
import { FinancialsModule } from "../accounting/FinancialsModule";
import type { QuotationNew } from "../../types/pricing";
import type { ForwardingBooking } from "../../types/operations";
import type { Customer } from "../../types/bd";
import type { CSSProperties } from "react";

type DemoPage = "dashboard" | "inquiries" | "quotations" | "forwarding" | "financials";
type DemoStep =
  | "dashboard-inquiries"
  | "inquiries-create"
  | "builder-movement"
  | "builder-customer"
  | "builder-forwarding"
  | "builder-aodpod"
  | "builder-generate"
  | "sidebar-quotations"
  | "quotations-row"
  | "quotation-mode"
  | "quotation-pdf"
  | "pdf-accept"
  | "forwarding-eta"
  | "forwarding-create"
  | "forwarding-row"
  | "forwarding-status"
  | "sidebar-financials"
  | "financials-invoices"
  | "financials-invoice-row"
  | "financials-total-invoiced"
  | "complete";

type BuilderSnapshot = {
  customerId: string;
  customerName: string;
  movement: "IMPORT" | "EXPORT";
  selectedServices: string[];
  forwardingData: { aodPod?: string; mode?: string };
  quoteNumber: string;
};

type DemoInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name: string;
  booking_id: string;
  total_amount: number;
  remaining_balance: number;
  status: string;
  created_at: string;
};

type DemoStepMeta = {
  targetId?: string;
  highlightTargetId?: string;
  title: string;
  description: string;
};

const TARGETS = {
  sidebarInquiries: "demo-sidebar-inquiries",
  sidebarQuotations: "demo-sidebar-quotations",
  sidebarFinancials: "demo-sidebar-financials",
  inquiriesCreate: "demo-inquiries-create",
  builderMovement: "demo-builder-movement",
  builderCustomer: "demo-builder-customer",
  builderForwarding: "demo-builder-forwarding",
  builderAodPod: "demo-builder-aodpod",
  builderSubmit: "demo-builder-submit",
  quotationRow: "demo-quotation-row",
  quotationMode: "demo-quotation-mode",
  quotationPdfToggle: "demo-quotation-pdf-toggle",
  quotationPdf: "demo-quotation-pdf",
  pdfPrimaryAction: "demo-pdf-primary-action",
  forwardingEta: "demo-forwarding-eta",
  forwardingSubmit: "demo-forwarding-submit",
  forwardingRow: "demo-forwarding-row",
  forwardingStatus: "demo-forwarding-status",
  financialsInvoicesTab: "demo-financials-invoices-tab",
  financialsInvoiceRow: "demo-financials-invoice-row",
  financialsTotalInvoiced: "demo-financials-total-invoiced",
} as const;

const DEMO_USER = {
  id: "demo-user",
  name: "Neuron Demo",
  email: "demo@neuronos.local",
  department: "Executive",
};

const DEMO_CUSTOMERS: Customer[] = [
  {
    id: "demo-customer-atlas",
    name: "Atlas Retail Group",
    industry: "General Merchandise",
    status: "Active",
    client_type: "Local",
    credit_terms: "Net 30",
    created_at: "2026-01-03T08:00:00.000Z",
    updated_at: "2026-01-03T08:00:00.000Z",
  },
  {
    id: "demo-customer-pacific",
    name: "Pacific Components Manufacturing",
    industry: "Electronics",
    status: "Active",
    client_type: "International",
    credit_terms: "Net 15",
    created_at: "2026-01-05T08:00:00.000Z",
    updated_at: "2026-01-05T08:00:00.000Z",
  },
  {
    id: "demo-customer-summit",
    name: "Summit Food Logistics",
    industry: "Food & Beverage",
    status: "Active",
    client_type: "Local",
    credit_terms: "COD",
    created_at: "2026-01-09T08:00:00.000Z",
    updated_at: "2026-01-09T08:00:00.000Z",
  },
];

const STEPS: DemoStep[] = [
  "dashboard-inquiries",
  "inquiries-create",
  "builder-movement",
  "builder-customer",
  "builder-forwarding",
  "builder-aodpod",
  "builder-generate",
  "sidebar-quotations",
  "quotations-row",
  "quotation-mode",
  "quotation-pdf",
  "pdf-accept",
  "forwarding-eta",
  "forwarding-create",
  "forwarding-row",
  "forwarding-status",
  "sidebar-financials",
  "financials-invoices",
  "financials-invoice-row",
  "financials-total-invoiced",
  "complete",
];

const STEP_META: Record<DemoStep, DemoStepMeta> = {
  "dashboard-inquiries": { targetId: TARGETS.sidebarInquiries, title: "Open Inquiries", description: "Start the walkthrough from the dashboard by opening Inquiries." },
  "inquiries-create": { targetId: TARGETS.inquiriesCreate, title: "Create Inquiry", description: "Use the existing Create Inquiry action to open the real builder." },
  "builder-movement": { targetId: TARGETS.builderMovement, title: "Choose Movement", description: "Pick the shipment movement in the real Movement control." },
  "builder-customer": { targetId: TARGETS.builderCustomer, title: "Select Customer", description: "Select a customer from the list." },
  "builder-forwarding": { targetId: TARGETS.builderForwarding, title: "Select Forwarding", description: "Pick Forwarding from the existing service chips." },
  "builder-aodpod": { targetId: TARGETS.builderAodPod, title: "Enter AOD/POD", description: "Fill the AOD/POD field. The demo carries this into the booking." },
  "builder-generate": { targetId: TARGETS.builderSubmit, title: "Generate Quote", description: "Use the demo-only Generate Quote action to create the quotation." },
  "sidebar-quotations": { targetId: TARGETS.sidebarQuotations, title: "Go to Quotations", description: "Open Quotations in the sidebar to review the newly created item." },
  "quotations-row": { targetId: TARGETS.quotationRow, title: "Open the Quotation", description: "Click the highlighted quotation row pinned to the top of the list." },
  "quotation-mode": { targetId: TARGETS.quotationMode, title: "Pick the Mode", description: "Use the forwarding Mode control in the real quotation detail view." },
  "quotation-pdf": { targetId: TARGETS.quotationPdf, highlightTargetId: TARGETS.quotationPdfToggle, title: "Open PDF View", description: "Switch to the existing PDF View to access the handoff action." },
  "pdf-accept": { targetId: TARGETS.pdfPrimaryAction, title: "Create Forwarding", description: "Accept & Create Forwarding replaces Print PDF only inside demo mode." },
  "forwarding-eta": { targetId: TARGETS.forwardingEta, title: "Set ETA", description: "All inherited fields are auto-filled. ETA is the only manual field in the demo." },
  "forwarding-create": { targetId: TARGETS.forwardingSubmit, title: "Create Booking", description: "Submit the real forwarding panel to create the demo booking." },
  "forwarding-row": { targetId: TARGETS.forwardingRow, title: "Open the Booking", description: "Click the new forwarding entry in the real list view." },
  "forwarding-status": { targetId: TARGETS.forwardingStatus, title: "Mark Completed", description: "Use the existing status control to set the booking to Completed." },
  "sidebar-financials": { targetId: TARGETS.sidebarFinancials, title: "Open Financials", description: "Use the Financials button in the sidebar to move from operations into the finance side of the workflow." },
  "financials-invoices": { targetId: TARGETS.financialsInvoicesTab, title: "Open Invoices Tab", description: "Click the Invoices tab to see the billing record created from the completed shipment." },
  "financials-invoice-row": { targetId: TARGETS.financialsInvoiceRow, title: "New Invoice Record", description: "This completed shipment has now become a real invoice record inside Financials > Invoices." },
  "financials-total-invoiced": { targetId: TARGETS.financialsTotalInvoiced, title: "Invoice Summary Updated", description: "Neuron also updates the invoice summary automatically. Total Invoiced now reflects the newly created invoice." },
  complete: { title: "Financial Handoff Complete", description: "The completed shipment is now visible in Invoices as both a record and an updated financial summary." },
};

function formatDemoCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function buildDemoInvoice(quotation: QuotationNew | null, booking: ForwardingBooking | null): DemoInvoice | null {
  if (!quotation || !booking) return null;
  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 7);
  return {
    id: `demo-invoice-${booking.bookingId}`,
    invoice_number: `INV-${booking.bookingId.slice(-6)}`,
    invoice_date: invoiceDate.toISOString(),
    due_date: dueDate.toISOString(),
    customer_name: quotation.customer_name || booking.customerName,
    booking_id: booking.bookingId,
    total_amount: 128500,
    remaining_balance: 128500,
    status: "open",
    created_at: invoiceDate.toISOString(),
  };
}

type RectBounds = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type TargetLayout = {
  targetElement: HTMLElement | null;
  highlightRect: RectBounds | null;
};

function toRectBounds(rect: Pick<DOMRect, "top" | "left" | "right" | "bottom" | "width" | "height">): RectBounds {
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function mergeRects(rects: Array<RectBounds | null | undefined>): RectBounds | null {
  const resolved = rects.filter((rect): rect is RectBounds => Boolean(rect));
  if (resolved.length === 0) return null;

  const top = Math.min(...resolved.map((rect) => rect.top));
  const left = Math.min(...resolved.map((rect) => rect.left));
  const right = Math.max(...resolved.map((rect) => rect.right));
  const bottom = Math.max(...resolved.map((rect) => rect.bottom));

  return {
    top,
    left,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function getRectFromElement(element: Element | null): RectBounds | null {
  if (!element) return null;
  return toRectBounds(element.getBoundingClientRect());
}

function getScrollableContainer(element: HTMLElement | null): HTMLElement | Window {
  let current = element?.parentElement || null;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = `${style.overflowY}${style.overflow}`;
    if (/(auto|scroll)/.test(overflowY) && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }

  return window;
}

function rectsOverlap(first: RectBounds, second: RectBounds) {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
}

function useTargetLayout(targetId?: string, highlightTargetId?: string) {
  const [layout, setLayout] = useState<TargetLayout>({ targetElement: null, highlightRect: null });

  useLayoutEffect(() => {
    if (!targetId && !highlightTargetId) {
      setLayout({ targetElement: null, highlightRect: null });
      return;
    }

    let frame = 0;
    const update = () => {
      const targetElement = targetId
        ? document.querySelector<HTMLElement>(`[data-demo-target="${targetId}"]`)
        : null;
      const highlightElement = (highlightTargetId
        ? document.querySelector<HTMLElement>(`[data-demo-highlight-target="${highlightTargetId}"]`)
        : null) || targetElement;

      const interactionIds = Array.from(
        new Set([targetId, highlightTargetId].filter((value): value is string => Boolean(value))),
      );

      const interactionElements = interactionIds.flatMap((id) =>
        Array.from(document.querySelectorAll<HTMLElement>(`[data-demo-interaction-group="${id}"]`)),
      );

      const highlightRect = mergeRects([
        getRectFromElement(highlightElement),
        ...interactionElements.map((element) => getRectFromElement(element)),
      ]);

      setLayout({
        targetElement,
        highlightRect,
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [highlightTargetId, targetId]);

  return layout;
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function resolveOverlayCardPlacement(anchorRect: RectBounds, cardSize: { width: number; height: number }): CSSProperties {
  const margin = 20;
  const gap = 18;
  const minScrollableHeight = 120;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(cardSize.width || 320, viewportWidth - margin * 2);
  const height = Math.min(cardSize.height || 220, viewportHeight - margin * 2);
  const paddedTarget: RectBounds = {
    top: anchorRect.top - 12,
    left: anchorRect.left - 12,
    right: anchorRect.right + 12,
    bottom: anchorRect.bottom + 12,
    width: anchorRect.width + 24,
    height: anchorRect.height + 24,
  };

  const centeredLeft = clamp(anchorRect.left + anchorRect.width / 2 - width / 2, margin, viewportWidth - width - margin);
  const centeredTop = clamp(anchorRect.top + anchorRect.height / 2 - height / 2, margin, viewportHeight - height - margin);
  const candidates: Array<RectBounds & { scrollable?: boolean }> = [
    { top: anchorRect.bottom + gap, left: centeredLeft, right: centeredLeft + width, bottom: anchorRect.bottom + gap + height, width, height },
    { top: anchorRect.top - gap - height, left: centeredLeft, right: centeredLeft + width, bottom: anchorRect.top - gap, width, height },
    { top: centeredTop, left: anchorRect.right + gap, right: anchorRect.right + gap + width, bottom: centeredTop + height, width, height },
    { top: centeredTop, left: anchorRect.left - gap - width, right: anchorRect.left - gap, bottom: centeredTop + height, width, height },
  ];

  const isInsideViewport = (rect: RectBounds) =>
    rect.top >= margin &&
    rect.left >= margin &&
    rect.right <= viewportWidth - margin &&
    rect.bottom <= viewportHeight - margin;

  for (const candidate of candidates) {
    if (isInsideViewport(candidate) && !rectsOverlap(candidate, paddedTarget)) {
      return {
        top: candidate.top,
        left: candidate.left,
        width,
        borderColor: "#D9E3E0",
      };
    }
  }

  const availableBelow = Math.max(0, viewportHeight - margin - (anchorRect.bottom + gap));
  if (availableBelow >= minScrollableHeight) {
    return {
      top: anchorRect.bottom + gap,
      left: centeredLeft,
      width,
      maxHeight: availableBelow,
      overflowY: "auto",
      borderColor: "#D9E3E0",
    };
  }

  const availableAbove = Math.max(0, anchorRect.top - gap - margin);
  if (availableAbove >= minScrollableHeight) {
    const boundedHeight = Math.min(height, availableAbove);
    return {
      top: Math.max(margin, anchorRect.top - gap - boundedHeight),
      left: centeredLeft,
      width,
      maxHeight: availableAbove,
      overflowY: "auto",
      borderColor: "#D9E3E0",
    };
  }

  const fallbackLeft = anchorRect.left < viewportWidth / 2 ? viewportWidth - width - margin : margin;
  const fallbackTop = anchorRect.top < viewportHeight / 2 ? margin : viewportHeight - height - margin;

  return {
    top: clamp(fallbackTop, margin, viewportHeight - margin - Math.min(height, viewportHeight - margin * 2)),
    left: clamp(fallbackLeft, margin, viewportWidth - width - margin),
    width,
    maxHeight: viewportHeight - margin * 2,
    overflowY: "auto",
    borderColor: "#D9E3E0",
  };
}

function useDemoInteractionLock(step: DemoStep) {
  useEffect(() => {
    const targetId = STEP_META[step]?.targetId;
    const isExemptElement = (element: Element | null) =>
      Boolean(
        element?.closest(
          '[data-demo-overlay-root="true"], [data-demo-overlay-card="true"], [data-demo-overlay-control="true"], [data-demo-persistent-control="true"]',
        ),
      );

    const isAllowedTarget = (eventTarget: EventTarget | null) => {
      const node = eventTarget instanceof Node ? eventTarget : null;
      const element = node instanceof Element ? node : node?.parentElement;

      if (!element) return false;
      if (isExemptElement(element)) return true;
      if (!targetId) return false;

      const targetElement = document.querySelector<HTMLElement>(`[data-demo-target="${targetId}"]`);
      if (targetElement && (targetElement === element || targetElement.contains(element))) {
        return true;
      }

      return Boolean(element.closest(`[data-demo-interaction-group="${targetId}"]`));
    };

    const isAllowedEvent = (event: Event) => {
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];

      for (const entry of path) {
        if (entry instanceof Element && isExemptElement(entry)) {
          return true;
        }
      }

      return isAllowedTarget(event.target);
    };

    const isOverlayControl = (event: Event) => {
      const el = event.target instanceof Element ? event.target : (event.target instanceof Node ? event.target.parentElement : null);
      return Boolean(
        el?.closest('[data-demo-overlay-card="true"], [data-demo-overlay-control="true"], [data-demo-persistent-control="true"]'),
      );
    };

    const stopEvent = (event: Event) => {
      if (isOverlayControl(event) || isAllowedEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      (event as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();

      if (event.type === "focusin" && event.target instanceof HTMLElement) {
        event.target.blur();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isOverlayControl(event) || isAllowedEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      (event as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();

      if (targetId) {
        const targetElement = document.querySelector<HTMLElement>(`[data-demo-target="${targetId}"]`);
        targetElement?.focus?.();
      }
    };

    document.addEventListener("pointerdown", stopEvent, true);
    document.addEventListener("mousedown", stopEvent, true);
    document.addEventListener("click", stopEvent, true);
    document.addEventListener("touchstart", stopEvent, true);
    document.addEventListener("focusin", stopEvent, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", stopEvent, true);
      document.removeEventListener("mousedown", stopEvent, true);
      document.removeEventListener("click", stopEvent, true);
      document.removeEventListener("touchstart", stopEvent, true);
      document.removeEventListener("focusin", stopEvent, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [step]);
}

function DemoOverlay({
  step,
  page,
  invoice,
  onContinueFromInvoiceRow,
  onRestart,
  onExit,
}: {
  step: DemoStep;
  page: DemoPage;
  invoice: DemoInvoice | null;
  onContinueFromInvoiceRow: () => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  const meta = STEP_META[step];
  const { highlightRect, targetElement } = useTargetLayout(meta.targetId, meta.highlightTargetId);
  const stepIndex = STEPS.indexOf(step);
  const [cardEl, setCardEl] = useState<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState({ width: 320, height: 220 });
  const lastAutoScrollRef = useRef("");
  const overlayPrimaryAction =
    step === "financials-invoice-row"
      ? { label: "Next", onClick: onContinueFromInvoiceRow }
      : null;

  useLayoutEffect(() => {
    if (!cardEl || step === "complete") return;

    const updateSize = () => {
      setCardSize({
        width: cardEl.offsetWidth || 320,
        height: cardEl.offsetHeight || 220,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(cardEl);
    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [cardEl, step]);

  const overlayCardStyle = useMemo<CSSProperties | null>(() => {
    if (!highlightRect || step === "complete") return null;
    return resolveOverlayCardPlacement(highlightRect, cardSize);
  }, [cardSize, highlightRect, step]);

  useLayoutEffect(() => {
    if (!targetElement || !highlightRect || step === "complete") return;

    let frame = 0;
    frame = requestAnimationFrame(() => {
      const framedRect = mergeRects([highlightRect, cardEl ? getRectFromElement(cardEl) : null]);
      if (!framedRect) return;

      const signature = `${step}:${Math.round(framedRect.top)}:${Math.round(framedRect.bottom)}:${Math.round(framedRect.left)}:${Math.round(framedRect.right)}`;

      const container = getScrollableContainer(targetElement);
      const padding = 32;

      if (container === window) {
        if (framedRect.top >= padding && framedRect.bottom <= window.innerHeight - padding) return;
        if (lastAutoScrollRef.current === signature) return;
        const targetCenter = framedRect.top + framedRect.height / 2;
        const desiredCenter = window.innerHeight * 0.46;
        const nextTop = Math.max(0, window.scrollY + targetCenter - desiredCenter);
        lastAutoScrollRef.current = signature;
        window.scrollTo({ top: nextTop, behavior: "smooth" });
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const visibleTop = containerRect.top + padding;
      const visibleBottom = containerRect.bottom - padding;
      if (framedRect.top >= visibleTop && framedRect.bottom <= visibleBottom) return;
      if (lastAutoScrollRef.current === signature) return;

      const targetCenter = framedRect.top + framedRect.height / 2;
      const desiredCenter = containerRect.top + container.clientHeight * 0.46;
      const nextTop = Math.max(0, container.scrollTop + targetCenter - desiredCenter);
      lastAutoScrollRef.current = signature;
      container.scrollTo({ top: nextTop, behavior: "smooth" });
    });

    return () => cancelAnimationFrame(frame);
  }, [cardEl, highlightRect, overlayCardStyle, step, targetElement]);

  if (typeof document === "undefined") return null;

  if (step === "complete") {
    return createPortal(
      <div data-demo-overlay-card="true" className="pointer-events-auto fixed w-full max-w-[430px] rounded-3xl border bg-white p-6 shadow-2xl" style={{ top: 24, right: 24, zIndex: 2147483647, borderColor: "#D9E3E0", boxShadow: "0 28px 70px rgba(18,51,43,0.14)" }}>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0F766E]">Financial Handoff Complete</div>
          <h2 className="mb-3 text-[26px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#12332B]">
            Finance now sees the value of this shipment.
          </h2>
          <p className="text-[14px] leading-6 text-[#667085]">
            {invoice
              ? `${invoice.invoice_number} is now visible in Financials > Invoices, and the Total Invoiced summary now includes ${formatDemoCurrency(invoice.total_amount)} from this shipment.`
              : meta.description}
          </p>
          {page === "financials" && invoice && (
            <div className="mt-4 rounded-2xl border px-4 py-4" style={{ borderColor: "#D9E3E0", backgroundColor: "#F8FBFB" }}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#667085]">Why This Matters</div>
              <p className="mt-2 text-[13px] leading-6 text-[#12332B]">
                Operations completed the work. Financials now owns the receivable, aging, and collection follow-through.
              </p>
            </div>
          )}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              data-demo-overlay-control="true"
              onClick={onRestart}
              className="rounded-lg border px-4 py-2.5 text-[13px] font-semibold text-[#12332B] hover:bg-[#F8FBFB]"
              style={{ borderColor: "#D9E3E0" }}
            >
              Restart Demo
            </button>
            <button
              type="button"
              data-demo-overlay-control="true"
              onClick={onExit}
              className="rounded-lg bg-[#0F766E] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0D625D]"
            >
              Exit Demo
            </button>
          </div>
      </div>,
      document.body,
    );
  }

  return (
    <>
      {createPortal(
        <div data-demo-overlay-root="true" className="pointer-events-none fixed inset-0 z-[2147483640]">
          {highlightRect ? (
            <>
              <div className="fixed z-[2147483640] left-0 top-0" style={{ width: "100vw", height: Math.max(0, highlightRect.top - 10), backgroundColor: "rgba(248, 250, 252, 0.38)" }} />
              <div className="fixed z-[2147483640] left-0" style={{ top: Math.max(0, highlightRect.top - 10), width: Math.max(0, highlightRect.left - 10), height: highlightRect.height + 20, backgroundColor: "rgba(248, 250, 252, 0.38)" }} />
              <div className="fixed z-[2147483640] right-0" style={{ top: Math.max(0, highlightRect.top - 10), width: Math.max(0, window.innerWidth - highlightRect.right - 10), height: highlightRect.height + 20, backgroundColor: "rgba(248, 250, 252, 0.38)" }} />
              <div className="fixed z-[2147483640] left-0 bottom-0" style={{ width: "100vw", top: highlightRect.bottom + 10, backgroundColor: "rgba(248, 250, 252, 0.38)" }} />
              <div
                className="fixed z-[2147483640] rounded-[18px] border-2 border-[#5FC4A1]"
                style={{ top: highlightRect.top - 6, left: highlightRect.left - 6, width: highlightRect.width + 12, height: highlightRect.height + 12, backgroundColor: "rgba(255,255,255,0.18)", boxShadow: "0 0 0 1px rgba(255,255,255,0.92), 0 18px 42px rgba(15,118,110,0.16)" }}
              />
            </>
          ) : (
            <div className="fixed z-[2147483640] inset-0 flex items-center justify-center px-6" style={{ backgroundColor: "rgba(248, 250, 252, 0.42)" }}>
              <div data-demo-overlay-card="true" className="rounded-2xl border bg-white px-6 py-5 text-[14px] text-[#667085] shadow-2xl" style={{ borderColor: "#D9E3E0" }}>
                Preparing the next step...
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
      {highlightRect && createPortal(
        <div
          data-demo-overlay-card="true"
          className="pointer-events-auto fixed w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border bg-white p-5 shadow-2xl"
          ref={setCardEl}
          style={{ borderColor: "#D9E3E0", ...overlayCardStyle, zIndex: 2147483647 }}
        >
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0F766E]">Step {stepIndex + 1} of {STEPS.length - 1}</div>
          <h2 className="mb-2 text-[20px] font-semibold text-[#12332B]">{meta.title}</h2>
          <p className="text-[13px] leading-6 text-[#667085]">{meta.description}</p>
          <div className="mt-4 flex items-center gap-2">
            {overlayPrimaryAction && (
              <button
                type="button"
                data-demo-overlay-control="true"
                onClick={overlayPrimaryAction.onClick}
                className="rounded-lg bg-[#0F766E] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#0D625D]"
              >
                {overlayPrimaryAction.label}
              </button>
            )}
            <button
              type="button"
              data-demo-overlay-control="true"
              onClick={onRestart}
              className="rounded-lg border px-3 py-2 text-[12px] font-semibold text-[#12332B] hover:bg-[#F8FBFB]"
              style={{ borderColor: "#D9E3E0" }}
            >
              Restart
            </button>
            <button
              type="button"
              data-demo-overlay-control="true"
              onClick={onExit}
              className="rounded-lg border px-3 py-2 text-[12px] font-semibold text-[#667085] hover:bg-[#F8FBFB]"
              style={{ borderColor: "#E4E7EC" }}
            >
              Exit
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function DemoExperience() {
  const navigate = useNavigate();
  const [page, setPage] = useState<DemoPage>("dashboard");
  const [inquiriesView, setInquiriesView] = useState<"list" | "builder">("list");
  const [quotationsView, setQuotationsView] = useState<"list" | "detail">("list");
  const [forwardingView, setForwardingView] = useState<"list" | "detail">("list");
  const [step, setStep] = useState<DemoStep>("dashboard-inquiries");
  const [builderSnapshot, setBuilderSnapshot] = useState<BuilderSnapshot | null>(null);
  const [demoQuotation, setDemoQuotation] = useState<QuotationNew | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationNew | null>(null);
  const [selectedMode, setSelectedMode] = useState("");
  const [draftBookingNumber, setDraftBookingNumber] = useState("");
  const [demoBooking, setDemoBooking] = useState<ForwardingBooking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<ForwardingBooking | null>(null);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [etaValue, setEtaValue] = useState("");
  const [demoInvoice, setDemoInvoice] = useState<DemoInvoice | null>(null);
  const [lastInteractionAt, setLastInteractionAt] = useState(() => Date.now());

  useDemoInteractionLock(step);

  const touch = useCallback(() => setLastInteractionAt(Date.now()), []);

  const resetDemo = useCallback(() => {
    setPage("dashboard");
    setInquiriesView("list");
    setQuotationsView("list");
    setForwardingView("list");
    setStep("dashboard-inquiries");
    setBuilderSnapshot(null);
    setDemoQuotation(null);
    setSelectedQuotation(null);
    setSelectedMode("");
    setDraftBookingNumber("");
    setDemoBooking(null);
    setSelectedBooking(null);
    setCreatePanelOpen(false);
    setEtaValue("");
    setDemoInvoice(null);
    setLastInteractionAt(Date.now());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() - lastInteractionAt > 60000) {
        resetDemo();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [lastInteractionAt, resetDemo]);

  useEffect(() => {
    const handle = () => setLastInteractionAt(Date.now());
    window.addEventListener("click", handle, true);
    window.addEventListener("keydown", handle, true);
    window.addEventListener("touchstart", handle, true);
    return () => {
      window.removeEventListener("click", handle, true);
      window.removeEventListener("keydown", handle, true);
      window.removeEventListener("touchstart", handle, true);
    };
  }, []);

  const quotations = useMemo(() => {
    return demoQuotation ? [demoQuotation] : [];
  }, [demoQuotation]);

  const currentQuotation = selectedQuotation || demoQuotation;
  const currentBooking = selectedBooking || demoBooking;

  const handleSidebarNavigate = useCallback((nextPage: DemoPage) => {
    touch();
    if (step === "dashboard-inquiries" && nextPage === "inquiries") {
      setPage("inquiries");
      setInquiriesView("list");
      setStep("inquiries-create");
      return;
    }
    if (step === "sidebar-quotations" && nextPage === "quotations") {
      setPage("quotations");
      setQuotationsView("list");
      setStep("quotations-row");
      return;
    }
    if (step === "sidebar-financials" && nextPage === "financials") {
      setPage("financials");
      setStep("financials-invoices");
      return;
    }
    if (nextPage === "dashboard") setPage("dashboard");
  }, [step, touch]);

  const handleCreateInquiry = useCallback(() => {
    touch();
    if (step !== "inquiries-create") return;
    setPage("inquiries");
    setInquiriesView("builder");
    setBuilderSnapshot(null);
    setStep("builder-movement");
  }, [step, touch]);

  const handleBuilderMovementInteract = useCallback(() => {
    touch();
    if (step === "builder-movement") setStep("builder-customer");
  }, [step, touch]);

  useEffect(() => {
    if (step === "builder-customer" && builderSnapshot?.customerId) setStep("builder-forwarding");
  }, [builderSnapshot?.customerId, step]);

  useEffect(() => {
    if (step === "builder-forwarding" && builderSnapshot?.selectedServices.includes("Forwarding")) setStep("builder-aodpod");
  }, [builderSnapshot?.selectedServices, step]);

  useEffect(() => {
    const handleCommitAdvance = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;

      const element = event.target instanceof HTMLElement ? event.target : null;
      if (!element) return;

      const targetId = element.closest<HTMLElement>("[data-demo-target]")?.dataset.demoTarget;
      if (step === "builder-aodpod" && targetId === TARGETS.builderAodPod && builderSnapshot?.forwardingData?.aodPod?.trim()) {
        event.preventDefault();
        touch();
        setStep("builder-generate");
      }

      if (step === "forwarding-eta" && targetId === TARGETS.forwardingEta && etaValue.trim()) {
        event.preventDefault();
        touch();
        setStep("forwarding-create");
      }
    };

    document.addEventListener("keydown", handleCommitAdvance, true);
    return () => document.removeEventListener("keydown", handleCommitAdvance, true);
  }, [builderSnapshot?.forwardingData?.aodPod, etaValue, step, touch]);

  // Auto-advance ETA step when a valid date is selected (date pickers don't fire Enter)
  useEffect(() => {
    if (step === "forwarding-eta" && etaValue.trim()) {
      touch();
      setStep("forwarding-create");
    }
  }, [etaValue]);

  const handleBuilderSave = useCallback((quotation: QuotationNew) => {
    touch();
    setDemoQuotation(quotation);
    setSelectedQuotation(quotation);
    setPage("inquiries");
    setInquiriesView("list");
    setStep("sidebar-quotations");
  }, [touch]);

  const handleOpenQuotation = useCallback((quotation: QuotationNew) => {
    touch();
    if (step !== "quotations-row") return;
    setSelectedQuotation(quotation);
    setPage("quotations");
    setQuotationsView("detail");
    setStep("quotation-mode");
  }, [step, touch]);

  const handleQuotationSnapshot = useCallback((snapshot: BuilderSnapshot) => {
    const nextMode = snapshot.forwardingData?.mode || "";
    setSelectedMode(nextMode);
    if (step === "quotation-mode" && nextMode) setStep("quotation-pdf");
  }, [step]);

  const handleQuotationViewModeChange = useCallback((mode: "form" | "pdf") => {
    touch();
    if (step === "quotation-pdf" && mode === "pdf") setStep("pdf-accept");
  }, [step, touch]);

  const handlePdfPrimaryAction = useCallback(() => {
    touch();
    if (step !== "pdf-accept") return;
    setDraftBookingNumber(`FWD-${Date.now().toString().slice(-6)}`);
    setPage("forwarding");
    setForwardingView("list");
    setCreatePanelOpen(true);
    setStep("forwarding-eta");
  }, [step, touch]);

  const handleDemoBookingCreated = useCallback((booking: ForwardingBooking) => {
    touch();
    setDemoBooking(booking);
    setSelectedBooking(booking);
    setCreatePanelOpen(false);
    setForwardingView("list");
    setStep("forwarding-row");
  }, [touch]);

  const handleOpenBooking = useCallback((booking: ForwardingBooking) => {
    touch();
    if (step !== "forwarding-row") return;
    setSelectedBooking(booking);
    setForwardingView("detail");
    setStep("forwarding-status");
  }, [step, touch]);

  const handleDemoStatusUpdate = useCallback((booking: ForwardingBooking, status: ForwardingBooking["status"]) => {
    touch();
    setDemoBooking(booking);
    setSelectedBooking(booking);
    if (step === "forwarding-status" && status === "Completed") {
      setDemoInvoice(buildDemoInvoice(demoQuotation, booking));
      setStep("sidebar-financials");
    }
  }, [demoQuotation, step, touch]);

  const handleFinancialsTabChange = useCallback((tab: "dashboard" | "billings" | "invoices" | "collections" | "expenses") => {
    touch();
    if (step === "financials-invoices" && tab === "invoices") {
      setStep("financials-invoice-row");
    }
  }, [step, touch]);

  const handleContinueFromInvoiceRow = useCallback(() => {
    touch();
    if (step !== "financials-invoice-row") return;
    setStep("financials-total-invoiced");
  }, [step, touch]);

  const forwardingPrefill = useMemo(() => {
    if (!demoQuotation) return undefined;
    return {
      bookingNumber: draftBookingNumber || `FWD-${Date.now().toString().slice(-6)}`,
      customerName: demoQuotation.customer_name || builderSnapshot?.customerName || "",
      movement: (builderSnapshot?.movement || demoQuotation.movement || "IMPORT") as "IMPORT" | "EXPORT",
      quotationReferenceNumber: demoQuotation.quote_number,
      aodPod: builderSnapshot?.forwardingData?.aodPod || demoQuotation.pod_aod || "",
      aolPol: demoQuotation.pol_aol || "",
      mode: (selectedMode || "FCL") as "FCL" | "LCL" | "AIR",
    };
  }, [builderSnapshot, demoQuotation, draftBookingNumber, selectedMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--neuron-bg-page)]">
      <aside className="flex w-[272px] flex-col border-r bg-white px-4 py-5" style={{ borderColor: "var(--neuron-ui-border)" }}>
        <div className="px-3 pb-6">
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0F766E]">Demo Mode</div>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[#12332B]">Neuron OS</h1>
          <p className="mt-1 text-[13px] leading-6 text-[#667085]">A guided forwarding walkthrough using the real product views.</p>
        </div>

        <nav className="flex-1 space-y-1.5">
          {[
            { id: "dashboard" as DemoPage, label: "Dashboard", icon: Home },
            { id: "inquiries" as DemoPage, label: "Inquiries", icon: ShoppingCart, target: TARGETS.sidebarInquiries },
            { id: "quotations" as DemoPage, label: "Quotations", icon: FileText, target: TARGETS.sidebarQuotations },
            { id: "forwarding" as DemoPage, label: "Forwarding", icon: Ship },
            { id: "financials" as DemoPage, label: "Financials", icon: CreditCard, target: TARGETS.sidebarFinancials },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSidebarNavigate(item.id)}
                data-demo-target={item.target}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all"
                style={{
                  backgroundColor: isActive ? "var(--neuron-state-selected)" : "transparent",
                  border: isActive ? "1.5px solid #5FC4A1" : "1.5px solid transparent",
                  color: isActive ? "var(--neuron-brand-green)" : "var(--neuron-ink-secondary)",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <Icon size={18} />
                <span className="text-[14px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--neuron-ui-border)" }}>
          <button type="button" data-demo-persistent-control="true" onClick={resetDemo} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-[#12332B] hover:bg-[#F8FBFB]">
            <RotateCcw size={16} />
            Restart Demo
          </button>
          <button type="button" data-demo-persistent-control="true" onClick={() => navigate("/")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-[#667085] hover:bg-[#F8FBFB]">
            <LogOut size={16} />
            Exit Demo
          </button>
        </div>
      </aside>

      <main className="relative flex-1 overflow-auto">
        {page === "dashboard" && <ExecutiveDashboard currentUser={DEMO_USER} />}

        {page === "inquiries" && inquiriesView === "list" && (
          <QuotationsListWithFilters
            onViewItem={() => {}}
            onCreateQuotation={handleCreateInquiry}
            quotations={quotations}
            isLoading={false}
            userDepartment="Business Development"
            createDirectType="project"
            createButtonTargetId={TARGETS.inquiriesCreate}
          />
        )}

        {page === "inquiries" && inquiriesView === "builder" && (
          <QuotationBuilderV3
            onClose={() => {
              touch();
              setInquiriesView("list");
            }}
            onSave={handleBuilderSave}
            builderMode="inquiry"
            initialQuotationType="project"
            primaryActionLabel="Generate Quote"
            demoCustomerOptions={DEMO_CUSTOMERS}
            onStateSnapshotChange={(snapshot) => setBuilderSnapshot(snapshot)}
            onMovementInteract={handleBuilderMovementInteract}
            demoTargetIds={{
              movement: TARGETS.builderMovement,
              customer: TARGETS.builderCustomer,
              forwardingService: TARGETS.builderForwarding,
              aodPod: TARGETS.builderAodPod,
              submit: TARGETS.builderSubmit,
            }}
          />
        )}

        {page === "quotations" && quotationsView === "list" && (
          <QuotationsListWithFilters
            onViewItem={handleOpenQuotation}
            onCreateQuotation={() => {}}
            quotations={quotations}
            isLoading={false}
            userDepartment="Pricing"
            highlightedQuotationId={demoQuotation?.id || null}
            rowTargetId={TARGETS.quotationRow}
          />
        )}

        {page === "quotations" && quotationsView === "detail" && currentQuotation && (
          <QuotationDetail
            key={currentQuotation.id}
            quotation={currentQuotation}
            onBack={() => {
              touch();
              setQuotationsView("list");
            }}
            onEdit={() => {}}
            userDepartment="Pricing"
            onUpdate={(updated) => {
              setSelectedQuotation(updated);
              setDemoQuotation((current) => (current?.id === updated.id ? updated : current));
            }}
            currentUser={DEMO_USER}
            onForwardingStateSnapshotChange={handleQuotationSnapshot}
            allowForwardingModeEditInViewMode={true}
            onViewModeChange={handleQuotationViewModeChange}
            pdfPrimaryActionLabel="Accept & Create Forwarding"
            onPdfPrimaryAction={handlePdfPrimaryAction}
            demoTargetIds={{
              forwardingMode: TARGETS.quotationMode,
              pdfToggleGroup: TARGETS.quotationPdfToggle,
              pdfView: TARGETS.quotationPdf,
              pdfPrimaryAction: TARGETS.pdfPrimaryAction,
            }}
          />
        )}

        {page === "forwarding" && forwardingView === "list" && (
          <ForwardingBookings
            onSelectBooking={handleOpenBooking}
            currentUser={DEMO_USER}
            demoMode={true}
            injectedBookings={demoBooking ? [demoBooking] : []}
            createModalOpen={createPanelOpen}
            onCreateModalOpenChange={setCreatePanelOpen}
            createPanelProps={{
              demoMode: true,
              demoPrefill: forwardingPrefill,
              onDemoFieldChange: ({ eta }) => setEtaValue(eta),
              demoTargetIds: { eta: TARGETS.forwardingEta, submit: TARGETS.forwardingSubmit },
            }}
            highlightedBookingId={demoBooking?.bookingId || null}
            rowTargetId={TARGETS.forwardingRow}
            onBookingCreated={handleDemoBookingCreated}
          />
        )}

        {page === "forwarding" && forwardingView === "detail" && currentBooking && (
          <ForwardingBookingDetails
            key={currentBooking.bookingId}
            booking={currentBooking}
            onBack={() => {
              touch();
              setForwardingView("list");
            }}
            onBookingUpdated={() => {}}
            currentUser={DEMO_USER}
            demoMode={true}
            onDemoStatusUpdate={handleDemoStatusUpdate}
            statusButtonProps={{
              "data-demo-target": TARGETS.forwardingStatus,
              "data-demo-interaction-group": TARGETS.forwardingStatus,
            }}
          />
        )}

        {page === "financials" && (
          <FinancialsModule
            key={demoInvoice?.id || "demo-financials"}
            demoMode={true}
            injectedInvoices={demoInvoice ? [demoInvoice] : []}
            initialTab={step === "financials-invoices" ? "dashboard" : "invoices"}
            initialScopePreset="this-week"
            onActiveTabChange={handleFinancialsTabChange}
            demoTargetIds={{
              invoicesTab: TARGETS.financialsInvoicesTab,
              invoiceRow: TARGETS.financialsInvoiceRow,
              totalInvoicedCard: TARGETS.financialsTotalInvoiced,
            }}
          />
        )}
      </main>

      <DemoOverlay
        step={step}
        page={page}
        invoice={demoInvoice}
        onContinueFromInvoiceRow={handleContinueFromInvoiceRow}
        onRestart={resetDemo}
        onExit={() => navigate("/")}
      />
    </div>
  );
}
