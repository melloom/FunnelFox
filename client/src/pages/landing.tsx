import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Target,
  Search,
  Globe,
  Kanban,
  ArrowRight,
  Zap,
  Mail,
  BarChart3,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";

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

function StepItem({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="space-y-1 pt-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-4 safe-area-x safe-area-top">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Target className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-tight">LeadHunter</span>
        </div>
        <Link href="/auth">
          <Button variant="outline" size="sm" data-testid="button-login-header">
            Log in
          </Button>
        </Link>
      </header>

      <main className="flex-1 safe-area-x">
        <section className="px-5 pt-8 pb-12 sm:pt-16 sm:pb-20 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
            <Zap className="w-3 h-3" />
            Built for web developers
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight" data-testid="text-landing-headline">
            Find businesses that need
            <span className="text-primary"> your services</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed" data-testid="text-landing-subtitle">
            Automatically discover local businesses without websites or with outdated ones. Analyze, reach out, and close deals — all in one place.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-login-nav">
                Log in
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="mt-10 sm:mt-14 flex items-center justify-center gap-6 sm:gap-10 text-muted-foreground">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-foreground">40+</div>
              <div className="text-xs mt-0.5">Categories</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-foreground">8</div>
              <div className="text-xs mt-0.5">CRM Stages</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-foreground">4</div>
              <div className="text-xs mt-0.5">Data Sources</div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-12 sm:pb-20 max-w-4xl mx-auto">
          <h2 className="text-lg sm:text-2xl font-bold text-center mb-2">Everything you need to find clients</h2>
          <p className="text-xs sm:text-sm text-muted-foreground text-center mb-8 max-w-md mx-auto">
            From discovery to closing — tools designed specifically for freelance web developers and agencies.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Search}
              title="Smart Discovery"
              description="Search Bing, DuckDuckGo, OpenStreetMap, and Google Places to find businesses in any category and location."
            />
            <FeatureCard
              icon={Globe}
              title="Website Analysis"
              description="Automatically score websites on mobile-friendliness, SEO, HTTPS, meta tags, and performance."
            />
            <FeatureCard
              icon={Kanban}
              title="Pipeline Management"
              description="Drag leads through 8 CRM stages on a visual Kanban board from first contact to signed contract."
            />
            <FeatureCard
              icon={Users}
              title="Contact Extraction"
              description="Automatically scrape emails, phone numbers, and social media profiles from business websites."
            />
            <FeatureCard
              icon={Mail}
              title="Email Templates"
              description="Pre-built outreach templates that auto-fill with lead details for personalized pitches in seconds."
            />
            <FeatureCard
              icon={BarChart3}
              title="Export & Track"
              description="Download leads as CSV spreadsheets and track your conversion pipeline with real-time stats."
            />
          </div>
        </section>

        <section className="px-5 pb-12 sm:pb-20 max-w-lg mx-auto">
          <h2 className="text-lg sm:text-2xl font-bold text-center mb-2">How it works</h2>
          <p className="text-xs sm:text-sm text-muted-foreground text-center mb-8">
            Three steps to your next client.
          </p>
          <div className="space-y-6">
            <StepItem
              number="1"
              title="Search for businesses"
              description='Pick a category like "restaurants" or "dentists" and a location. LeadHunter searches multiple data sources and finds businesses for you.'
            />
            <StepItem
              number="2"
              title="Review & prioritize"
              description="Each business gets a website quality score. Those without websites or with poor ones are flagged as high-value opportunities."
            />
            <StepItem
              number="3"
              title="Reach out & close"
              description="Use built-in email templates to pitch your services, then track every lead through your pipeline until you close the deal."
            />
          </div>
        </section>

        <section className="px-5 pb-12 sm:pb-20 max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold">Ready to find your next client?</h2>
                <p className="text-xs text-muted-foreground">
                  Start discovering businesses that need your web development skills.
                </p>
              </div>
              <Link href="/auth">
                <Button size="lg" className="w-full" data-testid="button-login-cta">
                  Log in
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <div className="flex flex-col items-center gap-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-chart-2" />
                  No credit card required
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-chart-2" />
                  Works on mobile and desktop
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="px-5 py-5 text-center text-xs text-muted-foreground safe-area-bottom">
        LeadHunter — Built for web developers
      </footer>
    </div>
  );
}
