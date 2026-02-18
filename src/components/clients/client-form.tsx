"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { clientSchema, ClientFormData } from "@/lib/validations";
import { createClient, updateClient } from "@/actions/client-actions";
import type { ClientType } from "@/types";

interface ClientFormProps {
  client?: ClientType;
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      contactPerson: client?.contactPerson || "",
      address: {
        street: client?.address?.street || "",
        city: client?.address?.city || "",
        state: client?.address?.state || "",
        zipCode: client?.address?.zipCode || "",
        country: client?.address?.country || "",
      },
      notes: client?.notes || "",
    },
  });

  async function onSubmit(data: ClientFormData) {
    const result = isEditing
      ? await updateClient(client!._id, data)
      : await createClient(data);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "Client updated" : "Client created");
    router.push("/clients");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company / Client Name *</Label>
              <Input id="name" {...register("name")} placeholder="Acme Corp" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="billing@acme.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                {...register("contactPerson")}
                placeholder="John Doe"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street</Label>
            <Input
              id="street"
              {...register("address.street")}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("address.city")} placeholder="New York" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register("address.state")} placeholder="NY" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                {...register("address.zipCode")}
                placeholder="10001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...register("address.country")}
                placeholder="United States"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("notes")}
            placeholder="Any additional notes about this client..."
            rows={3}
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Update Client" : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
