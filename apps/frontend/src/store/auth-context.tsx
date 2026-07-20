/**
 * Auth Context
 *
 * Global authentication state — user info, login, register, logout,
 * and onboarding completion tracking.
 * Connects to backend API via Axios.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import api from '../lib/axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
  preferredLanguage: string;
  organizationId?: string;
  organizationName?: string;
  onboardingCompleted?: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gender: string;
  organizationId?: string;
  role?: string;
  preferredLanguage?: string;
}

// ---------------------------------------------------------------------------
// Normalize user data
// ---------------------------------------------------------------------------

function normalizeUser(raw: any): User {
  let orgId: string | undefined;

  if (typeof raw.organizationId === 'object' && raw.organizationId !== null) {
    orgId = (raw.organizationId._id || raw.organizationId).toString();
  } else if (raw.organizationId) {
    orgId = String(raw.organizationId);
  }

  return {
    id: raw.id || raw._id,
    email: raw.email,
    role: raw.role,
    isVerified: raw.isVerified,
    preferredLanguage: raw.preferredLanguage || 'en',
    organizationId: orgId,
    organizationName:
      raw.organizationName ||
      (typeof raw.organizationId === 'object' && raw.organizationId?.name) ||
      undefined,
    onboardingCompleted: raw.onboardingCompleted ?? true, // legacy: users without field see dashboard directly
  };
}

function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  const keysToClear = [
    'accessToken',
    'tenant',
    'tenantSlug',
    'selectedTenant',
    'activeTenant',
  ];
  keysToClear.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(normalizeUser(data.data?.user));
      } catch {
        clearAuthStorage();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });

      if (data.success) {
        clearAuthStorage();
        const accessToken = data.data?.accessToken;
        const userData = data.data?.user;
        localStorage.setItem('accessToken', accessToken);
        const normalized = normalizeUser(userData);
        setUser(normalized);
        return normalized;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Login failed. Please try again.';
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async (formData: RegisterData) => {
    setError(null);
    try {
      const { data } = await api.post('/auth/register', {
        ...formData,
        role: formData.role || 'student',
        preferredLanguage: formData.preferredLanguage || 'en',
      });

      if (data.success) {
        clearAuthStorage();
        const accessToken = data.data?.accessToken;
        localStorage.setItem('accessToken', accessToken);
        setUser(normalizeUser(data.data?.user));
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    clearAuthStorage();
    setUser(null);
    api.post('/auth/logout').catch(() => {});
    window.location.href = '/auth/login';
  }, []);

  const completeOnboarding = useCallback(async () => {
    // Optimistic update regardless of response shape/outcome — the caller
    // (OnboardingWizard) dismisses the wizard right after this resolves, and
    // if local state didn't flip here, the dashboard's onboardingCompleted
    // check would re-show the wizard on the next mount, trapping the
    // student in a repeating loop. Server sync is still attempted below;
    // a failure here just means the flag re-syncs incorrectly on next
    // login, which is far less harmful than the loop.
    setUser(prev => prev ? { ...prev, onboardingCompleted: true } : null);
    try {
      await api.patch('/auth/me/onboarding-complete');
    } catch (err: any) {
      console.warn('Failed to mark onboarding complete:', err.message);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    completeOnboarding,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;