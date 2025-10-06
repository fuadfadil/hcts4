"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ICD11Browser } from "@/components/icd11/ICD11Browser";
import { ArrowLeft, ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";

interface ServiceFormData {
  name: string;
  description: string;
  icd11Code: string;
  serviceType: "individual" | "package" | "composite";
  cost?: number;
  profitMargin?: number;
  basePrice: number;
  discountTiers: any;
  quantityAvailable: number;
  specifications: any;
  componentServices?: number[]; // For composite services
}

interface ICD11Category {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface ServiceCreatorProps {
  providerId?: number;
  onSuccess?: () => void;
}

const STEPS = [
  "Basic Information",
  "Service Type & Classification",
  "Pricing & Specifications",
  "Review & Submit"
];

export function ServiceCreator({ providerId, onSuccess }: ServiceCreatorProps = {}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ICD11Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    description: "",
    icd11Code: "",
    serviceType: "individual",
    basePrice: 0,
    discountTiers: {
      "50-99": 5,
      "100+": 10
    },
    quantityAvailable: 0,
    specifications: {}
  });

  const updateFormData = (field: keyof ServiceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (category: ICD11Category) => {
    setSelectedCategory(category);
    updateFormData("icd11Code", category.code);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        provider_id: providerId
      };

      const response = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Handle success
        console.log("Service created successfully:", data);
        if (onSuccess) {
          onSuccess();
        }
        // Reset form
        setFormData({
          name: "",
          description: "",
          icd11Code: "",
          serviceType: "individual",
          basePrice: 0,
          discountTiers: { "50-99": 5, "100+": 10 },
          quantityAvailable: 0,
          specifications: {}
        });
        setCurrentStep(0);
      } else {
        throw new Error(data.error || "Failed to create service");
      }
    } catch (error) {
      console.error("Error submitting service:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                placeholder="Enter service name"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                placeholder="Describe the service"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="quantity">Available Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantityAvailable}
                onChange={(e) => updateFormData("quantityAvailable", parseInt(e.target.value) || 0)}
                placeholder="0 for unlimited"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label>Service Type</Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value: "individual" | "package" | "composite") =>
                  updateFormData("serviceType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Service</SelectItem>
                  <SelectItem value="package">Service Package</SelectItem>
                  <SelectItem value="composite">Composite Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>ICD11 Classification</Label>
              <ICD11Browser
                onSelectCategory={handleCategorySelect}
                selectedCategories={selectedCategory ? [selectedCategory] : []}
                multiSelect={false}
              />
              {selectedCategory && (
                <div className="mt-2">
                  <Badge variant="secondary">
                    Selected: {selectedCategory.code} - {selectedCategory.name}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost">Cost (optional)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost || ""}
                  onChange={(e) => updateFormData("cost", parseFloat(e.target.value) || undefined)}
                  placeholder="Base cost"
                />
              </div>

              <div>
                <Label htmlFor="profitMargin">Profit Margin (%)</Label>
                <Input
                  id="profitMargin"
                  type="number"
                  step="0.1"
                  value={formData.profitMargin || ""}
                  onChange={(e) => updateFormData("profitMargin", parseFloat(e.target.value) || undefined)}
                  placeholder="Profit margin"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="basePrice">Base Price</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) => updateFormData("basePrice", parseFloat(e.target.value) || 0)}
                placeholder="Service price"
              />
            </div>

            <div>
              <Label>Discount Tiers</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">50-99 units:</span>
                  <Input
                    type="number"
                    value={formData.discountTiers["50-99"]}
                    onChange={(e) => updateFormData("discountTiers", {
                      ...formData.discountTiers,
                      "50-99": parseInt(e.target.value) || 0
                    })}
                    className="w-20"
                  />
                  <span className="text-sm">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">100+ units:</span>
                  <Input
                    type="number"
                    value={formData.discountTiers["100+"]}
                    onChange={(e) => updateFormData("discountTiers", {
                      ...formData.discountTiers,
                      "100+": parseInt(e.target.value) || 0
                    })}
                    className="w-20"
                  />
                  <span className="text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Service Details</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Type:</strong> {formData.serviceType}</p>
                  <p><strong>ICD11 Code:</strong> {formData.icd11Code}</p>
                  <p><strong>Base Price:</strong> ${formData.basePrice}</p>
                  <p><strong>Available Quantity:</strong> {formData.quantityAvailable || "Unlimited"}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Pricing</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Cost:</strong> {formData.cost ? `$${formData.cost}` : "Not set"}</p>
                  <p><strong>Profit Margin:</strong> {formData.profitMargin ? `${formData.profitMargin}%` : "Not set"}</p>
                  <p><strong>Discount 50-99:</strong> {formData.discountTiers["50-99"]}%</p>
                  <p><strong>Discount 100+:</strong> {formData.discountTiers["100+"]}%</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm text-gray-600">{formData.description || "No description provided"}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Service</CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            {STEPS.map((step, index) => (
              <span
                key={index}
                className={index === currentStep ? "font-medium text-primary" : ""}
              >
                {step}
              </span>
            ))}
          </div>
          <Progress value={(currentStep + 1) / STEPS.length * 100} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Create Service
            </Button>
          ) : (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}