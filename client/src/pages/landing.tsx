import { Button } from "@/components/ui/button";
import { Target, Search, Globe, Kanban, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <nav className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-[999] safe-area-top">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <Target className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base" data-testid="text-landing-logo">LeadHunter</span>
        </div>
        <a href="/auth">
          <Button size="sm" data-testid="button-login-nav">Log in</Button>
        </a>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 safe-area-x">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight" data-testid="text-landing-headline">
              Find businesses that
              <span className="text-primary"> need your help</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Discover local businesses without websites, analyze their web presence, and manage your outreach pipeline.
            </p>
          </div>

          <a href="/auth">
            <Button size="lg" className="w-full sm:w-auto mt-2" data-testid="button-get-started">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="text-center space-y-1.5">
              <div className="mx-auto w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Discover</p>
            </div>
            <div className="text-center space-y-1.5">
              <div className="mx-auto w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Analyze</p>
            </div>
            <div className="text-center space-y-1.5">
              <div className="mx-auto w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                <Kanban className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Close</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-muted-foreground safe-area-bottom">
        Built for web developers
      </footer>
    </div>
  );
}
