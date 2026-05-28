import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { db } from './db';

interface AuthContextType {
  user: User | null;
  persistedUser: User | null;
  login: (email: string, name: string, avatarUrl?: string) => Promise<void>;
  confirmPersistedLogin: () => void;
  clearPersistedLogin: () => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [persistedUser, setPersistedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('nomad_auth_user');
    const sessionActive = sessionStorage.getItem('nomad_session_active');

    if (stored) {
      if (sessionActive) {
        setUser(JSON.parse(stored));
      } else {
        setPersistedUser(JSON.parse(stored));
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, name: string, avatarUrl?: string) => {
    const dbUser = await db.loginOrCreateUser(email, name, avatarUrl);
    setUser(dbUser);
    localStorage.setItem('nomad_auth_user', JSON.stringify(dbUser));
    sessionStorage.setItem('nomad_session_active', '1');
  };

  const confirmPersistedLogin = () => {
    if (persistedUser) {
      setUser(persistedUser);
      sessionStorage.setItem('nomad_session_active', '1');
    }
  };

  const clearPersistedLogin = () => {
    setPersistedUser(null);
    localStorage.removeItem('nomad_auth_user');
  };

  const logout = () => {
    setUser(null);
    setPersistedUser(null);
    localStorage.removeItem('nomad_auth_user');
    sessionStorage.removeItem('nomad_session_active');
  };

  return (
    <AuthContext.Provider value={{ user, persistedUser, login, confirmPersistedLogin, clearPersistedLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
