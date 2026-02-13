import { useState, useEffect } from "react";
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
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Loader2,
  Send,
  Unplug,
  Server,
  Settings,
  Info,
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

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFromName: string;
  smtpFromEmail: string;
  smtpSecure: boolean;
  hasPassword: boolean;
}

interface EmailPreset {
  id: string;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  helpText: string;
  category: "personal" | "business";
}

const EMAIL_PRESETS: EmailPreset[] = [
  { id: "gmail", label: "Gmail", host: "smtp.gmail.com", port: 587, secure: false, category: "personal", helpText: "Use an App Password: Google Account > Security > 2-Step Verification > App Passwords" },
  { id: "outlook", label: "Outlook", host: "smtp.office365.com", port: 587, secure: false, category: "personal", helpText: "Use your regular Outlook password. Enable POP/IMAP in Outlook settings if needed." },
  { id: "yahoo", label: "Yahoo", host: "smtp.mail.yahoo.com", port: 465, secure: true, category: "personal", helpText: "Generate an App Password: Yahoo Account > Security > Generate App Password" },
  { id: "zoho", label: "Zoho", host: "smtp.zoho.com", port: 465, secure: true, category: "personal", helpText: "Use your Zoho password. Enable IMAP access in Zoho Mail settings." },
  { id: "hostinger", label: "Hostinger", host: "smtp.hostinger.com", port: 465, secure: true, category: "business", helpText: "Use your Hostinger email password. Find settings in hPanel > Emails." },
  { id: "godaddy", label: "GoDaddy", host: "smtpout.secureserver.net", port: 465, secure: true, category: "business", helpText: "Use your GoDaddy Workspace email password." },
  { id: "namecheap", label: "Namecheap", host: "mail.privateemail.com", port: 465, secure: true, category: "business", helpText: "Use your Private Email password from Namecheap." },
  { id: "bluehost", label: "Bluehost", host: "mail.your-domain.com", port: 465, secure: true, category: "business", helpText: "Replace 'your-domain.com' with your actual domain. Use your email password." },
  { id: "siteground", label: "SiteGround", host: "mail.your-domain.com", port: 465, secure: true, category: "business", helpText: "Replace 'your-domain.com' with your actual domain. Find settings in Site Tools > Email." },
  { id: "ionos", label: "IONOS (1&1)", host: "smtp.ionos.com", port: 465, secure: true, category: "business", helpText: "Use your IONOS email password." },
  { id: "other", label: "Other", host: "", port: 587, secure: false, category: "business", helpText: "Check your hosting provider's documentation for the mail server, port, and password." },
];

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
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  const [emailSetupStep, setEmailSetupStep] = useState<"pick" | "credentials">("pick");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [emailSettingsLoaded, setEmailSettingsLoaded] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [showAdvancedEmail, setShowAdvancedEmail] = useState(false);

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription"],
  });

  const { data: gmailStatus } = useQuery<{ connected: boolean; email?: string; method?: string }>({
    queryKey: ["/api/gmail/status"],
  });

  const { data: emailSettings } = useQuery<EmailSettings>({
    queryKey: ["/api/email-settings"],
  });

  useEffect(() => {
    if (emailSettings && !emailSettingsLoaded) {
      setSmtpHost(emailSettings.smtpHost);
      setSmtpPort(emailSettings.smtpPort);
      setSmtpUser(emailSettings.smtpUser);
      setSmtpPass(emailSettings.smtpPass);
      setSmtpFromName(emailSettings.smtpFromName);
      setSmtpFromEmail(emailSettings.smtpFromEmail);
      setSmtpSecure(emailSettings.smtpSecure);
      setEmailSettingsLoaded(true);
      const match = EMAIL_PRESETS.find(p => p.host === emailSettings.smtpHost && p.id !== "other");
      setSelectedPreset(match ? match.id : emailSettings.smtpHost ? "other" : null);
    }
  }, [emailSettings, emailSettingsLoaded]);

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
              <h2 className="font-semibold text-lg leading-tight" data-testid="text-account-name">
                {user.firstName} {user.lastName || ""}
              </h2>
              <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm truncate" data-testid="text-account-email">{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
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
            {isPro ? "Usage This Month" : "Usage (Lifetime)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subLoading ? (
            <div className="h-12 rounded-md bg-muted animate-pulse" />
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{isPro ? "Monthly Leads" : "Lifetime Leads"}</span>
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
                      {subscription.leadCount} / {isPro ? "Unlimited" : (subscription.leadLimit ?? 100)}
                    </span>
                  </div>
                  {!isPro && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((subscription.leadCount || 0) / (subscription.leadLimit || 100)) * 100)}%` }}
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
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Provider
          </CardTitle>
          {gmailStatus?.connected ? (
            <Badge variant="secondary">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {gmailStatus?.connected && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-medium">Sending as</p>
                <p className="text-xs text-muted-foreground">
                  {gmailStatus.email} via {gmailStatus.method === "smtp" ? (EMAIL_PRESETS.find(p => p.id === selectedPreset)?.label || "Email Provider") : gmailStatus.method === "system_smtp" ? "Hostinger (System)" : "Email Provider"}
                </p>
              </div>
              {gmailStatus.method === "smtp" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowEmailSetup(true);
                      setEmailSetupStep("credentials");
                    }}
                    data-testid="button-edit-email"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await apiRequest("DELETE", "/api/email-settings");
                        queryClient.invalidateQueries({ queryKey: ["/api/gmail/status"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/email-settings"] });
                        setEmailSettingsLoaded(false);
                        setSmtpHost(""); setSmtpPort(587); setSmtpUser(""); setSmtpPass("");
                        setSmtpFromName(""); setSmtpFromEmail(""); setSmtpSecure(false);
                        setSelectedPreset(null);
                        setShowEmailSetup(false);
                        toast({ title: "Email disconnected" });
                      } catch {
                        toast({ title: "Failed to disconnect", variant: "destructive" });
                      }
                    }}
                    data-testid="button-disconnect-email"
                  >
                    <Unplug className="w-3.5 h-3.5 mr-1.5" />
                    Disconnect
                  </Button>
                </div>
              )}
              {gmailStatus.method === "system_smtp" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowEmailSetup(true);
                      setEmailSetupStep("pick");
                    }}
                    data-testid="button-change-email"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    Change Provider
                  </Button>
                </div>
              )}
            </div>
          )}

          {!gmailStatus?.connected && !showEmailSetup && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Connect your email to send outreach directly from FunnelFox. Works with Gmail, Outlook, Yahoo, or business email from any hosting provider.
              </p>
              <Button variant="outline" onClick={() => { setShowEmailSetup(true); setEmailSetupStep("pick"); }} data-testid="button-setup-email">
                <Mail className="w-4 h-4 mr-1.5" />
                Connect Your Email
              </Button>
            </div>
          )}

          {showEmailSetup && emailSetupStep === "pick" && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <p className="text-sm font-medium mb-1">Choose your email provider</p>
                <p className="text-xs text-muted-foreground">Select the service you use for email. FunnelFox will send outreach from your account.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Personal Email</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {EMAIL_PRESETS.filter(p => p.category === "personal").map((preset) => (
                      <Button
                        key={preset.id}
                        variant="outline"
                        className={`h-auto py-3 flex flex-col items-center gap-1 ${selectedPreset === preset.id ? "border-primary ring-1 ring-primary" : ""}`}
                        onClick={() => {
                          setSelectedPreset(preset.id);
                          setSmtpHost(preset.host);
                          setSmtpPort(preset.port);
                          setSmtpSecure(preset.secure);
                          setEmailSetupStep("credentials");
                        }}
                        data-testid={`button-preset-${preset.id}`}
                      >
                        <Mail className="w-5 h-5" />
                        <span className="text-xs">{preset.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Business / Hosting Email</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {EMAIL_PRESETS.filter(p => p.category === "business").map((preset) => (
                      <Button
                        key={preset.id}
                        variant="outline"
                        className={`h-auto py-3 flex flex-col items-center gap-1 ${selectedPreset === preset.id ? "border-primary ring-1 ring-primary" : ""}`}
                        onClick={() => {
                          setSelectedPreset(preset.id);
                          if (preset.host) {
                            setSmtpHost(preset.host);
                            setSmtpPort(preset.port);
                            setSmtpSecure(preset.secure);
                          }
                          setEmailSetupStep("credentials");
                        }}
                        data-testid={`button-preset-${preset.id}`}
                      >
                        <Server className="w-5 h-5" />
                        <span className="text-xs">{preset.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {!gmailStatus?.connected && (
                <Button variant="ghost" size="sm" onClick={() => setShowEmailSetup(false)} data-testid="button-cancel-email-setup">
                  Cancel
                </Button>
              )}
            </div>
          )}

          {showEmailSetup && emailSetupStep === "credentials" && (() => {
            const preset = EMAIL_PRESETS.find(p => p.id === selectedPreset);
            const needsServerField = !preset || preset.id === "other" || preset.host.includes("your-domain.com");
            return (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEmailSetupStep("pick"); setShowAdvancedEmail(false); }}
                    data-testid="button-back-to-providers"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <div>
                    <p className="text-sm font-medium">
                      {preset ? `Connect ${preset.label}` : "Connect Email"}
                    </p>
                    <p className="text-xs text-muted-foreground">Enter your email login details below</p>
                  </div>
                </div>

                {preset?.helpText && (
                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="text-xs text-muted-foreground">
                      <Info className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                      {preset.helpText}
                    </p>
                  </div>
                )}

                {(needsServerField || showAdvancedEmail) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mail Server</Label>
                      <Input
                        placeholder={preset?.host.includes("your-domain.com") ? "mail.yourdomain.com" : "smtp.example.com"}
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        data-testid="input-smtp-host"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {preset?.host.includes("your-domain.com") ? "Replace with your actual domain name" : "Your email provider's outgoing mail server"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Port</Label>
                      <Input
                        type="number"
                        placeholder="465"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                        data-testid="input-smtp-port"
                      />
                      <p className="text-[11px] text-muted-foreground">Usually 465 or 587</p>
                    </div>
                  </div>
                )}

                {!needsServerField && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowAdvancedEmail(!showAdvancedEmail)}
                    data-testid="button-advanced-email"
                  >
                    {showAdvancedEmail ? "Hide advanced settings" : "Show advanced settings"}
                  </button>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Email Address</Label>
                  <Input
                    placeholder="you@example.com"
                    value={smtpUser}
                    onChange={(e) => {
                      setSmtpUser(e.target.value);
                      if (!smtpFromEmail || smtpFromEmail === smtpUser) {
                        setSmtpFromEmail(e.target.value);
                      }
                    }}
                    autoComplete="email"
                    inputMode="email"
                    data-testid="input-smtp-user"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {preset?.id === "gmail" ? "App Password" : preset?.id === "yahoo" ? "App Password" : "Password"}
                  </Label>
                  <Input
                    type="password"
                    placeholder={emailSettings?.hasPassword ? "Leave blank to keep current" : preset?.id === "gmail" ? "16-character app password" : "Your email password"}
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    autoComplete="current-password"
                    data-testid="input-smtp-pass"
                  />
                  {preset?.id === "gmail" && (
                    <p className="text-[11px] text-muted-foreground">
                      This is NOT your Google password. Create an App Password at myaccount.google.com/apppasswords
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Your Name (shown in emails)</Label>
                    <Input
                      placeholder="John Smith"
                      value={smtpFromName}
                      onChange={(e) => setSmtpFromName(e.target.value)}
                      data-testid="input-smtp-from-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Send From (email address)</Label>
                    <Input
                      placeholder="you@example.com"
                      value={smtpFromEmail}
                      onChange={(e) => setSmtpFromEmail(e.target.value)}
                      autoComplete="email"
                      inputMode="email"
                      data-testid="input-smtp-from-email"
                    />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={testingEmail || !smtpHost || !smtpUser || !smtpFromEmail}
                    onClick={async () => {
                      setTestingEmail(true);
                      try {
                        const res = await apiRequest("POST", "/api/email-settings/test", {
                          smtpHost, smtpPort, smtpUser,
                          smtpPass: smtpPass || "••••••••",
                          smtpFromName, smtpFromEmail, smtpSecure,
                        });
                        const data = await res.json();
                        if (data.success) {
                          toast({ title: "Connection successful", description: "Your email is working correctly." });
                        } else {
                          toast({ title: "Connection failed", description: data.error, variant: "destructive" });
                        }
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : "Test failed";
                        toast({ title: "Connection failed", description: msg, variant: "destructive" });
                      }
                      setTestingEmail(false);
                    }}
                    data-testid="button-test-email"
                  >
                    {testingEmail ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                    {testingEmail ? "Testing..." : "Test Connection"}
                  </Button>
                  <Button
                    size="sm"
                    disabled={savingEmail || !smtpHost || !smtpUser || !smtpFromEmail}
                    onClick={async () => {
                      setSavingEmail(true);
                      try {
                        await apiRequest("POST", "/api/email-settings", {
                          smtpHost, smtpPort, smtpUser,
                          smtpPass: smtpPass || "••••••••",
                          smtpFromName, smtpFromEmail, smtpSecure,
                        });
                        queryClient.invalidateQueries({ queryKey: ["/api/gmail/status"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/email-settings"] });
                        setShowEmailSetup(false);
                        toast({ title: "Email connected", description: "You can now send outreach emails directly from FunnelFox." });
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : "Save failed";
                        toast({ title: "Failed to save", description: msg, variant: "destructive" });
                      }
                      setSavingEmail(false);
                    }}
                    data-testid="button-save-email"
                  >
                    {savingEmail ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                    {savingEmail ? "Connecting..." : "Connect Email"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowEmailSetup(false); setEmailSetupStep("pick"); }} data-testid="button-cancel-email-setup">
                    Cancel
                  </Button>
                </div>
              </div>
            );
          })()}
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
