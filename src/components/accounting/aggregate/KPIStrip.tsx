/**
 * KPIStrip — Renders up to 4 metric cards in a horizontal row.
 *
 * Uses the shared NeuronKPICard component (same design as Contacts & Customers).
 */

import { NeuronKPICard } from "../../ui/NeuronKPICard";
import type { KPICard } from "./types";

interface KPIStripProps {
  cards: KPICard[];
  isLoading?: boolean;
  cardTargetIds?: Record<string, string | undefined>;
}

export function KPIStrip({ cards, isLoading, cardTargetIds }: KPIStripProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl p-5 animate-pulse"
            style={{
              border: "1.5px solid var(--neuron-ui-border)",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="h-9 w-9 bg-gray-200 rounded-lg" />
              <div className="h-4 w-10 bg-gray-100 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-7 w-28 bg-gray-200 rounded" />
              <div className="h-1.5 w-full bg-gray-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          data-demo-target={cardTargetIds?.[card.label]}
          data-demo-highlight-target={cardTargetIds?.[card.label]}
        >
          <NeuronKPICard
            icon={card.icon}
            label={card.label}
            value={card.value}
            detail={card.subtext}
            severity={card.severity}
          />
        </div>
      ))}
    </div>
  );
}
