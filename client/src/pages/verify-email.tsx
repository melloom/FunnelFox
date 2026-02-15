import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Mail, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import foxLogo from "@assets/fox_1770439380079.png";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [emailForResend, setEmailForResend] = useState("");

  const token = new URLSearchParams(searchString).get("token");

  const handleResend = async () => {
    if (!emailForResend) {
      toast({ title: "Email required", description: "Please enter your email to resend verification.", variant: "destructive" });
      return;
    }
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/resend-verification", { email: emailForResend });
      toast({ title: "Verification email sent", description: "Check your inbox for a new verification link." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to resend verification email.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token, queryClient]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4 safe-area-x safe-area-top safe-area-bottom">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <img src={foxLogo} alt="FunnelFox" className="w-12 h-12 rounded-md object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FunnelFox</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            {status === "loading" && (
              <div className="flex flex-col items-center gap-4 py-8" data-testid="verify-loading">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying your email...</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center gap-4 py-4" data-testid="verify-success">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium">{message}</p>
                  <p className="text-xs text-muted-foreground">Your account is now active.</p>
                </div>
                <Button className="w-full mt-2" onClick={() => setLocation("/")} data-testid="button-go-to-app">
                  Get started
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-4 py-4" data-testid="verify-error">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium">Verification failed</p>
                  <p className="text-xs text-muted-foreground">{message}</p>
                </div>

                {message.toLowerCase().includes("expired") && (
                  <div className="w-full space-y-3 pt-2">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Resend Link</p>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                        value={emailForResend}
                        onChange={(e) => setEmailForResend(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleResend} 
                      disabled={resending || !emailForResend}
                    >
                      {resending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Resend Verification
                    </Button>
                  </div>
                )}

                <div className="w-full space-y-2 mt-2 border-t pt-4">
                  <Button variant="outline" className="w-full" onClick={() => setLocation("/auth")} data-testid="button-go-to-auth">
                    <Mail className="w-4 h-4 mr-2" />
                    Back to sign in
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
