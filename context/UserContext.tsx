'use client';
import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { getCurrentUser, type User } from '@/services/auth';
type UserContextValue = { user: User | null; setUser: Dispatch<SetStateAction<User | null>>; loading: boolean; isAuthenticated: boolean };
const UserContext = createContext<UserContextValue | null>(null);
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; getCurrentUser().then(current => { if (active) setUser(current); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return <UserContext.Provider value={{ user, setUser, loading, isAuthenticated: Boolean(user?.id) }}>{children}</UserContext.Provider>;
}
export function useUser() { const context = useContext(UserContext); if (!context) throw new Error('useUser must be used inside UserProvider'); return context; }
