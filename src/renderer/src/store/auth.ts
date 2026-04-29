import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@shared/types'

interface AuthState {
  user: User | null
  loggedInAt: string | null
  login: (user: User) => void
  logout: () => void
  isAdmin: () => boolean
  isManager: () => boolean
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loggedInAt: null,
      login: (user) => set({ user, loggedInAt: new Date().toISOString() }),
      logout: () => set({ user: null, loggedInAt: null }),
      isAdmin: () => get().user?.role === 'admin',
      isManager: () => {
        const r = get().user?.role
        return r === 'manager' || r === 'admin'
      },
    }),
    { name: 'idf-auth' },
  ),
)
