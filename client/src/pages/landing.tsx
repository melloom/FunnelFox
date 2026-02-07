import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Globe,
  Kanban,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import foxLogo from "@assets/fox_1770439380079.png";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Search;
  title: string;
  description: string;
}) {
  return (
    <Card className="hover-elevate">
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-4 safe-area-x safe-area-top">
        <div className="flex items-center gap-2.5">
          <img src={foxLogo} alt="FunnelFox" className="w-8 h-8 rounded-md object-cover" data-testid="img-app-logo" />
          <span className="text-sm font-bold tracking-tight">FunnelFox</span>
        </div>
        <Link href="/auth">
          <Button variant="outline" data-testid="button-login-header">
            Log in
          </Button>
        </Link>
      </header>

      <main className="flex-1 safe-area-x flex flex-col items-center justify-center">
        <section className="px-5 pt-8 pb-10 sm:pt-12 sm:pb-14 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
            <Zap className="w-3 h-3" />
            Built for web developers
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight" data-testid="text-landing-headline">
            Find businesses that need
            <span className="text-primary"> your services</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed" data-testid="text-landing-subtitle">
            Discover local businesses without websites or with outdated ones. Analyze, reach out, and close deals — all in one place.
          </p>
          <div className="mt-6">
            <Link href="/auth">
              <Button size="lg" data-testid="button-login-nav">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="px-5 pb-10 sm:pb-14 max-w-3xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FeatureCard
              icon={Search}
              title="Smart Discovery"
              description="Search multiple data sources to find businesses in any category and location."
            />
            <FeatureCard
              icon={Globe}
              title="Website Analysis"
              description="Automatically score websites on mobile-friendliness, SEO, HTTPS, and performance."
            />
            <FeatureCard
              icon={Kanban}
              title="Pipeline Management"
              description="Track leads through 8 CRM stages from first contact to signed contract."
            />
          </div>
        </section>
      </main>

      <footer className="px-5 py-5 pb-8 safe-area-bottom border-t">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground">
          <span>FunnelFox by MellowSites</span>
          <div className="flex items-center gap-3">
            <Link href="/terms">
              <span className="underline cursor-pointer" data-testid="link-footer-terms">Terms of Service</span>
            </Link>
            <Link href="/privacy">
              <span className="underline cursor-pointer" data-testid="link-footer-privacy">Privacy Policy</span>
            </Link>
            <a href="mailto:contact@mellowsites.com" className="underline" data-testid="link-footer-contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
