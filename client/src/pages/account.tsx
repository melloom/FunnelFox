import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { User, Mail, Calendar, Crown, CreditCard, Trash2, AlertTriangle, ExternalLink } from "lucide-react";

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: subscription } = useQuery<{
    planStatus: string;
    monthlyDiscoveriesUsed: number;
    discoveryLimit: number;
    leadLimit: number | null;
    stripeSubscriptionId: string | null;
    isAdmin: boolean;
  }>({
    queryKey: ["/api/subscription"],
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
  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Unknown";

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-account-title">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-lg" data-testid="text-account-name">
                {user.firstName} {user.lastName || ""}
              </p>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm truncate" data-testid="text-account-email">{user.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Member since {memberSince}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {subscription?.planStatus === "pro" ? (
                <Crown className="w-5 h-5 text-primary" />
              ) : (
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="font-medium" data-testid="text-account-plan">
                {subscription?.planStatus === "pro" ? "Pro Plan" : "Free Plan"}
              </span>
              {subscription?.isAdmin && (
                <Badge variant="secondary">Admin</Badge>
              )}
            </div>
            <Button variant="outline" onClick={() => setLocation("/pricing")} data-testid="button-manage-plan">
              Manage Plan
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Discoveries: {subscription?.monthlyDiscoveriesUsed || 0} / {subscription?.discoveryLimit === 999 ? "Unlimited" : subscription?.discoveryLimit || 5} this month</p>
            <p>Lead limit: {subscription?.leadLimit === null ? "Unlimited" : subscription?.leadLimit || 25}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" />
            Delete Account
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
                  Go to the <button onClick={() => setLocation("/pricing")} className="underline text-primary cursor-pointer" data-testid="link-cancel-sub">Pricing page</button> to manage your subscription.
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
                  <span className="block">- All saved leads and pipeline data</span>
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
