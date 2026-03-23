/**
 * AuthContext — JWT-based authentication with multi-store support
 * Handles: login, logout, role (Admin/Staff), store selection
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "sonner";
import axios from "axios";

export type UserRole = "Admin" | "Staff";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  store_id: string | null;
  avatar?: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  stores: Store[];
  selectedStoreId: string | null;
  setSelectedStoreId: (storeId: string | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (
    name: string,
    email: string,
    password: string,
    role?: UserRole,
    store_id?: string
  ) => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("pos_token");
    const storedUser = localStorage.getItem("pos_user");
    const storedStoreId = localStorage.getItem("pos_selected_store");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedStoreId) {
          setSelectedStoreId(storedStoreId);
        }
      } catch {
        localStorage.removeItem("pos_token");
        localStorage.removeItem("pos_user");
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === "Admin") {
      axios
        .get("/api/stores")
        .then(res => {
          setStores(res.data);
        })
        .catch(() => {
          console.error("Failed to fetch stores");
        });
    }
  }, [user]);

  useEffect(() => {
    if (selectedStoreId) {
      localStorage.setItem("pos_selected_store", selectedStoreId);
    } else {
      localStorage.removeItem("pos_selected_store");
    }
  }, [selectedStoreId]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        const response = await axios.post("/api/auth/login", {
          email,
          password,
        });
        const { token: newToken, user: userData } = response.data;
        setUser(userData);
        setToken(newToken);
        localStorage.setItem("pos_token", newToken);
        localStorage.setItem("pos_user", JSON.stringify(userData));

        if (userData.role === "Admin") {
          try {
            const storesRes = await axios.get("/api/stores");
            setStores(Array.isArray(storesRes.data) ? storesRes.data : []);
            if (
              Array.isArray(storesRes.data) &&
              storesRes.data.length > 0 &&
              !selectedStoreId
            ) {
              setSelectedStoreId(storesRes.data[0].id);
            }
          } catch {
            setStores([]);
          }
        } else if (userData.store_id) {
          setSelectedStoreId(userData.store_id);
        }

        toast.success(`Welcome back, ${userData.name}!`);
        setIsLoading(false);
        return true;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        toast.error(err.response?.data?.error || "Login failed");
        setIsLoading(false);
        return false;
      }
    },
    [selectedStoreId]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role?: UserRole,
      store_id?: string
    ): Promise<boolean> => {
      setIsLoading(true);
      try {
        await axios.post("/api/auth/register", {
          name,
          email,
          password,
          role,
          store_id,
        });
        toast.success("Registration successful! Please login.");
        setIsLoading(false);
        return true;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        toast.error(err.response?.data?.error || "Registration failed");
        setIsLoading(false);
        return false;
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setStores([]);
    setSelectedStoreId(null);
    localStorage.removeItem("pos_token");
    localStorage.removeItem("pos_user");
    localStorage.removeItem("pos_selected_store");
    toast.info("Logged out successfully");
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...userData };
      localStorage.setItem("pos_user", JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        stores,
        selectedStoreId,
        setSelectedStoreId,
        login,
        logout,
        register,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
