import React, { createContext, useEffect, useState, ReactNode } from "react";
import API from "../api";

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      setToken(t);
      API.defaults.headers.common.Authorization = `Bearer ${t}`;
    }
  }, []);

  const login = (t: string) => {
    localStorage.setItem("token", t);
    setToken(t);
    API.defaults.headers.common.Authorization = `Bearer ${t}`;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    delete API.defaults.headers.common.Authorization;
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
