import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getCurrentUser, login as requestLogin } from "../services/authService.js";
import { AUTH_TOKEN_KEY, AUTH_UNAUTHORIZED_EVENT } from "../services/api.js";

const AUTH_USER_KEY = "medpage.authUser";
const AuthContext = createContext(null);

function readStoredUser() {
  const storedUser = window.localStorage.getItem(AUTH_USER_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [isInitializing, setIsInitializing] = useState(Boolean(token));

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsInitializing(false);
      return undefined;
    }

    let isCurrent = true;
    setIsInitializing(true);
    getCurrentUser()
      .then((currentUser) => {
        if (!isCurrent) return;
        window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => {
        if (isCurrent) clearSession();
      })
      .finally(() => {
        if (isCurrent) setIsInitializing(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [clearSession, token]);

  useEffect(() => {
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, clearSession);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, clearSession);
  }, [clearSession]);

  const login = useCallback(async ({ username, password }) => {
    const authData = await requestLogin(username, password);
    window.localStorage.setItem(AUTH_TOKEN_KEY, authData.access_token);
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authData.user));
    setToken(authData.access_token);
    setUser(authData.user);
    return authData.user;
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      isInitializing,
      login,
      logout: clearSession,
      token,
      user,
    }),
    [clearSession, isInitializing, login, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
