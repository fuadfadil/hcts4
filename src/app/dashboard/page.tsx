"use client";

import { useSession } from "@/lib/auth-client";
import { useUserRole } from "@/hooks/use-user-role";
import { UserProfile } from "@/components/auth/user-profile";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProviderDashboard } from "@/components/dashboard/ProviderDashboard";
import { InsuranceDashboard } from "@/components/dashboard/InsuranceDashboard";
import { IntermediaryDashboard } from "@/components/dashboard/IntermediaryDashboard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const { role: userRole, loading: roleLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!roleLoading && userRole && session) {
      // Redirect to role-specific dashboard
      router.replace(`/dashboard/${userRole}`);
    }
  }, [userRole, roleLoading, session, router]);

  if (isPending || roleLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Protected Page</h1>
            <p className="text-muted-foreground mb-6">
              You need to sign in to access the dashboard
            </p>
          </div>
          <UserProfile />
        </div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-muted-foreground">Unable to determine user role</div>
      </div>
    );
  }

  // This component will redirect, but we can show a loading state
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-muted-foreground">Redirecting to your dashboard...</div>
    </div>
  );
}
