import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Building2,
  Globe,
  SlidersHorizontal,
  X,
  NotebookPen,
  Trash2,
  Star,
  Send,
  Download,
  ArrowRight,
  Flame,
  Clock,
  History,
  Copy,
  Check,
  Camera,
  Cpu,
  Shield,
  Zap,
  Eye,
  SearchCode,
  Server,
  BarChart3,
  ShoppingCart,
  Cloud,
  Layout,
  Wrench,
  Award,
  FileText,
  Bot,
  ChevronDown,
  Clipboard,
  Table2,
  FileJson,
  Sheet,
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX, SiTiktok, SiLinkedin, SiYoutube, SiPinterest } from "react-icons/si";
import type { Lead } from "@shared/schema";
import { PIPELINE_STAGES } from "@shared/schema";
import type { Activity } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmailTemplateDialog } from "@/components/email-template-dialog";
import { calculateLeadScore, getScoreColor } from "@/lib/lead-scoring";
import * as XLSX from "xlsx";

const STAGE_TEXT_COLORS: Record<string, string> = {
  "chart-1": "text-chart-1",
  "chart-2": "text-chart-2",
  "chart-3": "text-chart-3",
  "chart-4": "text-chart-4",
  "chart-5": "text-chart-5",
  "primary": "text-primary",
  "destructive": "text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  const stage = PIPELINE_STAGES.find((s) => s.value === status);
  if (!stage) {
    return (
      <Badge variant="outline" className="border-0 bg-muted text-muted-foreground">
        {status}
      </Badge>
    );
  }
  const textColor = STAGE_TEXT_COLORS[stage.color] || "";
  return (
    <Badge variant="outline" className={`${textColor} border-0 bg-muted`}>
      {stage.label}
    </Badge>
  );
}

const SOCIAL_ICONS: Record<string, typeof SiFacebook> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  twitter: SiX,
  tiktok: SiTiktok,
  linkedin: SiLinkedin,
  youtube: SiYoutube,
  pinterest: SiPinterest,
};

function parseSocialMedia(socialMedia: string[] | null | undefined): { platform: string; url: string }[] {
  if (!socialMedia?.length) return [];
  return socialMedia.map((s) => {
    const colonIdx = s.indexOf(":");
    if (colonIdx === -1) return { platform: s, url: "" };
    return { platform: s.slice(0, colonIdx), url: s.slice(colonIdx + 1) };
  });
}

function SocialMediaIcons({ socialMedia, size = "sm" }: { socialMedia: string[] | null | undefined; size?: "sm" | "md" }) {
  const parsed = parseSocialMedia(socialMedia);
  if (!parsed.length) return null;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  return (
    <div className="flex items-center gap-1.5">
      {parsed.map(({ platform, url }) => {
        const Icon = SOCIAL_ICONS[platform];
        if (!Icon) return null;
        return url ? (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`link-social-${platform}`}
          >
            <Icon className={iconSize} />
          </a>
        ) : (
          <Icon key={platform} className={`${iconSize} text-muted-foreground`} />
        );
      })}
    </div>
  );
}

function getGrade(score: number): { letter: string; color: string; bg: string } {
  if (score >= 90) return { letter: "A", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" };
  if (score >= 80) return { letter: "B", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" };
  if (score >= 70) return { letter: "C", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30" };
  if (score >= 50) return { letter: "D", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" };
  return { letter: "F", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" };
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const grade = getGrade(score);
  return (
    <div className="flex items-center gap-1.5" data-testid="badge-website-score">
      <div className={`text-sm font-bold rounded-md px-1.5 py-0.5 ${grade.color} ${grade.bg}`}>{grade.letter}</div>
      <div className="text-xs text-muted-foreground">{score}/100</div>
    </div>
  );
}

function PriorityBadge({ lead }: { lead: Lead }) {
  const { label } = calculateLeadScore(lead);
  if (label === "Cold") return null;
  const color = getScoreColor(label);
  return (
    <Badge variant="secondary" className={`text-[10px] ${color}`} data-testid={`badge-priority-${lead.id}`}>
      <Flame className="w-2.5 h-2.5 mr-0.5" />
      {label}
    </Badge>
  );
}

function ActivityTimeline({ leadId }: { leadId: number }) {
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/leads", leadId, "activities"],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/activities`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (activities.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">No activity recorded yet</p>
    );
  }

  const ACTION_LABELS: Record<string, string> = {
    stage_changed: "Stage changed",
    notes_updated: "Notes updated",
    created: "Lead created",
    deleted: "Lead deleted",
  };

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {activities.slice(0, 20).map((activity) => (
        <div key={activity.id} className="flex items-start gap-2 text-xs" data-testid={`activity-${activity.id}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-medium">{ACTION_LABELS[activity.action] || activity.action}</span>
            {activity.details && (
              <span className="text-muted-foreground ml-1">{activity.details}</span>
            )}
            <div className="text-muted-foreground mt-0.5">
              {new Date(activity.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: `${label} copied` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };
  return (
    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleCopy(); }} data-testid={`button-copy-${label.toLowerCase().replace(/\s/g, "-")}`}>
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

function LeadDetailDialog({
  lead,
  open,
  onClose,
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/leads/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (lead) queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "activities"] });
      toast({ title: "Lead updated" });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await apiRequest("PATCH", `/api/leads/${id}`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (lead) queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "activities"] });
      toast({ title: "Notes saved" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead deleted" });
      onClose();
    },
  });

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  if (!lead) return null;

  const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";
  const leadScore = calculateLeadScore(lead);

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Building2 className="w-5 h-5 text-primary shrink-0" />
            <span className="break-words min-w-0">{lead.companyName}</span>
          </DialogTitle>
          <DialogDescription>Lead details and contact information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={lead.status} />
            <ScoreBadge score={lead.websiteScore} />
            {lead.industry && (
              <Badge variant="secondary" className="text-xs">{lead.industry}</Badge>
            )}
            {noWebsite && (
              <Badge variant="secondary" className="text-xs">No website</Badge>
            )}
            {leadScore.label !== "Cold" && (
              <Badge variant="secondary" className={`text-xs ${getScoreColor(leadScore.label)}`}>
                <Flame className="w-3 h-3 mr-0.5" />
                {leadScore.label} ({leadScore.score})
              </Badge>
            )}
          </div>

          {leadScore.reasons.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {leadScore.reasons.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 shrink-0" />
                  {r}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {!noWebsite && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <a
                  href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 truncate"
                  data-testid="link-lead-website"
                >
                  {lead.websiteUrl}
                </a>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span data-testid="text-contact-name">{lead.contactName || <span className="text-muted-foreground italic">Not found</span>}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              {lead.contactEmail ? (
                <>
                  <button
                    onClick={() => setEmailDialogOpen(true)}
                    className="text-primary underline underline-offset-2 text-left bg-transparent border-0 cursor-pointer p-0 flex-1 truncate"
                    data-testid="link-contact-email"
                  >
                    {lead.contactEmail}
                  </button>
                  <CopyButton value={lead.contactEmail} label="Email" />
                </>
              ) : (
                <span className="text-muted-foreground italic" data-testid="text-no-email">Not found</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              {lead.contactPhone ? (
                <>
                  <a href={`tel:${lead.contactPhone}`} className="text-primary underline underline-offset-2 flex-1" data-testid="link-contact-phone">
                    {lead.contactPhone}
                  </a>
                  <CopyButton value={lead.contactPhone} label="Phone" />
                </>
              ) : (
                <span className="text-muted-foreground italic" data-testid="text-no-phone">Not found</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span data-testid="text-lead-location">{lead.location || <span className="text-muted-foreground italic">Not found</span>}</span>
            </div>
          </div>

          {lead.socialMedia && lead.socialMedia.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Social Media</p>
              <div className="space-y-2">
                {parseSocialMedia(lead.socialMedia).map(({ platform, url }) => {
                  const Icon = SOCIAL_ICONS[platform];
                  if (!Icon) return null;
                  return (
                    <div key={platform} className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline underline-offset-2 truncate flex-1"
                        data-testid={`link-social-detail-${platform}`}
                      >
                        {url}
                      </a>
                      <CopyButton value={url} label={platform} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {noWebsite && lead.socialMedia && lead.socialMedia.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-chart-4/10">
              <Star className="w-4 h-4 text-chart-4 shrink-0" />
              <span className="text-xs font-medium text-chart-4">High-value lead: Has social media but no website</span>
            </div>
          )}

          {lead.websiteIssues && lead.websiteIssues.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-medium text-muted-foreground">Website Analysis</p>
                {lead.websiteScore !== null && lead.websiteScore !== undefined && (
                  <ScoreBadge score={lead.websiteScore} />
                )}
              </div>
              {(() => {
                const catConfig = [
                  { key: "Performance", icon: Zap, maxDeductions: 40 },
                  { key: "SEO", icon: SearchCode, maxDeductions: 25 },
                  { key: "Accessibility", icon: Eye, maxDeductions: 25 },
                  { key: "Security", icon: Shield, maxDeductions: 30 },
                  { key: "Other", icon: Globe, maxDeductions: 20 },
                ] as const;
                const categories: Record<string, string[]> = {
                  "Performance": [], "SEO": [], "Accessibility": [], "Security": [], "Other": [],
                };
                for (const issue of lead.websiteIssues) {
                  const lower = issue.toLowerCase();
                  if (lower.includes("performance") || lower.includes("load time") || lower.includes("page size") || lower.includes("lazy") || lower.includes("minif") || lower.includes("resources") || lower.includes("slow") || lower.includes("render-blocking") || lower.includes("first paint") || lower.includes("inline css") || lower.includes("inline javascript") || lower.includes("layout shift") || lower.includes("preload") || lower.includes("preconnect") || lower.includes("image format") || lower.includes("webp") || lower.includes("font-display") || lower.includes("width/height")) {
                    categories["Performance"].push(issue);
                  } else if (lower.includes("seo") || lower.includes("meta") || lower.includes("title") || lower.includes("canonical") || lower.includes("structured data") || lower.includes("h1") || lower.includes("heading") || lower.includes("open graph") || lower.includes("sitemap") || lower.includes("favicon") || lower.includes("social sharing") || lower.includes("crawlability") || lower.includes("twitter")) {
                    categories["SEO"].push(issue);
                  } else if (lower.includes("accessibility") || lower.includes("aria") || lower.includes("alt text") || lower.includes("label") || lower.includes("lang") || lower.includes("focus") || lower.includes("tabindex") || lower.includes("screen reader") || lower.includes("keyboard") || lower.includes("iframe")) {
                    categories["Accessibility"].push(issue);
                  } else if (lower.includes("https") || lower.includes("security") || lower.includes("csp") || lower.includes("x-frame") || lower.includes("x-content") || lower.includes("hsts") || lower.includes("mixed content") || lower.includes("clickjacking")) {
                    categories["Security"].push(issue);
                  } else {
                    categories["Other"].push(issue);
                  }
                }

                function getCategoryScore(issueCount: number, maxDeductions: number): number {
                  const deductionPerIssue = maxDeductions / 8;
                  return Math.max(0, Math.round(100 - issueCount * deductionPerIssue));
                }

                return (
                  <div className="space-y-3">
                    {catConfig.map(({ key, icon: Icon, maxDeductions }) => {
                      const issues = categories[key];
                      if (issues.length === 0) return null;
                      const catScore = getCategoryScore(issues.length, maxDeductions);
                      const grade = getGrade(catScore);
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium flex-1">{key}</span>
                            <span className={`text-[10px] font-bold ${grade.color}`}>{grade.letter}</span>
                            <span className="text-[10px] text-muted-foreground">{issues.length} {issues.length === 1 ? "issue" : "issues"}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-muted mb-2 ml-5.5">
                            <div
                              className={`h-full rounded-full transition-all ${catScore >= 80 ? "bg-emerald-500" : catScore >= 60 ? "bg-yellow-500" : catScore >= 40 ? "bg-orange-500" : "bg-red-500"}`}
                              style={{ width: `${catScore}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-1 ml-5.5">
                            {issues.map((issue, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {lead.detectedTechnologies && lead.detectedTechnologies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Detected Technologies</p>
              <div className="flex flex-wrap gap-1.5">
                {lead.detectedTechnologies.map((tech, i) => {
                  const [category, value] = tech.includes(": ") ? tech.split(": ", 2) : ["Tech", tech];
                  const techIcons: Record<string, typeof Cpu> = {
                    "CMS": Layout,
                    "Framework": Cpu,
                    "UI": Layout,
                    "Server": Server,
                    "Hosting": Cloud,
                    "E-commerce": ShoppingCart,
                    "Analytics": BarChart3,
                    "Tool": Wrench,
                  };
                  const TechIcon = techIcons[category] || Cpu;
                  return (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1" data-testid={`badge-tech-${i}`}>
                      <TechIcon className="w-2.5 h-2.5" />
                      <span className="text-muted-foreground">{category}:</span> {value}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {(lead.bbbRating || lead.googleRating != null || lead.hasSitemap != null || lead.hasRobotsTxt != null) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Business Intelligence</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lead.bbbRating && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid="info-bbb-rating">
                    <Award className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">BBB Rating</p>
                      <p className="text-sm font-semibold">
                        {lead.bbbRating}
                        {lead.bbbAccredited && (
                          <Badge variant="secondary" className="ml-1.5 text-[9px]">Accredited</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {lead.googleRating != null && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid="info-google-rating">
                    <Star className="w-4 h-4 text-yellow-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Google Rating</p>
                      <p className="text-sm font-semibold">
                        {lead.googleRating.toFixed(1)}
                        {lead.googleReviewCount != null && (
                          <span className="text-xs text-muted-foreground font-normal ml-1">({lead.googleReviewCount.toLocaleString()} reviews)</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {lead.hasSitemap != null && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid="info-sitemap">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Sitemap</p>
                      <p className={`text-sm font-medium ${lead.hasSitemap ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {lead.hasSitemap ? "Found" : "Missing"}
                      </p>
                    </div>
                  </div>
                )}
                {lead.hasRobotsTxt != null && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid="info-robots">
                    <Bot className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Robots.txt</p>
                      <p className={`text-sm font-medium ${lead.hasRobotsTxt ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {lead.hasRobotsTxt ? "Found" : "Missing"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {lead.sitemapIssues && lead.sitemapIssues.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {lead.sitemapIssues.map((issue, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{issue}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {!noWebsite && lead.screenshotUrl && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Website Screenshot</p>
              </div>
              <div className="rounded-md border overflow-hidden">
                <img
                  src={lead.screenshotUrl}
                  alt={`Screenshot of ${lead.companyName}'s website`}
                  className="w-full h-auto"
                  loading="lazy"
                  data-testid="img-website-screenshot"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingNotes(!editingNotes);
                  setNotesValue(lead.notes || "");
                }}
                data-testid="button-edit-notes"
              >
                <NotebookPen className="w-3.5 h-3.5 mr-1" />
                {editingNotes ? "Cancel" : "Edit"}
              </Button>
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Add notes about this lead..."
                  className="text-sm"
                  data-testid="input-notes"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    updateNotesMutation.mutate({ id: lead.id, notes: notesValue });
                    setEditingNotes(false);
                  }}
                  disabled={updateNotesMutation.isPending}
                  data-testid="button-save-notes"
                >
                  Save Notes
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-lead-notes">
                {lead.notes || "No notes yet"}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Move to Stage</p>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
              {PIPELINE_STAGES.map((stage) => (
                <Button
                  key={stage.value}
                  size="sm"
                  variant={lead.status === stage.value ? "default" : "outline"}
                  className="text-xs toggle-elevate"
                  onClick={() => updateMutation.mutate({ id: lead.id, status: stage.value })}
                  disabled={updateMutation.isPending || lead.status === stage.value}
                  data-testid={`button-status-${stage.value}`}
                >
                  {stage.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium text-muted-foreground">Activity Timeline</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTimeline(!showTimeline)}
                data-testid="button-toggle-timeline"
              >
                <History className="w-3.5 h-3.5 mr-1" />
                {showTimeline ? "Hide" : "Show"}
              </Button>
            </div>
            {showTimeline && <ActivityTimeline leadId={lead.id} />}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t">
            {lead.contactEmail && (
              <Button
                size="sm"
                onClick={() => setEmailDialogOpen(true)}
                className="w-full sm:w-auto"
                data-testid="button-email-lead"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Email Lead
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive w-full sm:w-auto"
              onClick={() => deleteMutation.mutate(lead.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-lead"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete Lead
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {lead.contactEmail && (
      <EmailTemplateDialog
        key={lead.id}
        lead={lead}
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
      />
    )}
    </>
  );
}

export default function LeadsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "priority">("date");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStage, setBulkStage] = useState("");

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("POST", "/api/leads/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedIds(new Set());
      toast({ title: "Leads deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete leads", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, data }: { ids: number[]; data: Record<string, string> }) => {
      await apiRequest("POST", "/api/leads/bulk-update", { ids, data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedIds(new Set());
      setBulkStage("");
      toast({ title: "Leads updated" });
    },
    onError: () => {
      toast({ title: "Failed to update leads", variant: "destructive" });
    },
  });

  const industries = Array.from(new Set(leads.map((l) => l.industry).filter(Boolean)));

  const filtered = leads.filter((lead) => {
    const matchesSearch =
      !search ||
      lead.companyName.toLowerCase().includes(search.toLowerCase()) ||
      lead.websiteUrl.toLowerCase().includes(search.toLowerCase()) ||
      (lead.contactName && lead.contactName.toLowerCase().includes(search.toLowerCase())) ||
      (lead.location && lead.location.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesIndustry = industryFilter === "all" || lead.industry === industryFilter;
    return matchesSearch && matchesStatus && matchesIndustry;
  });

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "priority") {
      arr.sort((a, b) => calculateLeadScore(b).score - calculateLeadScore(a).score);
    } else {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return arr;
  }, [filtered, sortBy]);

  const hasFilters = search || statusFilter !== "all" || industryFilter !== "all";
  const isSelectMode = selectedIds.size > 0;

  function toggleSelect(id: number, e?: { stopPropagation: () => void }) {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((l) => l.id)));
    }
  }

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMenuTarget, setExportMenuTarget] = useState<"all" | "selected">("all");
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    if (showExportMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showExportMenu]);

  function getExportData(leadsToExport?: Lead[]) {
    const data = leadsToExport || sorted;
    const stageLabel = (val: string) => PIPELINE_STAGES.find((s) => s.value === val)?.label || val;
    return data.map((lead) => ({
      "Company Name": lead.companyName,
      "Website": lead.websiteUrl === "none" ? "" : lead.websiteUrl,
      "Contact Name": lead.contactName || "",
      "Email": lead.contactEmail || "",
      "Phone": lead.contactPhone || "",
      "Industry": lead.industry || "",
      "Location": lead.location || "",
      "Stage": stageLabel(lead.status),
      "Website Score": lead.websiteScore != null ? lead.websiteScore : "",
      "Website Issues": (lead.websiteIssues || []).join("; "),
      "Social Media": (lead.socialMedia || []).map((s) => { const i = s.indexOf(":"); return i > -1 ? s.slice(i + 1) : s; }).join("; "),
      "Priority": calculateLeadScore(lead).label,
      "Notes": lead.notes || "",
      "Source": lead.source || "",
      "Date Added": lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "",
    }));
  }

  function downloadFile(content: string | ArrayBuffer, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportToCSV(leadsToExport?: Lead[]) {
    const rows = getExportData(leadsToExport);
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const escapeCSV = (val: any) => {
      const s = String(val ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const csvRows = rows.map((r) => headers.map((h) => escapeCSV(r[h as keyof typeof r])).join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
    downloadFile(csv, `leads_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
    toast({ title: "CSV exported", description: `${rows.length} leads exported to CSV.` });
    setShowExportMenu(false);
  }

  function exportToExcel(leadsToExport?: Lead[]) {
    const rows = getExportData(leadsToExport);
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] ?? "").length).slice(0, 50)) + 2,
    }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadFile(buffer, `leads_${new Date().toISOString().slice(0, 10)}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    toast({ title: "Excel exported", description: `${rows.length} leads exported to Excel.` });
    setShowExportMenu(false);
  }

  function exportToJSON(leadsToExport?: Lead[]) {
    const rows = getExportData(leadsToExport);
    if (rows.length === 0) return;
    const json = JSON.stringify(rows, null, 2);
    downloadFile(json, `leads_${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    toast({ title: "JSON exported", description: `${rows.length} leads exported to JSON.` });
    setShowExportMenu(false);
  }

  function copyToClipboard(leadsToExport?: Lead[]) {
    const rows = getExportData(leadsToExport);
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const tsvRows = rows.map((r) => headers.map((h) => String(r[h as keyof typeof r] ?? "").replace(/\t/g, " ")).join("\t"));
    const tsv = [headers.join("\t"), ...tsvRows].join("\n");
    navigator.clipboard.writeText(tsv).then(() => {
      toast({ title: "Copied to clipboard", description: `${rows.length} leads copied as tab-separated data. Paste into Google Sheets, Excel, or Airtable.` });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" });
    });
    setShowExportMenu(false);
  }

  function openExportMenu(target: "all" | "selected") {
    setExportMenuTarget(target);
    setShowExportMenu(true);
  }

  function getExportLeads() {
    if (exportMenuTarget === "selected") {
      return sorted.filter((l) => selectedIds.has(l.id));
    }
    return sorted;
  }

  function ExportMenuPopover({ anchorRef }: { anchorRef?: React.RefObject<HTMLDivElement | null> }) {
    if (!showExportMenu) return null;
    const leadsData = getExportLeads();
    const count = leadsData.length;
    return (
      <div
        ref={exportMenuRef}
        className="absolute right-0 top-full mt-1 z-50 w-56 rounded-md border bg-popover p-1 shadow-md"
        data-testid="export-menu"
      >
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Export {count} lead{count !== 1 ? "s" : ""}
        </p>
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover-elevate cursor-pointer"
          onClick={() => exportToCSV(leadsData)}
          data-testid="export-csv"
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
          CSV (.csv)
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover-elevate cursor-pointer"
          onClick={() => exportToExcel(leadsData)}
          data-testid="export-excel"
        >
          <Table2 className="w-4 h-4 text-emerald-600" />
          Excel (.xlsx)
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover-elevate cursor-pointer"
          onClick={() => exportToJSON(leadsData)}
          data-testid="export-json"
        >
          <FileJson className="w-4 h-4 text-blue-500" />
          JSON (.json)
        </button>
        <div className="my-1 h-px bg-border" />
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover-elevate cursor-pointer"
          onClick={() => copyToClipboard(leadsData)}
          data-testid="export-clipboard"
        >
          <Clipboard className="w-4 h-4 text-muted-foreground" />
          Copy to Clipboard
        </button>
        <p className="px-2 py-1 text-[10px] text-muted-foreground leading-tight mt-0.5">
          Paste directly into Google Sheets or Airtable
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-3 flex-wrap">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-leads-title">All Leads</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {leads.length} lead{leads.length !== 1 ? "s" : ""} in your pipeline
        </p>
      </div>

      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 sm:flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-leads"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] sm:w-[160px]" data-testid="select-status-filter">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {industries.length > 0 && (
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[130px] sm:w-[150px]" data-testid="select-industry-filter">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((ind) => (
                  <SelectItem key={ind!} value={ind!}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "priority")}>
            <SelectTrigger className="w-[130px]" data-testid="select-sort">
              {sortBy === "priority" ? (
                <Flame className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              ) : (
                <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setIndustryFilter("all");
              }}
              data-testid="button-clear-filters"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openExportMenu("all")}
              disabled={sorted.length === 0}
              data-testid="button-export"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
            {showExportMenu && exportMenuTarget === "all" && <ExportMenuPopover />}
          </div>
        </div>
      </div>

      {isSelectMode && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted flex-wrap" data-testid="bulk-actions-bar">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-border" />
          <Select value={bulkStage} onValueChange={(v) => {
            setBulkStage(v);
            bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), data: { status: v } });
          }} disabled={bulkUpdateMutation.isPending}>
            <SelectTrigger className="w-[150px]" data-testid="select-bulk-stage">
              <ArrowRight className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Move to stage" />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openExportMenu("selected")}
              data-testid="button-bulk-export"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
            {showExportMenu && exportMenuTarget === "selected" && <ExportMenuPopover />}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              if (confirm(`Delete ${selectedIds.size} lead${selectedIds.size > 1 ? "s" : ""}?`)) {
                bulkDeleteMutation.mutate(Array.from(selectedIds));
              }
            }}
            disabled={bulkDeleteMutation.isPending}
            data-testid="button-bulk-delete"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            data-testid="button-deselect-all"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Deselect
          </Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-base font-medium mb-1">
              {hasFilters ? "No matching leads" : "No leads yet"}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {hasFilters
                ? "Try adjusting your filters or search terms"
                : "Add your first lead to start building your pipeline"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.length > 1 && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={selectedIds.size === sorted.length}
                onCheckedChange={toggleSelectAll}
                data-testid="checkbox-select-all"
              />
              <span className="text-xs text-muted-foreground">
                Select all ({sorted.length})
              </span>
            </div>
          )}
          {sorted.map((lead) => {
            const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";
            const isSelected = selectedIds.has(lead.id);
            return (
              <Card
                key={lead.id}
                className={`hover-elevate cursor-pointer ${isSelected ? "ring-1 ring-primary" : ""}`}
                onClick={() => setSelectedLead(lead)}
                data-testid={`card-lead-${lead.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5" onClick={(e) => { e.stopPropagation(); toggleSelect(lead.id); }}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(lead.id)}
                        data-testid={`checkbox-lead-${lead.id}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold truncate" data-testid={`text-company-name-${lead.id}`}>
                          {lead.companyName}
                        </h3>
                        <StatusBadge status={lead.status} />
                        <PriorityBadge lead={lead} />
                        {noWebsite && (
                          <Badge variant="secondary" className="text-[10px]">
                            No site
                          </Badge>
                        )}
                        {noWebsite && lead.socialMedia && lead.socialMedia.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] text-chart-4">
                            <Star className="w-2.5 h-2.5 mr-0.5" />
                            High value
                          </Badge>
                        )}
                        <SocialMediaIcons socialMedia={lead.socialMedia} size="sm" />
                        {lead.googleRating != null && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Star className="w-2.5 h-2.5 text-yellow-500" />
                            {lead.googleRating.toFixed(1)}
                          </span>
                        )}
                        {lead.bbbRating && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Award className="w-2.5 h-2.5" />
                            BBB: {lead.bbbRating}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {!noWebsite && (
                          <span className="flex items-center gap-1 truncate">
                            <Globe className="w-3 h-3 shrink-0" />
                            {lead.websiteUrl}
                          </span>
                        )}
                        {lead.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {lead.location}
                          </span>
                        )}
                        {lead.industry && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 shrink-0" />
                            {lead.industry}
                          </span>
                        )}
                      </div>
                      {lead.contactName && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Contact: {lead.contactName}
                          {lead.contactEmail && ` - ${lead.contactEmail}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <ScoreBadge score={lead.websiteScore} />
                      {!noWebsite && (
                        <a
                          href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hidden sm:block"
                          data-testid={`link-visit-site-${lead.id}`}
                        >
                          <Button size="icon" variant="ghost">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LeadDetailDialog
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
