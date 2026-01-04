// frontend/src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasModule: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // ✅ Previne múltiplas chamadas simultâneas
  const isCheckingAuth = useRef(false);
  const hasCheckedAuth = useRef(false);

  // Verifica se usuário está autenticado ao carregar
  useEffect(() => {
    // ✅ Só executa UMA vez
    if (!hasCheckedAuth.current) {
      checkAuth();
    }
  }, []); // ⚠️ Array vazio - executa apenas no mount

  const checkAuth = async () => {
    // ✅ Previne chamadas simultâneas
    if (isCheckingAuth.current) {
      console.log('🔒 checkAuth já está em execução, ignorando...');
      return;
    }

    isCheckingAuth.current = true;
    hasCheckedAuth.current = true;

    try {
      console.log('🔍 Verificando autenticação...');

      // ✅ Chama a rota API local que encaminha cookies ao backend
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Importante para enviar cookies
      });

      if (!response.ok) {
        console.log('❌ Não autenticado');
        setUser(null);
        return;
      }

      const userData = await response.json();
      console.log('✅ Usuário autenticado:', userData.username);
      setUser(userData);
    } catch (error: any) {
      console.log('❌ Erro ao verificar autenticação:', error.message);
      setUser(null);
    } finally {
      setLoading(false);
      isCheckingAuth.current = false;
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log('🔐 Tentando fazer login...');

      // ✅ Chama a rota API local que define cookies HttpOnly
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Importante para receber cookies
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      console.log('✅ Login bem-sucedido, cookies definidos');

      // ✅ Recarrega dados do usuário após login bem-sucedido
      isCheckingAuth.current = false; // Reset para permitir nova verificação
      hasCheckedAuth.current = false;
      await checkAuth();

      console.log('✅ Login realizado com sucesso!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      throw new Error(error.message || 'Erro ao fazer login');
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Fazendo logout...');

      // ✅ Chama a rota API local que limpa cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Importante para enviar cookies
      });

      console.log('✅ Logout realizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
    } finally {
      setUser(null);
      hasCheckedAuth.current = false; // Reset para permitir nova verificação
      router.push('/login');
    }
  };

  const hasModule = (module: string): boolean => {
    return user?.profile?.modules_enabled?.includes(module) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasModule }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}