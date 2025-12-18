"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
  carServiceAPI,
  type CreateServicePayload,
} from "@/services/api"

import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  FileText,
  Phone,
  User,
  Wrench,
} from "lucide-react"

const TYPE_OF_WORK_OPTIONS = [
  "Total Loss",
  "Major Repair",
  "Medium Repair",
  "Minor Repair",
]

export default function CreateServicePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    vehicleRegistrationNumber: "",
    vehicleModel: "",
    typeOfWork: "",
    serviceAdvisorId: user?.id ?? "",
    serviceDate: new Date().toISOString().split("T")[0],
    ownerName: "",
    contactInfo: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleChange = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const required: (keyof typeof formData)[] = [
      "vehicleRegistrationNumber",
      "vehicleModel",
      "typeOfWork",
      "serviceDate",
      "ownerName",
      "contactInfo",
    ]

    const missing = required.filter((f) => !formData[f])
    if (missing.length) {
      setErrorMessage("Please fill in all required fields.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: CreateServicePayload = {
        ...formData,
        serviceAdvisorId: formData.serviceAdvisorId || user?.id || "unknown",
        changedBy: user?.name,
      }

      const result = await carServiceAPI.createService(payload)

      if (!result.success) {
        throw new Error(result.message || "Failed to create service record")
      }

      toast({ description: "Service record created successfully." })
      setSuccessMessage("Service record created successfully!")

      router.push("/dashboard/sa/services")
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create service record"
      setErrorMessage(msg)
      toast({ variant: "destructive", description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Create Service</h1>
          <p className="text-muted-foreground">
            Add a new service record for your assigned vehicles.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-500 text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-white dark:bg-white shadow-md">
        <CardHeader>
          <CardTitle>New Service Entry</CardTitle>
          <CardDescription>
            Provide vehicle and owner details to log a new service.
          </CardDescription>
        </CardHeader>

        <CardContent className="bg-white">
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">

              <FormField
                label="Vehicle Registration Number"
                icon={<Car className="h-4 w-4 text-muted-foreground" />}
                required
              >
                <Input
                  placeholder="MH01AB1234"
                  value={formData.vehicleRegistrationNumber}
                  onChange={(e) =>
                    handleChange(
                      "vehicleRegistrationNumber",
                      e.target.value.toUpperCase()
                    )
                  }
                />
              </FormField>

              <FormField
                label="Vehicle Model"
                icon={<Car className="h-4 w-4 text-muted-foreground" />}
                required
              >
                <Input
                  placeholder="Creta SX, i20 Sportz"
                  value={formData.vehicleModel}
                  onChange={(e) =>
                    handleChange("vehicleModel", e.target.value)
                  }
                />
              </FormField>

              <FormField
                label="Type of Work"
                icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
                required
              >
                <Select
                  value={formData.typeOfWork}
                  onValueChange={(v) => handleChange("typeOfWork", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type of work" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OF_WORK_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Service Date"
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                required
              >
                <Input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={formData.serviceDate}
                  onChange={(e) =>
                    handleChange("serviceDate", e.target.value)
                  }
                />
              </FormField>

              <FormField
                label="Owner Name"
                icon={<User className="h-4 w-4 text-muted-foreground" />}
                required
              >
                <Input
                  placeholder="Enter owner's full name"
                  value={formData.ownerName}
                  onChange={(e) => handleChange("ownerName", e.target.value)}
                />
              </FormField>

              <FormField
                label="Contact Number"
                icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                required
              >
                <Input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={formData.contactInfo}
                  onChange={(e) =>
                    handleChange("contactInfo", e.target.value)
                  }
                />
              </FormField>

              <FormField
                label="Service Advisor ID"
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              >
                <Input disabled value={formData.serviceAdvisorId} />
              </FormField>

            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push("/dashboard/sa/services")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : "Create Service"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------- Helpers ---------- */

function FormField({
  label,
  icon,
  required,
  children,
}: {
  label: string
  icon?: ReactNode
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}

function Loader({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin text-white", className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4"
      />
    </svg>
  )
}
