import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import foxLogo from "@assets/fox_1770439380079.png";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resending, setResending] = useState(false);
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
        setVerificationEmail(email);
        setShowVerification(true);
      } else {
        await login.mutateAsync({ email, password });
        setLocation("/");
      }
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      let parsed = msg;
      try {
        const j = JSON.parse(msg);
        parsed = j.message || msg;
        if (j.needsVerification) {
          setVerificationEmail(j.email || email);
          setShowVerification(true);
          return;
        }
      } catch {}
      toast({ title: "Error", description: parsed, variant: "destructive" });
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/resend-verification", { email: verificationEmail });
      toast({ title: "Verification email sent", description: "Check your inbox for a new verification link." });
    } catch {
      toast({ title: "Error", description: "Failed to resend verification email. Try again later.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setAcceptedTerms(false);
    setShowVerification(false);
  };

  if (showVerification) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background p-4 safe-area-x safe-area-top safe-area-bottom">
        <div className="pt-1">
          <Button variant="ghost" size="icon" onClick={() => setShowVerification(false)} data-testid="button-back-verification">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-verify-title">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a verification link to <span className="font-medium text-foreground">{verificationEmail}</span>. Click the link to activate your account.
              </p>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-xs text-muted-foreground text-center">
                  The link expires in 24 hours. If you don't see the email, check your spam folder.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResendVerification}
                  disabled={resending}
                  data-testid="button-resend-verification"
                >
                  {resending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Resend verification email
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setShowVerification(false); setMode("login"); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 cursor-pointer"
                    data-testid="button-back-to-login"
                  >
                    Already verified? <span className="text-primary underline underline-offset-2">Sign in</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background p-4 safe-area-x safe-area-top safe-area-bottom">
      <div className="pt-1">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-auth">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
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
                      autoComplete="given-name"
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
                      autoComplete="family-name"
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
                  inputMode="email"
                  autoComplete={isRegister ? "email" : "username"}
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
                  autoComplete={isRegister ? "new-password" : "current-password"}
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
