import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Hook to guard a page by user roles.
 * @param allowedRoles Array of roles that can access the page
 */
export function useAuth(allowedRoles: string[]) {
  const navigate = useNavigate();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("activeUser") || "null");
    if (!user || !allowedRoles.includes(user.rol)) {
      // Redirect unauthorized user to their dashboard or login
      const redirectTo = user?.rol ? `/${user.rol}` : "/login";
      navigate(redirectTo, { replace: true });
    }
  }, [allowedRoles, navigate]);
}

/**
 * Example usage in a page component:
 *
 * import { useAuth } from "../hooks/useAuth";
 *
 * export default function SomePage() {
 *   // Only 'admin' and 'teacher' can access
 *   useAuth(["admin", "teacher"]);
 *   return <div>Protected Content</div>;
 * }
 */
