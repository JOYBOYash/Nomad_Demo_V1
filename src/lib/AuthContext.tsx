import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { db } from './db';

interface AuthContextType {
  user: User | null;
  login: (email: string, name: string, avatarUrl?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('nomad_auth_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email: string, name: string, avatarUrl?: string) => {
    const dbUser = await db.loginOrCreateUser(email, name, avatarUrl);
    setUser(dbUser);
    localStorage.setItem('nomad_auth_user', JSON.stringify(dbUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nomad_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
