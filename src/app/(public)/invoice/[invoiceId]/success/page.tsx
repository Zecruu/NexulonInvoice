import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="p-8">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold">Payment Received!</h1>
          <p className="mb-6 text-muted-foreground">
            Thank you for your payment. The invoice has been marked as paid and
            a confirmation will be sent to your email.
          </p>
          <Link href="/">
            <Button variant="outline">Return Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
