// frontend/src/hooks/useDelete.ts
import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface UseDeleteOptions {
  onSuccess?: () => void | Promise<void>;
  confirmMessage?: (name: string) => string;
  successMessage?: string;
  errorMessage?: string;
}

export function useDelete<T extends { id: number }>(
  deleteFunction: (id: number) => Promise<void>,
  options: UseDeleteOptions = {}
) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  const {
    onSuccess,
    confirmMessage = (name) => 
      `Deseja realmente excluir "${name}"?\n\nEsta ação não pode ser desfeita.`,
    successMessage = 'Item excluído com sucesso!',
    errorMessage = 'Erro ao excluir item',
  } = options;

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(confirmMessage(name))) {
      return;
    }

    setDeleting(true);

    try {
      await deleteFunction(id);
      toast.success(successMessage);
      
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err: any) {
      const msg = err.message || errorMessage;
      toast.error(msg);
      // Scroll para o topo para mostrar o erro
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setDeleting(false);
    }
  };

  return { handleDelete, deleting };
}
