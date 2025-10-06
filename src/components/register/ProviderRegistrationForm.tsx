"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Upload, CheckCircle } from "lucide-react"

// Validation schemas for each step
const organizationSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
  }),
})

const licenseSchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseType: z.string().min(1, "License type is required"),
  issuingAuthority: z.string().min(1, "Issuing authority is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  licenseDocument: z.any().optional(),
})

const guarantorSchema = z.object({
  guarantorName: z.string().min(2, "Guarantor name must be at least 2 characters"),
  guarantorEmail: z.string().email("Invalid email address"),
  guarantorPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  guaranteeAmount: z.string().min(1, "Guarantee amount is required"),
  guarantorDocument: z.any().optional(),
})

const servicesSchema = z.object({
  icd11Codes: z.array(z.string()).min(1, "At least one ICD11 service code is required"),
  specialties: z.array(z.string()).min(1, "At least one specialty is required"),
  serviceDescription: z.string().min(50, "Service description must be at least 50 characters"),
})

type OrganizationData = z.infer<typeof organizationSchema>
type LicenseData = z.infer<typeof licenseSchema>
type GuarantorData = z.infer<typeof guarantorSchema>
type ServicesData = z.infer<typeof servicesSchema>

const steps = [
  { id: 1, title: "Organization Details", description: "Basic organization information" },
  { id: 2, title: "License & Certification", description: "Upload licenses and certificates" },
  { id: 3, title: "Guarantor Information", description: "Financial guarantor details" },
  { id: 4, title: "Service Classification", description: "ICD11 services and specialties" },
  { id: 5, title: "Review & Submit", description: "Review all information and submit" },
]

export function ProviderRegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<OrganizationData & LicenseData & GuarantorData & ServicesData>>({})

  const formSchema = z.object({
    // Organization fields
    organizationName: z.string().min(2, "Organization name must be at least 2 characters").optional(),
    registrationNumber: z.string().min(1, "Registration number is required").optional(),
    taxId: z.string().min(1, "Tax ID is required").optional(),
    contactEmail: z.string().email("Invalid email address").optional(),
    contactPhone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
    address: z.object({
      street: z.string().min(1, "Street address is required").optional(),
      city: z.string().min(1, "City is required").optional(),
      state: z.string().min(1, "State is required").optional(),
      postalCode: z.string().min(1, "Postal code is required").optional(),
      country: z.string().min(1, "Country is required").optional(),
    }).optional(),
    // License fields
    licenseNumber: z.string().min(1, "License number is required").optional(),
    licenseType: z.string().min(1, "License type is required").optional(),
    issuingAuthority: z.string().min(1, "Issuing authority is required").optional(),
    expiryDate: z.string().min(1, "Expiry date is required").optional(),
    licenseDocument: z.any().optional(),
    // Guarantor fields
    guarantorName: z.string().min(2, "Guarantor name must be at least 2 characters").optional(),
    guarantorEmail: z.string().email("Invalid email address").optional(),
    guarantorPhone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
    guaranteeAmount: z.string().min(1, "Guarantee amount is required").optional(),
    guarantorDocument: z.any().optional(),
    // Services fields
    icd11Codes: z.array(z.string()).min(1, "At least one ICD11 service code is required").optional(),
    specialties: z.array(z.string()).min(1, "At least one specialty is required").optional(),
    serviceDescription: z.string().min(50, "Service description must be at least 50 characters").optional(),
  })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: formData,
  })

  const onSubmit = async (data: any) => {
    const updatedData = { ...formData, ...data }
    setFormData(updatedData)

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
      form.reset(updatedData)
    } else {
      // Submit final registration
      try {
        const response = await fetch('/api/register/provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
        })

        if (response.ok) {
          alert('Registration submitted successfully!')
        } else {
          alert('Registration failed. Please try again.')
        }
      } catch (error) {
        console.error('Registration error:', error)
        alert('An error occurred during registration.')
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const progress = (currentStep / steps.length) * 100

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter organization name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter registration number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tax ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter contact email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter state/province" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter postal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter license number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licenseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select license type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="medical_practice">Medical Practice License</SelectItem>
                        <SelectItem value="healthcare_facility">Healthcare Facility License</SelectItem>
                        <SelectItem value="pharmacy">Pharmacy License</SelectItem>
                        <SelectItem value="laboratory">Laboratory License</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issuingAuthority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Authority</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter issuing authority" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="licenseDocument"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Document</FormLabel>
                  <FormControl>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="license-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Upload license document
                          </span>
                          <input
                            id="license-upload"
                            type="file"
                            className="sr-only"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => field.onChange(e.target.files?.[0])}
                          />
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          PDF, JPG, PNG up to 10MB
                        </p>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guarantorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guarantor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter guarantor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guarantorEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guarantor Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter guarantor email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guarantorPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guarantor Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter guarantor phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guaranteeAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guarantee Amount (LYD)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter guarantee amount" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="guarantorDocument"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guarantor Document</FormLabel>
                  <FormControl>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="guarantor-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Upload guarantor document
                          </span>
                          <input
                            id="guarantor-upload"
                            type="file"
                            className="sr-only"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => field.onChange(e.target.files?.[0])}
                          />
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          PDF, JPG, PNG up to 10MB
                        </p>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="icd11Codes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ICD11 Service Codes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter ICD11 codes (comma-separated)"
                      {...field}
                      value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                      onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()))}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter ICD11 classification codes for your services, separated by commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialties"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Specialties</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter specialties (comma-separated)"
                      {...field}
                      value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                      onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()))}
                    />
                  </FormControl>
                  <FormDescription>
                    List your medical specialties, separated by commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your medical services..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a detailed description of the medical services you offer
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h3 className="mt-4 text-lg font-medium">Review Your Information</h3>
              <p className="mt-2 text-sm text-gray-600">
                Please review all the information before submitting your registration.
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Organization Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>Name:</strong> {formData.organizationName}</p>
                  <p><strong>Email:</strong> {formData.contactEmail}</p>
                  <p><strong>Phone:</strong> {formData.contactPhone}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">License Information</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>License Number:</strong> {formData.licenseNumber}</p>
                  <p><strong>Type:</strong> {formData.licenseType}</p>
                  <p><strong>Authority:</strong> {formData.issuingAuthority}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Guarantor Information</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>Name:</strong> {formData.guarantorName}</p>
                  <p><strong>Email:</strong> {formData.guarantorEmail}</p>
                  <p><strong>Amount:</strong> {formData.guaranteeAmount} LYD</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStep} of {steps.length}
          </div>
        </div>
        <Progress value={progress} className="w-full" />
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderStepContent()}

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <Button type="submit">
                {currentStep === steps.length ? 'Submit Registration' : 'Next'}
                {currentStep !== steps.length && <ChevronRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}