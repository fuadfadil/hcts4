"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import {
  ShoppingCart,
  Plus,
  Minus,
  Info,
  Building,
  Tag,
  DollarSign
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

interface ServiceCardProps {
  service: Service;
  viewMode: "grid" | "list";
  onAddToCart: () => void;
}

export function ServiceCard({ service, viewMode, onAddToCart }: ServiceCardProps) {
  const { data: session } = useSession();
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleAddToCart = async () => {
    if (!session?.user?.id) return;

    try {
      setAddingToCart(true);
      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session.user.id,
          serviceId: service.id,
          quantity,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onAddToCart();
        setQuantity(1);
      } else {
        console.error("Failed to add to cart:", data.error);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setAddingToCart(false);
    }
  };

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case "individual":
        return "bg-blue-100 text-blue-800";
      case "package":
        return "bg-purple-100 text-purple-800";
      case "composite":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  if (viewMode === "list") {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg">{service.name}</h3>
              <Badge className={getServiceTypeColor(service.service_type)}>
                {service.service_type}
              </Badge>
              <Badge variant="outline">{service.icd11_code}</Badge>
            </div>
            <p className="text-muted-foreground mb-2 line-clamp-2">
              {service.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {service.provider.organization_name}
              </div>
              <div className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Available: {service.quantity_available === 0 ? "Unlimited" : service.quantity_available}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(service.base_price)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="px-2"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center border-0"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                {addingToCart ? "Adding..." : "Add to Cart"}
              </Button>

              <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{service.name}</DialogTitle>
                  </DialogHeader>
                  <ServiceDetails service={service} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg line-clamp-2 mb-2">{service.name}</h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getServiceTypeColor(service.service_type)}>
                {service.service_type}
              </Badge>
              <Badge variant="outline">{service.icd11_code}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <p className="text-muted-foreground mb-4 line-clamp-3 flex-1">
          {service.description}
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building className="h-4 w-4" />
            <span className="truncate">{service.provider.organization_name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(service.base_price)}
            </div>
            <div className="text-xs text-muted-foreground">
              Available: {service.quantity_available === 0 ? "Unlimited" : service.quantity_available}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="px-2 h-8"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 text-center border-0 h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
                className="px-2 h-8"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={addingToCart}
              size="sm"
              className="flex items-center gap-1"
            >
              <ShoppingCart className="h-3 w-3" />
              {addingToCart ? "..." : "Add"}
            </Button>
          </div>

          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Info className="h-3 w-3 mr-1" />
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{service.name}</DialogTitle>
              </DialogHeader>
              <ServiceDetails service={service} />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceDetails({ service }: { service: Service }) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium mb-2">Description</h4>
        <p className="text-muted-foreground">{service.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Service Type</h4>
          <Badge className="capitalize">{service.service_type}</Badge>
        </div>

        <div>
          <h4 className="font-medium mb-2">ICD-11 Code</h4>
          <Badge variant="outline">{service.icd11_code}</Badge>
        </div>

        <div>
          <h4 className="font-medium mb-2">Base Price</h4>
          <div className="text-2xl font-bold text-green-600">
            {formatPrice(service.base_price)}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Availability</h4>
          <p className="text-muted-foreground">
            {service.quantity_available === 0 ? "Unlimited" : `${service.quantity_available} available`}
          </p>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Provider</h4>
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span>{service.provider.organization_name}</span>
        </div>
      </div>

      {service.specifications && Object.keys(service.specifications).length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Specifications</h4>
          <div className="space-y-2">
            {Object.entries(service.specifications).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {service.discount_tiers && Object.keys(service.discount_tiers).length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Bulk Discounts</h4>
          <div className="space-y-2">
            {Object.entries(service.discount_tiers).map(([quantity, discount]) => (
              <div key={quantity} className="flex justify-between">
                <span>{quantity}+ units:</span>
                <span className="text-green-600">{Number(discount)}% off</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}