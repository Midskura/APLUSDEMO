import { ArrowLeft } from "lucide-react";
import type { QuotationNew } from "../../types/pricing";
import { QuotationFileView } from "./QuotationFileView";

interface QuotationDetailProps {
  quotation: QuotationNew;
  onBack: () => void;
  onEdit: () => void;
  userDepartment?: "Business Development" | "Pricing";
  onAcceptQuotation?: (quotation: QuotationNew) => void;
  onUpdate?: (quotation: QuotationNew) => void;
  onDuplicate?: (quotation: QuotationNew) => void;
  onDelete?: () => void;
  onCreateTicket?: (quotation: QuotationNew) => void;
  onConvertToProject?: (projectId: string) => void;
  onConvertToContract?: (quotationId: string) => void;
  currentUser?: { id: string; name: string; email: string; department: string } | null;
  onForwardingStateSnapshotChange?: (snapshot: any) => void;
  allowForwardingModeEditInViewMode?: boolean;
  onViewModeChange?: (mode: "form" | "pdf") => void;
  pdfPrimaryActionLabel?: string;
  onPdfPrimaryAction?: () => void;
  demoTargetIds?: {
    forwardingMode?: string;
    pdfToggleGroup?: string;
    pdfView?: string;
    pdfPrimaryAction?: string;
  };
}

export function QuotationDetail({
  quotation,
  onBack,
  onEdit,
  userDepartment,
  onAcceptQuotation,
  onUpdate,
  onDuplicate,
  onDelete,
  onCreateTicket,
  onConvertToProject,
  onConvertToContract,
  currentUser,
  onForwardingStateSnapshotChange,
  allowForwardingModeEditInViewMode = false,
  onViewModeChange,
  pdfPrimaryActionLabel,
  onPdfPrimaryAction,
  demoTargetIds,
}: QuotationDetailProps) {
  const handleUpdate = (updatedQuotation: QuotationNew) => {
    if (onUpdate) {
      onUpdate(updatedQuotation);
    }
  };

  return (
    <QuotationFileView 
      quotation={quotation} 
      onBack={onBack} 
      onEdit={onEdit} 
      userDepartment={userDepartment} 
      onAcceptQuotation={onAcceptQuotation}
      onUpdate={handleUpdate}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onCreateTicket={onCreateTicket}
      onConvertToProject={onConvertToProject}
      onConvertToContract={onConvertToContract}
      currentUser={currentUser}
      onForwardingStateSnapshotChange={onForwardingStateSnapshotChange}
      allowForwardingModeEditInViewMode={allowForwardingModeEditInViewMode}
      onViewModeChange={onViewModeChange}
      pdfPrimaryActionLabel={pdfPrimaryActionLabel}
      onPdfPrimaryAction={onPdfPrimaryAction}
      demoTargetIds={demoTargetIds}
    />
  );
}
