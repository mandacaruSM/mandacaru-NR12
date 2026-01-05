// frontend/src/hooks/useList.ts - Hook para listagem com filtros
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface UseListOptions<T, F> {
  listFunction: (filters?: F) => Promise<{ results: T[]; count: number }>;
  initialFilters?: F;
}

export function useList<T, F = any>({ 
  listFunction, 
  initialFilters 
}: UseListOptions<T, F>) {
  const toast = useToast();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<F | undefined>(initialFilters);

  const loadItems = useCallback(async (customFilters?: F) => {
    try {
      setLoading(true);
      setError('');
      const response = await listFunction(customFilters || filters);
      setItems(response.results);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao carregar dados';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [listFunction, filters, toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const refresh = () => loadItems(filters);
  
  const updateFilters = (newFilters: F) => {
    setFilters(newFilters);
    loadItems(newFilters);
  };

  return {
    items,
    loading,
    error,
    filters,
    updateFilters,
    refresh,
  };
}
