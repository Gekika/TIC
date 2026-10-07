import { createContext, type PropsWithChildren, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientSignup, login as loginRequest, logout as logoutRequest, type ClientSignupPayload } from "../../modules/auth/api/auth.api";
import type { RoleCode, User } from "../../shared/types/api.types";

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  signupClient: (payload: ClientSignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  landingPath: (roles: RoleCode[]) => string;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const USER_STORAGE_KEY = "tic_current_user";
const TOKEN_STORAGE_KEY = "tic_access_token";

export function AuthProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const stored = window.localStorage.getItem(USER_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => window.localStorage.getItem(TOKEN_STORAGE_KEY));

  const value = useMemo<AuthContextValue>(() => {
    const landingPath = (roles: RoleCode[]) => {
      if (roles.includes("SYSTEM_ADMIN") || roles.includes("ORG_ADMIN") || roles.includes("SUPERVISOR") || roles.includes("INSPECTOR")) return "/dashboard";
      return "/client/dashboard";
    };

    return {
      user,
      accessToken,
      landingPath,
      login: async (email, password) => {
        const result = await loginRequest({ email, password });
        window.localStorage.setItem(TOKEN_STORAGE_KEY, result.accessToken);
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
        setAccessToken(result.accessToken);
        setUser(result.user);
        navigate(landingPath(result.user.roles), { replace: true });
      },
      signupClient: async (payload) => {
        const result = await clientSignup(payload);
        window.localStorage.setItem(TOKEN_STORAGE_KEY, result.accessToken);
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
        setAccessToken(result.accessToken);
        setUser(result.user);
        navigate("/client/dashboard", { replace: true });
      },
      logout: async () => {
        try {
          await logoutRequest();
        } finally {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          window.localStorage.removeItem(USER_STORAGE_KEY);
          setAccessToken(null);
          setUser(null);
          navigate("/login", { replace: true });
        }
      }
    };
  }, [accessToken, navigate, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
