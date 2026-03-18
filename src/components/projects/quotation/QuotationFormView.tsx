import { QuotationBuilderV3 } from "../../pricing/quotations/QuotationBuilderV3";
import type { Project, QuotationNew } from "../../../types/pricing";

interface QuotationFormViewProps {
  project: Project;
  onSave?: (data: any) => Promise<void>;
  onAmend?: () => void;
  onStateSnapshotChange?: (snapshot: any) => void;
  allowForwardingModeEditInViewMode?: boolean;
  demoTargetIds?: {
    forwardingMode?: string;
  };
}

export function QuotationFormView({
  project,
  onSave,
  onAmend,
  onStateSnapshotChange,
  allowForwardingModeEditInViewMode = false,
  demoTargetIds,
}: QuotationFormViewProps) {
  // Construct initialData from project to match QuotationBuilder format
  const initialData: Partial<QuotationNew> = {
      ...project.quotation,
      id: project.quotation?.id || project.quotation_id,
      quote_number: project.quotation?.quote_number || project.quotation_number,
      customer_id: project.quotation?.customer_id || project.customer_id,
      customer_name: project.quotation?.customer_name || project.customer_name,
      contact_person_id: project.quotation?.contact_person_id || project.contact_person_id,
      contact_person_name: project.quotation?.contact_person_name || project.contact_person_name,
      movement: project.quotation?.movement || project.movement,
      services: project.quotation?.services || project.services,
      services_metadata: project.quotation?.services_metadata || project.services_metadata,
      charge_categories: project.quotation?.charge_categories || project.charge_categories,
      currency: project.quotation?.currency || project.currency,
      
      // Buying and Selling price
      buying_price: project.quotation?.buying_price,
      selling_price: project.quotation?.selling_price,

      // CRITICAL: Explicitly remove project_id to prevent "Locked" mode
      // We want to show the form as if it's the builder, but read-only via viewMode
      project_id: undefined,
      project_number: undefined,
  };

  // Generate a unique key to force remount/update when data changes
  // This supports the Optimistic UI updates
  const key = `view-${project.id}-${project.updated_at}-${project.customer_name}-${(project.services || []).join(',')}`;

  return (
    <div style={{ margin: "-32px -48px" }}> 
      {/* Negative margin to counteract parent padding since Builder has its own padding */}
      <QuotationBuilderV3
          key={key}
          mode="edit" 
          initialData={initialData}
          onClose={() => {}}
          onSave={async (data) => { if (onSave) await onSave(data); }}
          builderMode="quotation"
          viewMode={true} 
          hideHeader={true} 
          onAmend={onAmend}
          onStateSnapshotChange={onStateSnapshotChange}
          allowForwardingModeEditInViewMode={allowForwardingModeEditInViewMode}
          demoTargetIds={{ forwardingMode: demoTargetIds?.forwardingMode }}
      />
    </div>
  );
}
