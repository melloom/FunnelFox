import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import foxLogo from "@assets/fox_1770439380079.png";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Something went wrong");
      }
      setIsSuccess(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary">
              <CheckCircle className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-forgot-success">Check Your Email</h1>
          <p className="text-sm text-muted-foreground">
            If an account exists with <strong>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
          </p>
          <p className="text-xs text-muted-foreground">
            The link expires in 1 hour.
          </p>
          <Link href="/auth">
            <Button variant="outline" data-testid="button-back-to-login">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background p-4 safe-area-x">
      <div className="pt-2">
        <Link href="/auth">
          <Button variant="ghost" size="icon" data-testid="button-back-forgot">
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
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-forgot-title">
            Forgot Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a link to reset your password
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
                  data-testid="input-forgot-email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || !email} data-testid="button-send-reset">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm pb-6">
          <Link href="/auth">
            <span className="text-muted-foreground cursor-pointer hover:underline" data-testid="link-back-to-login">
              <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
              Back to Sign In
            </span>
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
