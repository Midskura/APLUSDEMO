import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Printer, Save, ZoomIn, ZoomOut, Maximize, User, Layout, FileText } from "lucide-react";
import type { Project } from "../../../../types/pricing";
import { QuotationDocument } from "../QuotationDocument";
import { useQuotationDocumentState } from "./useQuotationDocumentState";
import { SignatoryControl } from "./controls/SignatoryControl";
import { DisplayOptionsControl } from "./controls/DisplayOptionsControl";
import { NotesControl } from "./controls/NotesControl";
import { CollapsibleSection } from "./controls/CollapsibleSection";

interface QuotationPDFScreenProps {
  project: Project;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  currentUser?: { name: string; email: string; } | null;
  isEmbedded?: boolean;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

// A4 Dimensions in pixels at 96 DPI
const A4_WIDTH_PX = 794; // 210mm
const A4_HEIGHT_PX = 1123; // 297mm

export function QuotationPDFScreen({
  project,
  onClose,
  onSave,
  currentUser,
  isEmbedded = false,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionButtonProps,
}: QuotationPDFScreenProps) {
  const { options, updateSignatory, toggleDisplay, setCustomNotes } = useQuotationDocumentState(project, currentUser);
  const [isSaving, setIsSaving] = useState(false);
  const [scale, setScale] = useState(0.85);
  const [autoScale, setAutoScale] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scale logic
  useEffect(() => {
    if (!autoScale || !containerRef.current) return;

    const calculateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      // Target margins
      const xMargin = 64; // 32px each side
      const yMargin = 120; // Increased to account for floating controls
      
      const availableWidth = clientWidth - xMargin;
      const availableHeight = clientHeight - yMargin;
      
      // Calculate fit scales
      const scaleX = availableWidth / A4_WIDTH_PX;
      const scaleY = availableHeight / A4_HEIGHT_PX;
      
      // Choose the smaller scale to ensure it fits, but don't go too small
      const fitScale = Math.min(scaleX, scaleY);
      
      // Clamp
      const finalScale = Math.max(0.4, Math.min(fitScale, 1.1));
      
      setScale(finalScale);
    };

    const observer = new ResizeObserver(calculateScale);
    observer.observe(containerRef.current);
    
    // Initial calculation
    calculateScale();

    return () => observer.disconnect();
  }, [autoScale]);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await onSave({
            prepared_by: options.signatories.prepared_by.name,
            prepared_by_title: options.signatories.prepared_by.title,
            approved_by: options.signatories.approved_by.name,
            // approved_by_title: options.signatories.approved_by.title, // Not supported by DB schema yet
            notes: options.custom_notes
        });
    } finally {
        setIsSaving(false);
    }
  };

  const zoomIn = () => {
    setAutoScale(false);
    setScale(prev => Math.min(prev + 0.1, 1.5));
  };

  const zoomOut = () => {
    setAutoScale(false);
    setScale(prev => Math.max(prev - 0.1, 0.4));
  };
  
  const toggleFit = () => {
    setAutoScale(true); // Will trigger useEffect to recalculate
  };

  return (
    <div className={`flex flex-col h-full w-full bg-[#F3F4F6] overflow-hidden ${isEmbedded ? 'rounded-lg border border-gray-200' : ''}`}>
      {/* Header - Styled like a Module Header - Only show if not embedded */}
      {!isEmbedded && (
        <div className="h-16 bg-white border-b border-[#E5E9F0] px-6 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-4">
            <button 
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#12332B] transition-all"
                title="Close Studio"
            >
                <ArrowLeft size={20} />
            </button>
            
            <div>
                <h2 className="text-xl font-bold text-[#12332B] tracking-tight">Quotation PDF Studio</h2>
            </div>
            </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: Live Preview Stage */}
        <div 
            ref={containerRef}
            className="flex-1 bg-gray-50 overflow-hidden flex items-center justify-center relative p-8"
        >
            {/* Scrollable Area */}
            <div className="absolute inset-0 overflow-auto flex items-center justify-center p-8 pb-32">
                {/* Print Portal Scope */}
                <div className="print-portal-root flex flex-col items-center">
                    {/* The Wrapper */}
                    <div 
                        style={{ 
                            width: A4_WIDTH_PX * scale,
                            height: A4_HEIGHT_PX * scale,
                            transition: 'width 0.2s, height 0.2s',
                            position: 'relative'
                        }}
                    >
                        {/* The "Paper" Container */}
                        <div 
                            className="bg-white origin-top-left" 
                            style={{ 
                                width: '210mm', 
                                minHeight: '297mm',
                                transform: `scale(${scale})`,
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                // Stronger, layered shadow for "floating on desk" effect
                                boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.02)' 
                            }}
                        >
                            <QuotationDocument 
                                project={project} 
                                mode="preview" 
                                currentUser={currentUser} 
                                options={options}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Zoom Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-4 z-30 transition-all hover:bg-white hover:shadow-xl">
                 <button onClick={zoomOut} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-all" title="Zoom Out">
                    <ZoomOut size={18} />
                 </button>
                 <span className="text-sm font-medium text-gray-700 w-12 text-center select-none tabular-nums">{Math.round(scale * 100)}%</span>
                 <button onClick={zoomIn} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-all" title="Zoom In">
                    <ZoomIn size={18} />
                 </button>
                 <div className="w-px h-4 bg-gray-300" />
                 <button 
                    onClick={toggleFit} 
                    className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium transition-all ${autoScale ? 'text-[#0F766E] bg-[#F0FDFA]' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Fit to Screen"
                 >
                    <Maximize size={16} />
                    <span>Fit</span>
                 </button>
            </div>
        </div>

        {/* RIGHT: Document Controls Sidebar */}
        <div className="w-[360px] bg-white border-l border-[#E5E9F0] flex flex-col overflow-hidden shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
            
            {/* Scrollable Content (No padding on container to allow full-width headers) */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <CollapsibleSection title="Signatories" icon={<User size={18} />} defaultOpen={true}>
                    <SignatoryControl 
                        preparedBy={options.signatories.prepared_by}
                        approvedBy={options.signatories.approved_by}
                        onUpdate={updateSignatory}
                    />
                </CollapsibleSection>
                
                <CollapsibleSection title="Display Options" icon={<Layout size={18} />} defaultOpen={true}>
                    <DisplayOptionsControl 
                        options={options.display}
                        onToggle={toggleDisplay}
                    />
                </CollapsibleSection>

                <CollapsibleSection title="Custom Notes" icon={<FileText size={18} />} defaultOpen={false}>
                    <NotesControl 
                        value={options.custom_notes || ""}
                        onChange={setCustomNotes}
                    />
                </CollapsibleSection>
            </div>

            {/* Sidebar Footer - Actions */}
            <div className="p-6 border-t border-[#E5E9F0] bg-white shrink-0 flex flex-col gap-3 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.02)] z-30">
                 <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-bold text-[#12332B] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isSaving ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  
                  <button 
                    onClick={onPrimaryAction || handlePrint}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-bold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D625D] hover:shadow-md transition-all shadow-sm"
                    {...primaryActionButtonProps}
                  >
                    <Printer size={18} />
                    {primaryActionLabel || "Print PDF"}
                  </button>
            </div>
        </div>
      </div>

      {/* Hidden Print Style Setup */}
      <style>
        {`
          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0 !important; padding: 0 !important; background: white !important; }
            /* Hide the main app root */
            #root, .app-root, body > div:not(.print-portal-container) { display: none !important; }
            
            /* Ensure portal is visible and takes over */
            .print-portal-container { 
                display: block !important; 
                position: absolute; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%; 
                z-index: 9999; 
                background: white;
            }
          }
        `}
      </style>

      {/* Actual Print Container (Teleported to Body) */}
      {createPortal(
        <div className="print-portal-container hidden">
           <QuotationDocument 
              project={project} 
              mode="print" 
              currentUser={currentUser} 
              options={options}
           />
        </div>,
        document.body
      )}
    </div>
  );
}
