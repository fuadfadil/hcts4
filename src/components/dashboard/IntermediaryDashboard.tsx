"use client";

import { useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  Activity,
  Receipt,
  Target,
  Calendar
} from "lucide-react";
import Link from "next/link";

interface IntermediaryDashboardData {
  transactionHistory: Array<{
    id: number;
    service_name: string;
    quantity: number;
    total_price: number;
    commission: number;
    status: string;
    created_at: string;
    buyer_name: string;
    seller_name: string;
  }>;
  commissionData: {
    total_earnings: number;
    total_transactions: number;
    avg_commission: number;
  };
  trendingServices: Array<{
    service_id: number;
    service_name: string;
    icd11_code: string;
    purchase_count: number;
    total_revenue: number;
  }>;
  clientOverview: Array<{
    client_id: number;
    client_name: string;
    total_transactions: number;
    total_spent: number;
    last_transaction: Date;
  }>;
  activityReports: Array<{
    month: string;
    transaction_count: number;
    total_volume: number;
    commission_earned: number;
  }>;
}

export function IntermediaryDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<IntermediaryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`/api/dashboard/intermediary/${session.user.id}`);
        if (response.ok) {
          const dashboardData = await response.json();
          setData(dashboardData);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Unable to load dashboard data</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Intermediary Dashboard</h1>
          <p className="text-muted-foreground">Track commissions, analyze markets, and manage clients</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/intermediary/market">
              <Activity className="h-4 w-4 mr-2" />
              Market Analysis
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.commissionData.total_earnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Commission earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.commissionData.total_transactions}</div>
            <p className="text-xs text-muted-foreground">Facilitated deals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.clientOverview.length}</div>
            <p className="text-xs text-muted-foreground">Managed clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Commission</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.commissionData.avg_commission.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest facilitated deals and commissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.transactionHistory.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{transaction.service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.buyer_name} • {transaction.quantity} units
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${transaction.commission.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Commission</p>
                    <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {data.transactionHistory.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent transactions</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trending Services */}
        <Card>
          <CardHeader>
            <CardTitle>Trending Services</CardTitle>
            <CardDescription>Most popular services in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.trendingServices.slice(0, 5).map((service) => (
                <div key={service.service_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{service.service_name}</p>
                      <p className="text-xs text-muted-foreground">{service.icd11_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{service.purchase_count} purchases</p>
                      <p className="text-xs text-muted-foreground">${service.total_revenue.toFixed(2)}</p>
                    </div>
                  </div>
                  <Progress value={Math.min((service.purchase_count / 10) * 100, 100)} className="h-2" />
                </div>
              ))}
              {data.trendingServices.length === 0 && (
                <p className="text-sm text-muted-foreground">No trending services</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Client Management</CardTitle>
          <CardDescription>Overview of your client relationships</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.clientOverview.slice(0, 6).map((client) => (
              <div key={client.client_id} className="p-4 border rounded-lg space-y-2">
                <h4 className="font-medium">{client.client_name}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{client.total_transactions} transactions</p>
                  <p>${client.total_spent.toFixed(2)} total spent</p>
                  <p>Last: {new Date(client.last_transaction).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  View Details
                </Button>
              </div>
            ))}
            {data.clientOverview.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">No clients yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Activity Report</CardTitle>
          <CardDescription>Transaction volume and commission trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.activityReports.slice(0, 6).map((report) => (
              <div key={report.month} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{report.month}</p>
                    <p className="text-xs text-muted-foreground">{report.transaction_count} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${report.total_volume.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">${report.commission_earned.toFixed(2)} commission</p>
                </div>
              </div>
            ))}
            {data.activityReports.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity reports available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button variant="outline" asChild className="h-auto p-4">
              <Link href="/dashboard/intermediary/market">
                <div className="flex flex-col items-center gap-2">
                  <Activity className="h-6 w-6" />
                  <span>Market Analysis</span>
                </div>
              </Link>
            </Button>

            <Button variant="outline" asChild className="h-auto p-4">
              <Link href="/dashboard/intermediary/transactions">
                <div className="flex flex-col items-center gap-2">
                  <Receipt className="h-6 w-6" />
                  <span>Transaction History</span>
                </div>
              </Link>
            </Button>

            <Button variant="outline" asChild className="h-auto p-4">
              <Link href="/dashboard/intermediary/commissions">
                <div className="flex flex-col items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  <span>Commission Tracking</span>
                </div>
              </Link>
            </Button>

            <Button variant="outline" asChild className="h-auto p-4">
              <Link href="/dashboard/intermediary/clients">
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-6 w-6" />
                  <span>Client Management</span>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}