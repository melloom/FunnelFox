import { useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import foxLogo from "@assets/fox_1770439380079.png";

export default function ResetPasswordPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, newPassword });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to reset password");
      }
      setIsSuccess(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <img src={foxLogo} alt="FunnelFox" className="w-12 h-12 rounded-md object-cover" data-testid="img-app-logo" />
          </div>
          <h1 className="text-2xl font-bold">Invalid Reset Link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or invalid. Please request a new one.
          </p>
          <Button variant="outline" onClick={() => setLocation("/auth")} data-testid="button-back-to-login">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary">
              <CheckCircle className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-reset-success">Password Reset</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been updated successfully. You can now sign in with your new password.
          </p>
          <Button onClick={() => setLocation("/auth")} data-testid="button-go-to-login">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background p-4 safe-area-x">
      <div className="pt-2">
        <Link href="/auth">
          <Button variant="ghost" size="icon" data-testid="button-back-reset">
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
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-reset-title">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-confirm-password"
                />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
                data-testid="button-reset-password"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Reset Password"
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
