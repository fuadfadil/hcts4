"use client";

import { useSession } from "@/lib/auth-client";
import { useUserRole } from "@/hooks/use-user-role";
import { UserProfile } from "@/components/auth/user-profile";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  FileText,
  Users,
  Settings,
  Bell,
  BarChart3,
  ShoppingCart,
  Receipt,
  DollarSign,
  Activity
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const providerMenuItems = [
  { href: "/dashboard/provider", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/provider/services", label: "Services", icon: Package },
  { href: "/dashboard/provider/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/provider/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/provider/profile", label: "Profile", icon: Settings },
];

const insuranceMenuItems = [
  { href: "/dashboard/insurance", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/insurance/marketplace", label: "Marketplace", icon: ShoppingCart },
  { href: "/dashboard/insurance/certificates", label: "Certificates", icon: FileText },
  { href: "/dashboard/insurance/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/dashboard/insurance/profile", label: "Profile", icon: Settings },
];

const intermediaryMenuItems = [
  { href: "/dashboard/intermediary", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/intermediary/market", label: "Market Analysis", icon: Activity },
  { href: "/dashboard/intermediary/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/intermediary/commissions", label: "Commissions", icon: DollarSign },
  { href: "/dashboard/intermediary/clients", label: "Clients", icon: Users },
  { href: "/dashboard/intermediary/profile", label: "Profile", icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession();
  const { role: userRole, loading: roleLoading } = useUserRole();
  const pathname = usePathname();

  if (!session || roleLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="flex justify-center items-center h-screen">
        Unable to determine user role
      </div>
    );
  }
  const menuItems = {
    provider: providerMenuItems,
    insurance: insuranceMenuItems,
    intermediary: intermediaryMenuItems,
  }[userRole as "provider" | "insurance" | "intermediary"] || providerMenuItems;

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "provider": return "Healthcare Provider";
      case "insurance": return "Insurance Company";
      case "intermediary": return "Intermediary";
      default: return role;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Dashboard</h2>
              <Badge variant="secondary" className="text-xs">
                {getRoleDisplayName(userRole)}
              </Badge>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton variant={isActive ? "active" : "default"}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-6 gap-4">
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <ModeToggle />
              <UserProfile />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}