import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserSession } from '@freight-payroll/shared'

interface AuthState {
  user: UserSession | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  activeCompanyId: string | null

  setAuth: (user: UserSession, tokens: { accessToken: string; refreshToken: string }) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setActiveCompany: (companyId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      activeCompanyId: null,

      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          // Auto-select the first company
          activeCompanyId:
            get().activeCompanyId ?? user.companyAccess[0]?.companyId ?? null,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setActiveCompany: (companyId) =>
        set({ activeCompanyId: companyId }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          activeCompanyId: null,
        }),
    }),
    {
      name: 'freight-payroll-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        activeCompanyId: state.activeCompanyId,
      }),
    },
  ),
)
