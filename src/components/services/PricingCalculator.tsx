"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, TrendingUp, DollarSign, Percent } from "lucide-react";

interface PricingConfig {
  cost: number;
  profitMargin: number;
  basePrice: number;
  discountTiers: {
    "50-99": number;
    "100+": number;
  };
  competitorPrices?: number[];
}

interface PricingResult {
  basePrice: number;
  discountedPrice: number;
  discountPercentage: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
}

export function PricingCalculator() {
  const [config, setConfig] = useState<PricingConfig>({
    cost: 0,
    profitMargin: 20,
    basePrice: 0,
    discountTiers: {
      "50-99": 5,
      "100+": 10
    },
    competitorPrices: []
  });

  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<PricingResult | null>(null);

  useEffect(() => {
    calculatePricing();
  }, [config, quantity]);

  const updateConfig = (field: keyof PricingConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateDiscountTier = (tier: "50-99" | "100+", value: number) => {
    setConfig(prev => ({
      ...prev,
      discountTiers: {
        ...prev.discountTiers,
        [tier]: value
      }
    }));
  };

  const calculatePricing = () => {
    let price = config.basePrice;

    // Apply discounts based on quantity
    let discountPercentage = 0;
    if (quantity >= 100) {
      discountPercentage = config.discountTiers["100+"];
    } else if (quantity >= 50) {
      discountPercentage = config.discountTiers["50-99"];
    }

    const discountedPrice = price * (1 - discountPercentage / 100);
    const totalRevenue = discountedPrice * quantity;
    const totalCost = config.cost * quantity;
    const profit = totalRevenue - totalCost;
    const actualProfitMargin = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    setResult({
      basePrice: price,
      discountedPrice,
      discountPercentage,
      totalRevenue,
      profit,
      profitMargin: actualProfitMargin
    });
  };

  const calculateSuggestedPrice = () => {
    if (config.cost > 0 && config.profitMargin > 0) {
      const suggestedPrice = config.cost * (1 + config.profitMargin / 100);
      updateConfig("basePrice", suggestedPrice);
    }
  };

  const getCompetitorAnalysis = () => {
    if (!config.competitorPrices || config.competitorPrices.length === 0) {
      return null;
    }

    const avgCompetitor = config.competitorPrices.reduce((a, b) => a + b, 0) / config.competitorPrices.length;
    const minCompetitor = Math.min(...config.competitorPrices);
    const maxCompetitor = Math.max(...config.competitorPrices);

    return {
      average: avgCompetitor,
      min: minCompetitor,
      max: maxCompetitor,
      suggested: avgCompetitor * 0.95 // 5% below average
    };
  };

  const competitorAnalysis = getCompetitorAnalysis();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Pricing Calculator
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Cost & Pricing</Label>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost">Cost per Unit</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        value={config.cost}
                        onChange={(e) => updateConfig("cost", parseFloat(e.target.value) || 0)}
                        className="pl-9"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="profitMargin">Profit Margin (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="profitMargin"
                        type="number"
                        step="0.1"
                        value={config.profitMargin}
                        onChange={(e) => updateConfig("profitMargin", parseFloat(e.target.value) || 0)}
                        className="pl-9"
                        placeholder="20"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="basePrice">Base Price</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={calculateSuggestedPrice}
                      disabled={config.cost === 0 || config.profitMargin === 0}
                    >
                      Calculate from Cost
                    </Button>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={config.basePrice}
                      onChange={(e) => updateConfig("basePrice", parseFloat(e.target.value) || 0)}
                      className="pl-9"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-base font-medium">Quantity & Discounts</Label>
              <div className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bulk Discount Tiers</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tier1">50-99 units (%)</Label>
                      <Input
                        id="tier1"
                        type="number"
                        value={config.discountTiers["50-99"]}
                        onChange={(e) => updateDiscountTier("50-99", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier2">100+ units (%)</Label>
                      <Input
                        id="tier2"
                        type="number"
                        value={config.discountTiers["100+"]}
                        onChange={(e) => updateDiscountTier("100+", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-base font-medium">Competitor Analysis (Optional)</Label>
              <div className="mt-2">
                <Label htmlFor="competitorPrices">Competitor Prices (comma-separated)</Label>
                <Input
                  id="competitorPrices"
                  placeholder="100, 120, 95, 110"
                  onChange={(e) => {
                    const prices = e.target.value.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
                    updateConfig("competitorPrices", prices);
                  }}
                />
                {competitorAnalysis && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Market Analysis</span>
                    </div>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p>Average: ${competitorAnalysis.average.toFixed(2)}</p>
                      <p>Range: ${competitorAnalysis.min.toFixed(2)} - ${competitorAnalysis.max.toFixed(2)}</p>
                      <p>Suggested: ${competitorAnalysis.suggested.toFixed(2)} (5% below average)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Pricing Results</Label>
              {result ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">
                          ${result.discountedPrice.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">Unit Price</div>
                        {result.discountPercentage > 0 && (
                          <Badge variant="secondary" className="mt-1">
                            {result.discountPercentage}% off
                          </Badge>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-600">
                          ${result.totalRevenue.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">Total Revenue</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-lg font-semibold text-purple-600">
                            ${result.profit.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">Total Profit</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-orange-600">
                            {result.profitMargin.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">Profit Margin</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Base Price: ${result.basePrice.toFixed(2)}</p>
                    <p>Quantity: {quantity} units</p>
                    <p>Cost per unit: ${config.cost.toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-8 text-center text-gray-500">
                  Enter pricing details to see calculations
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}