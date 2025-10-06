import { useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export function useUserRole() {
  const { data: session } = useSession();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("useUserRole: Running on client side, session:", session?.user?.id);
    if (!session?.user?.id) {
      setLoading(false);
      setError(null);
      return;
    }

    const fetchRole = async () => {
      console.log("useUserRole: Fetching role from API");
      try {
        setError(null);
        const response = await fetch("/api/user/role");
        if (!response.ok) {
          throw new Error(`Failed to fetch role: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("useUserRole: API response, role:", data.role);
        setRole(data.role || null);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [session?.user?.id]);

  return { role, loading, error };
}