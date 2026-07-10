import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import * as authApi from "../lib/auth";

interface AuthContextValue {
  user: authApi.AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On load, check whether a previously stored token still works, so a
    // refresh doesn't bounce a logged-in user back to the login page.
    authApi.fetchCurrentUser()
      .then((u) => {
        setUser(u);
      })
      .catch((err) => {
        console.error("Auth initialization failed:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function login(email: string, password: string) {
    const u = await authApi.login(email, password);
    setUser(u);
  }

  async function signup(name: string, email: string, password: string) {
    const u = await authApi.signup(name, email, password);
    setUser(u);
  }

  function logout() {
    authApi.clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
