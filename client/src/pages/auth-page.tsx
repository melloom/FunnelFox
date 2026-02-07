import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import foxLogo from "@assets/fox_1770439380079.png";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isRegister = mode === "register";
  const isPending = login.isPending || register.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister && !acceptedTerms) {
      toast({ title: "Required", description: "Please accept the Terms of Service and Privacy Policy to continue.", variant: "destructive" });
      return;
    }
    if (isRegister && !firstName.trim()) {
      toast({ title: "Required", description: "Please enter your first name.", variant: "destructive" });
      return;
    }
    try {
      if (isRegister) {
        await register.mutateAsync({ email, password, firstName: firstName.trim(), lastName: lastName.trim() || undefined });
      } else {
        await login.mutateAsync({ email, password });
      }
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

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setAcceptedTerms(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background p-4 safe-area-x">
      <div className="pt-2">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-auth">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <img src={foxLogo} alt="FunnelFox" className="w-12 h-12 rounded-md object-cover" data-testid="img-app-logo" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-auth-title">
            FunnelFox
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRegister ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              )}
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
                  {!isRegister && (
                    <Link href="/forgot-password">
                      <span className="text-xs text-primary cursor-pointer hover:underline" data-testid="link-forgot-password">
                        Forgot password?
                      </span>
                    </Link>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-password"
                />
                {isRegister && (
                  <p className="text-[10px] text-muted-foreground">Must be at least 6 characters</p>
                )}
              </div>
              {isRegister && (
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
              )}
              <Button type="submit" className="w-full" disabled={isPending || (isRegister && !acceptedTerms)} data-testid="button-submit-auth">
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isRegister ? "Create account" : "Sign in"
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={switchMode}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 cursor-pointer"
                data-testid="button-switch-auth-mode"
              >
                {isRegister ? "Already have an account? " : "Don't have an account? "}
                <span className="text-primary underline underline-offset-2">{isRegister ? "Sign in" : "Sign up"}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
