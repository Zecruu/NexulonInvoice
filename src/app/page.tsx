import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FileText, CreditCard, Mail, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Nexulon Invoice</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Invoice smarter.
          <br />
          <span className="text-muted-foreground">Get paid faster.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Create professional invoices, accept online payments, and track
          everything in one place. Built for freelancers and small businesses.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="text-base">
              Start for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-24">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<FileText className="h-8 w-8" />}
            title="Professional Invoices"
            description="Create polished invoices with custom line items, tax, and discounts in seconds."
          />
          <FeatureCard
            icon={<CreditCard className="h-8 w-8" />}
            title="Online Payments"
            description="Accept payments via Stripe. Share a payment link and get paid instantly."
          />
          <FeatureCard
            icon={<Mail className="h-8 w-8" />}
            title="Email Delivery"
            description="Send invoices directly to clients with professional email templates."
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8" />}
            title="Dashboard Analytics"
            description="Track revenue, outstanding invoices, and payment trends at a glance."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Nexulon Invoice. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
