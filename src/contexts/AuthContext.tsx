import { createContext, useContext, useState } from "react";

type Role = "admin" | "teacher" | "student" | "parent" | "visitor" | null;

interface AuthContextType {
  userRole: Role;
  login: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<Role>(null);

  const login = (role: Role) => setUserRole(role);
  const logout = () => setUserRole(null);

  return (
    <AuthContext.Provider value={{ userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthContext must be used within AuthProvider");
  return context;
}
