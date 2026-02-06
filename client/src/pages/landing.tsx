import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Search, Globe, Kanban, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <nav className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50 safe-area-top">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <Target className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm" data-testid="text-landing-logo">LeadHunter</span>
        </div>
        <a href="/api/login">
          <Button size="sm" data-testid="button-login-nav">Log in</Button>
        </a>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 safe-area-x">
        <div className="max-w-2xl text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight" data-testid="text-landing-headline">
              Find clients who need websites
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto">
              Automatically discover local businesses without websites or with outdated ones.
              Manage your outreach pipeline from first contact to closing the deal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/api/login">
              <Button size="lg" data-testid="button-get-started">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 sm:mt-16 max-w-3xl w-full">
          <Card className="hover-elevate">
            <CardContent className="pt-6 text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">Auto-Discover</h3>
              <p className="text-xs text-muted-foreground">
                Search 40+ business categories across multiple data sources automatically
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="pt-6 text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">Website Analysis</h3>
              <p className="text-xs text-muted-foreground">
                Score websites on mobile-friendliness, SEO, performance and more
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="pt-6 text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Kanban className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">CRM Pipeline</h3>
              <p className="text-xs text-muted-foreground">
                Track leads through 8 stages from discovery to closing the deal
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-muted-foreground border-t safe-area-bottom">
        LeadHunter — Built for web developers
      </footer>
    </div>
  );
}
