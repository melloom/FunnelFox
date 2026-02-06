import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Search, Globe, Kanban, ArrowRight, Zap, MapPin, BarChart3, Users, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <nav className="flex items-center justify-between gap-4 px-4 sm:px-8 py-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-[999] safe-area-top">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <Target className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base" data-testid="text-landing-logo">LeadHunter</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/auth">
            <Button variant="ghost" size="sm" data-testid="button-login-nav">Log in</Button>
          </a>
          <a href="/auth">
            <Button size="sm" data-testid="button-signup-nav">Get Started</Button>
          </a>
        </div>
      </nav>

      <main className="flex-1 safe-area-x">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-12 sm:pb-20 text-center">
            <Badge variant="secondary" className="mb-4">
              <Zap className="w-3 h-3 mr-1" />
              Built for web developers
            </Badge>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight" data-testid="text-landing-headline">
              Find businesses that
              <span className="text-primary block sm:inline"> need your help</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Automatically discover local businesses without websites or with outdated ones.
              Analyze their web presence, and manage your outreach from first contact to closing the deal.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <a href="/auth">
                <Button size="lg" data-testid="button-get-started">
                  Start Finding Leads
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-20">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How it works</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">Three steps to fill your client pipeline</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="relative">
              <div className="hidden sm:block absolute top-8 left-[60%] right-[-40%] border-t-2 border-dashed border-muted-foreground/20" />
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <Search className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">1</span>
                    <h3 className="font-semibold">Discover</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Search 40+ business categories across Bing, DuckDuckGo, and OpenStreetMap. Find restaurants, salons, gyms, and more in any city.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="relative">
              <div className="hidden sm:block absolute top-8 left-[60%] right-[-40%] border-t-2 border-dashed border-muted-foreground/20" />
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">2</span>
                    <h3 className="font-semibold">Analyze</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Automatically score each website on mobile-friendliness, SEO, HTTPS, performance and more. Spot businesses that need your services.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <Kanban className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">3</span>
                    <h3 className="font-semibold">Close</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Manage leads through an 8-stage CRM pipeline. Track every prospect from discovery to signed contract with a Kanban board.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Everything you need</h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">Powerful tools to find and win web development clients</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex gap-4 p-4">
                <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">GPS Auto-Detect</h3>
                  <p className="text-sm text-muted-foreground mt-1">Use your phone's location to instantly search for businesses nearby</p>
                </div>
              </div>
              <div className="flex gap-4 p-4">
                <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Website Scoring</h3>
                  <p className="text-sm text-muted-foreground mt-1">Automated analysis gives each site a quality score with specific issues listed</p>
                </div>
              </div>
              <div className="flex gap-4 p-4">
                <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">No-Website Leads</h3>
                  <p className="text-sm text-muted-foreground mt-1">Automatically identifies businesses with no web presence at all -- your best prospects</p>
                </div>
              </div>
              <div className="flex gap-4 p-4">
                <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Multiple Data Sources</h3>
                  <p className="text-sm text-muted-foreground mt-1">Combines Bing, DuckDuckGo, and OpenStreetMap for comprehensive coverage</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-8 py-12 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to grow your freelance business?</h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Stop cold-emailing random businesses. Start reaching out to the ones that actually need a website.
          </p>
          <div className="mt-6">
            <a href="/auth">
              <Button size="lg" data-testid="button-cta-bottom">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 safe-area-bottom">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-primary">
            <Target className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">LeadHunter</span>
        </div>
        <span className="text-xs text-muted-foreground">Built for web developers who want more clients</span>
      </footer>
    </div>
  );
}
