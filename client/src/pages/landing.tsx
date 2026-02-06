import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Search, Globe, Kanban, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center px-6 safe-area-x">
        <div className="max-w-sm sm:max-w-2xl w-full text-center space-y-6 sm:space-y-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-md bg-primary">
              <Target className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-2xl sm:text-5xl font-bold tracking-tight" data-testid="text-landing-headline">
              LeadHunter
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground" data-testid="text-landing-logo">
              Find clients who need websites
            </p>
            <p className="hidden sm:block text-sm text-muted-foreground max-w-lg mx-auto">
              Automatically discover local businesses without websites or with outdated ones.
              Analyze their web presence and manage your outreach pipeline from first contact to closing the deal.
            </p>
          </div>
          <a href="/auth">
            <Button className="w-full sm:w-auto mt-2" size="lg" data-testid="button-login-nav">
              Log in
              <ArrowRight className="w-4 h-4 ml-2 hidden sm:inline-block" />
            </Button>
          </a>

          <div className="hidden sm:grid grid-cols-3 gap-6 pt-6 max-w-xl mx-auto">
            <Card>
              <CardContent className="pt-5 text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Search className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">Discover</h3>
                <p className="text-xs text-muted-foreground">Search 40+ business categories across multiple data sources</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">Analyze</h3>
                <p className="text-xs text-muted-foreground">Score websites on mobile-friendliness, SEO, and performance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Kanban className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">Close</h3>
                <p className="text-xs text-muted-foreground">Track leads through 8 CRM stages from discovery to contract</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="hidden sm:block p-4 text-center text-xs text-muted-foreground">
        Built for web developers
      </footer>
    </div>
  );
}
