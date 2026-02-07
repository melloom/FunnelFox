import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  Mail,
  Calendar,
  Crown,
  Trash2,
  AlertTriangle,
  Shield,
  Sun,
  Moon,
  CreditCard,
  Search,
  BarChart3,
  Lock,
  ArrowRight,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

interface SubscriptionInfo {
  planStatus: string;
  isAdmin: boolean;
  stripeSubscriptionId: string | null;
  memberSince: string | null;
  monthlyDiscoveriesUsed: number;
  discoveryLimit: number;
  leadCount?: number;
  leadLimit?: number;
}

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription"],
  });

  const { data: gmailStatus } = useQuery<{ connected: boolean; email?: string }>({
    queryKey: ["/api/gmail/status"],
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/account");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot delete account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasActiveSubscription = subscription?.planStatus === "pro" && subscription?.stripeSubscriptionId;
  const canDelete = !hasActiveSubscription || subscription?.isAdmin;

  if (!user) return null;

  const initials = ((user.firstName?.[0] || "") + (user.lastName?.[0] || "") || user.email[0]).toUpperCase();
  const memberSince = subscription?.memberSince
    ? new Date(subscription.memberSince).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "Unknown";

  const isPro = subscription?.planStatus === "pro";

  function getStatusBadge() {
    if (subscription?.isAdmin) {
      return <Badge variant="default" data-testid="badge-plan-admin"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
    }
    if (isPro) {
      return <Badge variant="default" data-testid="badge-plan-pro"><Crown className="w-3 h-3 mr-1" />Pro</Badge>;
    }
    return <Badge variant="secondary" data-testid="badge-plan-free">Free</Badge>;
  }

  const discoveriesUsed = subscription?.monthlyDiscoveriesUsed ?? 0;
  const discoveryLimit = subscription?.discoveryLimit ?? 5;
  const discoveriesPercent = discoveryLimit === 999 ? 0 : Math.min(100, (discoveriesUsed / discoveryLimit) * 100);

  return (
    <div className="container max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-account-title">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, preferences, and account</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </CardTitle>
          {getStatusBadge()}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-lg" data-testid="text-account-name">
                {user.firstName} {user.lastName || ""}
              </p>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm truncate" data-testid="text-account-email">{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Usage This Month
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subLoading ? (
            <div className="h-12 rounded-md bg-muted animate-pulse" />
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">Discoveries</span>
                  <span className="text-sm text-muted-foreground">
                    {discoveriesUsed} / {discoveryLimit === 999 ? "Unlimited" : discoveryLimit}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${discoveryLimit === 999 ? 0 : discoveriesPercent}%` }}
                  />
                </div>
                {discoveriesPercent >= 80 && discoveryLimit !== 999 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {discoveriesPercent >= 100 ? "Limit reached." : "Running low."}{" "}
                    {!isPro && (
                      <button onClick={() => setLocation("/subscription")} className="text-primary underline cursor-pointer" data-testid="link-upgrade-usage">
                        Upgrade for more
                      </button>
                    )}
                  </p>
                )}
              </div>
              {subscription?.leadCount !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm">Saved Leads</span>
                    <span className="text-sm text-muted-foreground">
                      {subscription.leadCount} / {isPro ? "Unlimited" : (subscription.leadLimit ?? 25)}
                    </span>
                  </div>
                  {!isPro && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((subscription.leadCount || 0) / (subscription.leadLimit || 25)) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setLocation("/subscription")} data-testid="button-manage-plan">
                  <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                  {isPro ? "Manage Plan" : "Upgrade to Pro"}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Appearance</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme} data-testid="button-toggle-theme">
              {theme === "light" ? <Moon className="w-3.5 h-3.5 mr-1.5" /> : <Sun className="w-3.5 h-3.5 mr-1.5" />}
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </Button>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Gmail Integration</p>
                <p className="text-xs text-muted-foreground">
                  {gmailStatus?.connected
                    ? `Connected as ${gmailStatus.email || "your account"}`
                    : "Connect Gmail to send emails from the app"}
                </p>
              </div>
              {gmailStatus?.connected ? (
                <Badge variant="secondary">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Change your account password</p>
            </div>
            <AlertDialog open={showPasswordDialog} onOpenChange={(open) => {
              setShowPasswordDialog(open);
              if (!open) { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
            }}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-change-password">
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  Change Password
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Change Password</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter your current password and choose a new one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password" className="text-sm">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      data-testid="input-current-password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-sm">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-sm">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-password">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={
                      !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6 || changePasswordMutation.isPending
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      changePasswordMutation.mutate({ currentPassword, newPassword });
                    }}
                    data-testid="button-save-password"
                  >
                    {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="justify-start" onClick={() => setLocation("/subscription")} data-testid="button-quick-subscription">
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Subscription
            </Button>
            <Button variant="outline" size="sm" className="justify-start" onClick={() => setLocation("/help")} data-testid="button-quick-help">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Help & Guide
            </Button>
            <Button variant="outline" size="sm" className="justify-start" onClick={() => setLocation("/terms")} data-testid="button-quick-terms">
              Terms of Service
            </Button>
            <Button variant="outline" size="sm" className="justify-start" onClick={() => setLocation("/privacy")} data-testid="button-quick-privacy">
              Privacy Policy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasActiveSubscription && !subscription?.isAdmin && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Active subscription detected</p>
                <p className="text-muted-foreground mt-1">
                  You must cancel your Pro subscription before deleting your account.
                  Go to the <button onClick={() => setLocation("/subscription")} className="underline text-primary cursor-pointer" data-testid="link-cancel-sub">Subscription page</button> to cancel first.
                </p>
              </div>
            </div>
          )}

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!canDelete || deleteAccountMutation.isPending}
                data-testid="button-delete-account"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">This will permanently delete your account and all your data including:</span>
                  <span className="block">- Your profile and login credentials</span>
                  <span className="block">- Your activity history and notes</span>
                  <span className="block font-medium mt-2">Type <span className="font-mono text-destructive">DELETE</span> to confirm:</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="input-delete-confirm"
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmText("")} data-testid="button-cancel-delete">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    deleteAccountMutation.mutate();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  {deleteAccountMutation.isPending ? "Deleting..." : "Delete My Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
