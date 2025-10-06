"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Shield, Users, Languages } from "lucide-react"
import { ProviderRegistrationForm } from "@/components/register/ProviderRegistrationForm"
import { InsuranceRegistrationForm } from "@/components/register/InsuranceRegistrationForm"
import { IntermediaryRegistrationForm } from "@/components/register/IntermediaryRegistrationForm"

type UserRole = "provider" | "insurance" | "intermediary"
type Language = "en" | "ar"

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [language, setLanguage] = useState<Language>("en")

  const isRTL = language === "ar"

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en")
  }

  const roles = [
    {
      id: "provider" as const,
      title: language === "ar" ? "منظمة الرعاية الصحية" : "Healthcare Organization",
      description: language === "ar" ? "سجل كمقدم خدمات رعاية صحية" : "Register as a healthcare provider offering medical services",
      icon: Building2,
      features: language === "ar"
        ? ["تفاصيل المنظمة", "التحقق من الترخيص", "تصنيف الخدمات", "معلومات الضامن"]
        : ["Organization details", "License verification", "Service classification", "Guarantor information"]
    },
    {
      id: "insurance" as const,
      title: language === "ar" ? "شركة التأمين" : "Insurance Company",
      description: language === "ar" ? "سجل كمقدم تأمين طبي" : "Register as an insurance provider for medical coverage",
      icon: Shield,
      features: language === "ar"
        ? ["تفاصيل الشركة", "التحقق من الترخيص", "أنواع التغطية", "معلومات الضامن"]
        : ["Company details", "License verification", "Coverage types", "Guarantor information"]
    },
    {
      id: "intermediary" as const,
      title: language === "ar" ? "الوسيط" : "Intermediary",
      description: language === "ar" ? "سجل كوسيط أو سمسرة طبية" : "Register as a medical intermediary or broker",
      icon: Users,
      features: language === "ar"
        ? ["تفاصيل شخصية/شركة", "التحقق من الترخيص", "نوع النشاط", "العروض الخدمية"]
        : ["Personal/Company details", "License verification", "Activity type", "Service offerings"]
    }
  ]

  if (selectedRole) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <Button
                variant="outline"
                onClick={() => setSelectedRole(null)}
              >
                {isRTL ? '→' : '←'} {language === "ar" ? "العودة لاختيار الدور" : "Back to Role Selection"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center gap-2"
              >
                <Languages className="h-4 w-4" />
                {language === "ar" ? "EN" : "العربية"}
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {language === "ar"
                ? `${roles.find(r => r.id === selectedRole)?.title} - تسجيل`
                : `${roles.find(r => r.id === selectedRole)?.title} Registration`
              }
            </h1>
          </div>

          {selectedRole === "provider" && <ProviderRegistrationForm />}
          {selectedRole === "insurance" && <InsuranceRegistrationForm />}
          {selectedRole === "intermediary" && <IntermediaryRegistrationForm />}
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-2"
          >
            <Languages className="h-4 w-4" />
            {language === "ar" ? "EN" : "العربية"}
          </Button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {language === "ar" ? "انضم إلى منصة HCTS" : "Join HCTS Platform"}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {language === "ar" ? "اختر دورك لبدء عملية التسجيل" : "Select your role to begin the registration process"}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <Card
                key={role.id}
                className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 hover:border-blue-500"
                onClick={() => setSelectedRole(role.id)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-fit">
                    <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {role.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-6" size="lg">
                    {language === "ar" ? `سجل كـ ${role.title}` : `Register as ${role.title}`}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}