import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '../api/auth';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('xeno_token');
    localStorage.removeItem('xeno_tenant_id');
    setToken(null);
    setUser(null);
  }, []);

  // On mount, if we have a token, try to fetch the user profile
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi.me()
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, logout]);

  const login = async (email: string, password: string) => {
    // Step 1: Resolve tenant ID if not already stored
    let tenantId = localStorage.getItem('xeno_tenant_id');
    if (!tenantId) {
      const tenantsRes = await authApi.getTenants();
      const tenants = tenantsRes.data;
      const tenantList = Array.isArray(tenants) ? tenants : [];
      if (tenantList.length === 0) {
        throw new Error('No tenants available');
      }
      tenantId = tenantList[0].id;
      localStorage.setItem('xeno_tenant_id', tenantId);
    }

    // Step 2: Login with tenant header (now set in localStorage, interceptor picks it up)
    const res = await authApi.login({ email, password });
    const data = res.data as any;

    const accessToken = data.accessToken || data.access_token;
    const userData = data.user;

    // Update tenant ID from login response if available
    if (userData?.tenantId) {
      localStorage.setItem('xeno_tenant_id', userData.tenantId);
    }

    if (accessToken) {
      setToken(accessToken);
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        tenantId: localStorage.getItem('xeno_tenant_id'),
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
