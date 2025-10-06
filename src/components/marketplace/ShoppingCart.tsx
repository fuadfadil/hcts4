"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CheckoutFlow } from "./CheckoutFlow";
import {
  ShoppingCart as CartIcon,
  X,
  Plus,
  Minus,
  Trash2,
  Building,
  Tag,
  DollarSign
} from "lucide-react";

interface CartItem {
  id: number;
  quantity: number;
  added_at: string;
  updated_at: string;
  service: {
    id: number;
    name: string;
    description: string;
    icd11_code: string;
    service_type: "individual" | "package" | "composite";
    base_price: number;
    discount_tiers: any;
    quantity_available: number;
    specifications: any;
  };
  provider: {
    id: number;
    organization_name: string;
  };
  itemTotal: number;
  discountedPrice: number;
}

interface CartResponse {
  success: boolean;
  data: {
    items: CartItem[];
    summary: {
      totalItems: number;
      totalPrice: number;
      currency: string;
    };
  };
}

interface ShoppingCartProps {
  userId: number;
  onClose: () => void;
}

export function ShoppingCart({ userId, onClose }: ShoppingCartProps) {
  const [cart, setCart] = useState<CartResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [userId]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cart/${userId}`);
      const data: CartResponse = await response.json();

      if (data.success) {
        setCart(data.data);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (serviceId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      setUpdatingItem(serviceId);
      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          serviceId,
          quantity: newQuantity,
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchCart();
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    } finally {
      setUpdatingItem(null);
    }
  };

  const removeItem = async (serviceId: number) => {
    try {
      setUpdatingItem(serviceId);
      const response = await fetch(`/api/cart/${userId}?serviceId=${serviceId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        fetchCart();
      }
    } catch (error) {
      console.error("Error removing item:", error);
    } finally {
      setUpdatingItem(null);
    }
  };

  const clearCart = async () => {
    try {
      const response = await fetch(`/api/cart/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        fetchCart();
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
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

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CartIcon className="h-5 w-5" />
              Shopping Cart
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CartIcon className="h-5 w-5" />
              Shopping Cart
              {cart?.summary.totalItems && (
                <Badge variant="secondary">
                  {cart.summary.totalItems} item{cart.summary.totalItems !== 1 ? 's' : ''}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {!cart || cart.items.length === 0 ? (
            <div className="text-center py-8">
              <CartIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-4">
                Add some healthcare services to get started.
              </p>
              <Button onClick={onClose}>Continue Shopping</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cart Items */}
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{item.service.name}</h4>
                          <Badge className={getServiceTypeColor(item.service.service_type)}>
                            {item.service.service_type}
                          </Badge>
                          <Badge variant="outline">{item.service.icd11_code}</Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {item.service.description}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {item.provider.organization_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            {formatPrice(item.service.base_price)} each
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.service.id, item.quantity - 1)}
                            disabled={updatingItem === item.service.id || item.quantity <= 1}
                            className="px-2"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="px-3 py-1 min-w-[3rem] text-center">
                            {updatingItem === item.service.id ? "..." : item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.service.id, item.quantity + 1)}
                            disabled={updatingItem === item.service.id}
                            className="px-2"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Price */}
                        <div className="text-right min-w-[100px]">
                          <div className="font-semibold">
                            {formatPrice(item.itemTotal)}
                          </div>
                          {item.discountedPrice !== item.itemTotal && (
                            <div className="text-sm text-muted-foreground line-through">
                              {formatPrice(item.discountedPrice)}
                            </div>
                          )}
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.service.id)}
                          disabled={updatingItem === item.service.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Separator />

              {/* Cart Summary */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total ({cart.summary.totalItems} items)</span>
                  <span>{formatPrice(cart.summary.totalPrice)}</span>
                </div>

                {/* Bulk Discount Notice */}
                {cart.items.some(item => item.discountedPrice !== item.itemTotal) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Bulk discounts applied to your order!
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={clearCart} className="flex-1">
                    Clear Cart
                  </Button>
                  <Button onClick={() => setShowCheckout(true)} className="flex-1">
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Flow */}
      {showCheckout && cart && (
        <CheckoutFlow
          cartItems={cart.items}
          totalAmount={cart.summary.totalPrice}
          userId={userId}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false);
            fetchCart();
          }}
        />
      )}
    </>
  );
}