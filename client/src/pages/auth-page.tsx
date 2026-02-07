import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import foxLogo from "@assets/fox_1770439380079.png";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast({ title: "Required", description: "Please accept the Terms of Service and Privacy Policy to continue.", variant: "destructive" });
      return;
    }
    try {
      await login.mutateAsync({ email, password });
      setLocation("/");
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      let parsed = msg;
      try {
        const j = JSON.parse(msg);
        parsed = j.message || msg;
      } catch {}
      toast({ title: "Error", description: parsed, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 safe-area-x">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <img src={foxLogo} alt="FunnelFox" className="w-12 h-12 rounded-md object-cover" data-testid="img-app-logo" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-auth-title">
            FunnelFox
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password">
                    <span className="text-xs text-primary cursor-pointer hover:underline" data-testid="link-forgot-password">
                      Forgot password?
                    </span>
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  data-testid="checkbox-accept-terms"
                  className="mt-0.5"
                />
                <label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                  I agree to the{" "}
                  <Link href="/terms">
                    <span className="underline text-foreground" data-testid="link-auth-terms">Terms of Service</span>
                  </Link>
                  {" "}and{" "}
                  <Link href="/privacy">
                    <span className="underline text-foreground" data-testid="link-auth-privacy">Privacy Policy</span>
                  </Link>
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={login.isPending || !acceptedTerms} data-testid="button-submit-auth">
                {login.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
