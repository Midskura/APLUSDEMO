import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase/client";
import { toast } from "../components/ui/toast-utils";
import type { EVoucher, EVoucherStatus, EVoucherTransactionType, EVoucherSourceModule } from "../types/evoucher";
import { useCachedFetch, useInvalidateCache } from "./useNeuronCache";

type EVoucherView = "pending" | "my-evouchers" | "all";

export function useEVouchers(view: EVoucherView, userId?: string) {
  const invalidateCache = useInvalidateCache();

  const refresh = useCallback(() => {
    invalidateCache("evouchers");
  }, [invalidateCache]);

  // Build cache key based on view + userId so different views cache independently
  const cacheKey = view === "my-evouchers" && userId 
    ? `evouchers-${view}-${userId}`
    : `evouchers-${view}`;

  const fetcher = useCallback(async (): Promise<EVoucher[]> => {
    let query = supabase.from('evouchers').select('*').order('created_at', { ascending: false });
    
    if (view === "pending") {
      query = query.in('status', ['pending', 'Pending']);
    } else if (view === "my-evouchers" && userId) {
      query = query.eq('created_by', userId);
    } else if (view === "my-evouchers" && !userId) {
      return [];
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch ${view} e-vouchers: ${error.message}`);
    
    let evouchers: EVoucher[] = data || [];

    // NEURON-DRY-2411: E-Vouchers Module is now strictly "Money Out".
    return evouchers.filter(item => 
      item.transaction_type !== "collection" && 
      item.transaction_type !== "billing"
    );
  }, [view, userId]);

  const { data: evouchers, isLoading } = useCachedFetch<EVoucher[]>(
    cacheKey,
    fetcher,
    [],
    { deps: [view, userId] }
  );

  return {
    evouchers,
    isLoading,
    refresh
  };
}
