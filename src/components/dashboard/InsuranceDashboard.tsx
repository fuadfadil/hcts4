"use client";

import { useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingCart,
  FileText,
  TrendingUp,
  Search,
  Filter,
  Download,
  Eye,
  DollarSign,
  Package
} from "lucide-react";
import Link from "next/link";

interface InsuranceDashboardData {
  availableServices: Array<{
    id: number;
    name: string;
    description: string;
    icd11_code: string;
    base_price: number;
    quantity_available: number;
    status: string;
    category_name: string;
  }>;
  purchaseHistory: Array<{
    id: number;
    service_name: string;
    quantity: number;
    total_price: number;
    status: string;
    created_at: string;
    certificate_number: string | null;
  }>;
  spendingAnalytics: {
    total_spent: number;
    transaction_count: number;
    avg_transaction: number;
  };
  certificatesLibrary: Array<{
    id: number;
    certificate_number: string;
    qr_code_data: string;
    issued_at: string;
    expires_at: string;
    service_name: string;
    transaction_id: number;
  }>;
}

export function InsuranceDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<InsuranceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [icd11Filter, setIcd11Filter] = useState("");

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchDashboardData = async () => {
      try {
        const url = icd11Filter
          ? `/api/dashboard/insurance/${session.user.id}?icd11=${icd11Filter}`
          : `/api/dashboard/insurance/${session.user.id}`;
        const response = await fetch(url);
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
  }, [session?.user?.id, icd11Filter]);

  const filteredServices = data?.availableServices.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
          <h1 className="text-3xl font-bold">Insurance Dashboard</h1>
          <p className="text-muted-foreground">Browse services and manage your healthcare certificates</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/insurance/marketplace">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Browse Marketplace
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.spendingAnalytics.total_spent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Across all purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.spendingAnalytics.transaction_count}</div>
            <p className="text-xs text-muted-foreground">Completed purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.certificatesLibrary.length}</div>
            <p className="text-xs text-muted-foreground">Active certificates</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Services Marketplace */}
        <Card>
          <CardHeader>
            <CardTitle>Available Services</CardTitle>
            <CardDescription>Browse healthcare services by ICD11 category</CardDescription>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={icd11Filter} onValueChange={setIcd11Filter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="ICD11" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="A">A - Certain infectious</SelectItem>
                  <SelectItem value="B">B - Certain infectious</SelectItem>
                  <SelectItem value="C">C - Neoplasms</SelectItem>
                  <SelectItem value="D">D - Diseases of blood</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredServices.slice(0, 5).map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.icd11_code} • {service.category_name}</p>
                    <p className="text-xs text-muted-foreground">{service.quantity_available} available</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${service.base_price.toFixed(2)}</p>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
              {filteredServices.length === 0 && (
                <p className="text-sm text-muted-foreground">No services found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Purchase History */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
            <CardDescription>Recent service purchases and certificates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.purchaseHistory.slice(0, 5).map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{purchase.service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {purchase.quantity} units • {new Date(purchase.created_at).toLocaleDateString()}
                    </p>
                    {purchase.certificate_number && (
                      <Badge variant="secondary" className="text-xs">
                        Certificate: {purchase.certificate_number}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${purchase.total_price.toFixed(2)}</p>
                    <Badge variant={purchase.status === "completed" ? "default" : "secondary"}>
                      {purchase.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {data.purchaseHistory.length === 0 && (
                <p className="text-sm text-muted-foreground">No purchase history</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certificates Library */}
      <Card>
        <CardHeader>
          <CardTitle>Certificates Library</CardTitle>
          <CardDescription>Manage your healthcare service certificates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.certificatesLibrary.slice(0, 6).map((certificate) => (
              <div key={certificate.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{certificate.certificate_number}</Badge>
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm font-medium">{certificate.service_name}</p>
                <div className="text-xs text-muted-foreground">
                  <p>Issued: {new Date(certificate.issued_at).toLocaleDateString()}</p>
                  <p>Expires: {new Date(certificate.expires_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {data.certificatesLibrary.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">No certificates available</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" asChild className="h-auto p-4">
              <Link href="/dashboard/insurance/marketplace">
                <div className="flex flex-col items-center gap-2">
                  <ShoppingCart className="h-6 w-6" />
                  <span>Browse Services</span>
                </div>
              </Link>
            </Button>

            <Button variant="outline" asChild className="h-auto p-4">
              <Link href="/dashboard/insurance/certificates">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-6 w-6" />
                  <span>View Certificates</span>
                </div>
              </Link>
            </Button>

            <Button variant="outline" asChild className="h-auto p-4">
              <Link href="/dashboard/insurance/analytics">
                <div className="flex flex-col items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  <span>Spending Analytics</span>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}