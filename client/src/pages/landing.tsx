import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center px-6 safe-area-x">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-md bg-primary">
              <Target className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-landing-headline">
              LeadHunter
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-landing-logo">
              Find clients who need websites
            </p>
          </div>
          <a href="/auth">
            <Button className="w-full mt-2" data-testid="button-login-nav">
              Log in
            </Button>
          </a>
        </div>
      </main>
    </div>
  );
}
