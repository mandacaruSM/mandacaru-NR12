// frontend/src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, User } from '@/lib/api';

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

      // Timeout de 10 segundos para evitar travamento
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout na verificação de autenticação (60s)')), 60000)
      );

      const userData = await Promise.race([
        authApi.me(),
        timeoutPromise
      ]) as User;

      console.log('✅ Usuário autenticado:', userData.username);
      setUser(userData);
    } catch (error: any) {
      console.log('❌ Não autenticado:', error.message);
      setUser(null);
    } finally {
      setLoading(false);
      isCheckingAuth.current = false;
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log('🔐 Tentando fazer login...');
      await authApi.login({ username, password });
      
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
      await authApi.logout();
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