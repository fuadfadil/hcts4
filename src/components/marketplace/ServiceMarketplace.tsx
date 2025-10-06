"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ServiceCard } from "./ServiceCard";
import { ShoppingCart } from "./ShoppingCart";
import {
  Search,
  Filter,
  ShoppingCart as CartIcon,
  Grid,
  List,
  SlidersHorizontal
} from "lucide-react";

interface Service {
  id: number;
  name: string;
  description: string;
  icd11_code: string;
  service_type: "individual" | "package" | "composite";
  base_price: number;
  discount_tiers: any;
  quantity_available: number;
  specifications: any;
  created_at: string;
  updated_at: string;
  provider: {
    id: number;
    organization_name: string;
  };
}

interface MarketplaceResponse {
  success: boolean;
  data: Service[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function ServiceMarketplace() {
  const { data: session } = useSession();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [icd11Filter, setIcd11Filter] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [pagination, setPagination] = useState<MarketplaceResponse['pagination'] | null>(null);

  useEffect(() => {
    fetchServices();
  }, [searchTerm, icd11Filter, serviceTypeFilter, priceMin, priceMax, sortBy, sortOrder, currentPage]);

  const fetchServices = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        icd11_code: icd11Filter,
        service_type: serviceTypeFilter,
        min_price: priceMin,
        max_price: priceMax,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: currentPage.toString(),
        limit: "12",
      });

      const response = await fetch(`/api/marketplace/services?${params}`);
      const data: MarketplaceResponse = await response.json();

      if (data.success) {
        setServices(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setIcd11Filter("");
    setServiceTypeFilter("");
    setPriceMin("");
    setPriceMax("");
    setSortBy("created_at");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    searchTerm,
    icd11Filter,
    serviceTypeFilter,
    priceMin,
    priceMax
  ].filter(Boolean).length;

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
            <p className="text-muted-foreground mb-6">
              You need to sign in as an insurance company or intermediary to access the marketplace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Healthcare Services Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Browse and purchase healthcare services from verified providers
          </p>
        </div>
        <Button
          onClick={() => setShowCart(true)}
          className="flex items-center gap-2"
        >
          <CartIcon className="h-4 w-4" />
          Cart
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services, providers, or ICD-11 codes..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2">
              <Select value={serviceTypeFilter} onValueChange={(value) => { setServiceTypeFilter(value); setCurrentPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Service Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="package">Package</SelectItem>
                  <SelectItem value="composite">Composite</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">ICD-11 Code</label>
                  <Input
                    placeholder="e.g., A01, B02.3"
                    value={icd11Filter}
                    onChange={(e) => { setIcd11Filter(e.target.value); setCurrentPage(1); }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Min Price</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={priceMin}
                    onChange={(e) => { setPriceMin(e.target.value); setCurrentPage(1); }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Max Price</label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={priceMax}
                    onChange={(e) => { setPriceMax(e.target.value); setCurrentPage(1); }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select value={`${sortBy}_${sortOrder}`} onValueChange={(value) => {
                    const [field, order] = value.split('_');
                    setSortBy(field);
                    setSortOrder(order);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at_desc">Newest First</SelectItem>
                      <SelectItem value="created_at_asc">Oldest First</SelectItem>
                      <SelectItem value="price_asc">Price: Low to High</SelectItem>
                      <SelectItem value="price_desc">Price: High to Low</SelectItem>
                      <SelectItem value="name_asc">Name A-Z</SelectItem>
                      <SelectItem value="name_desc">Name Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground">
          {pagination ? `${pagination.totalCount} services found` : "Loading..."}
        </p>
      </div>

      {/* Services Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-6 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Search className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No services found</h3>
            <p>Try adjusting your search criteria or filters.</p>
          </div>
          <Button onClick={clearFilters}>Clear Filters</Button>
        </div>
      ) : (
        <div className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              viewMode={viewMode}
              onAddToCart={() => fetchServices()} // Refresh after adding to cart
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center mt-8 gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>

          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, currentPage - 2)) + i;
            return (
              <Button
                key={pageNum}
                variant={pageNum === currentPage ? "default" : "outline"}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}

          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      )}

      {/* Shopping Cart Modal */}
      {showCart && (
        <ShoppingCart
          userId={parseInt(session.user.id)}
          onClose={() => setShowCart(false)}
        />
      )}
    </div>
  );
}