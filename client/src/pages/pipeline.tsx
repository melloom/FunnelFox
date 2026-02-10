import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe,
  MapPin,
  Building2,
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Star,
  Copy,
  Check,
  Send,
  Award,
  FileText,
  Bot,
  Camera,
  Flame,
  NotebookPen,
  Zap,
  SearchCode,
  Eye,
  Shield,
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX, SiTiktok, SiLinkedin, SiYoutube, SiPinterest } from "react-icons/si";
import type { Lead } from "@shared/schema";
import { PIPELINE_STAGES } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmailTemplateDialog } from "@/components/email-template-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { calculateLeadScore, getScoreColor } from "@/lib/lead-scoring";

const STAGE_COLORS: Record<string, string> = {
  "chart-1": "bg-chart-1",
  "chart-2": "bg-chart-2",
  "chart-3": "bg-chart-3",
  "chart-4": "bg-chart-4",
  "chart-5": "bg-chart-5",
  "primary": "bg-primary",
  "destructive": "bg-destructive",
};

const STAGE_TEXT_COLORS: Record<string, string> = {
  "chart-1": "text-chart-1",
  "chart-2": "text-chart-2",
  "chart-3": "text-chart-3",
  "chart-4": "text-chart-4",
  "chart-5": "text-chart-5",
  "primary": "text-primary",
  "destructive": "text-destructive",
};

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
    <div className="flex items-center gap-1.5">
      <div className={`text-[11px] font-bold rounded px-1 py-0.5 ${grade.color} ${grade.bg}`}>{grade.letter}</div>
      <span className="text-[10px] text-muted-foreground">{score}</span>
    </div>
  );
}

function LeadCard({
  lead,
  onSelect,
}: {
  lead: Lead;
  onSelect: (lead: Lead) => void;
}) {
  const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";

  return (
    <Card
      className="hover-elevate cursor-pointer"
      onClick={() => onSelect(lead)}
      data-testid={`card-pipeline-lead-${lead.id}`}
    >
      <CardContent className="p-3">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-semibold truncate flex-1" data-testid={`text-pipeline-company-${lead.id}`}>
              {lead.companyName}
            </h4>
            <ScoreBadge score={lead.websiteScore} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {noWebsite && (
              <Badge variant="secondary" className="text-[10px]">
                No website
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
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <Star className="w-2.5 h-2.5 text-yellow-500" />
                {lead.googleRating.toFixed(1)}
              </span>
            )}
            {lead.bbbRating && (
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <Award className="w-2.5 h-2.5" />
                {lead.bbbRating}
              </span>
            )}
          </div>
          {lead.detectedTechnologies && lead.detectedTechnologies.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.detectedTechnologies.slice(0, 3).map((tech, i) => {
                const value = tech.includes(": ") ? tech.split(": ", 2)[1] : tech;
                return (
                  <Badge key={i} variant="outline" className="text-[9px] px-1 py-0">
                    {value}
                  </Badge>
                );
              })}
              {lead.detectedTechnologies.length > 3 && (
                <span className="text-[9px] text-muted-foreground">
                  +{lead.detectedTechnologies.length - 3}
                </span>
              )}
            </div>
          )}
          {lead.websiteIssues && lead.websiteIssues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.websiteIssues.slice(0, 2).map((issue, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-destructive/10 text-destructive px-1 py-0.5 rounded-md"
                >
                  {issue}
                </span>
              ))}
              {lead.websiteIssues.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{lead.websiteIssues.length - 2}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            {lead.location && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="w-2.5 h-2.5 shrink-0" />
                {lead.location}
              </span>
            )}
            {lead.industry && (
              <span className="flex items-center gap-0.5 truncate">
                <Building2 className="w-2.5 h-2.5 shrink-0" />
                {lead.industry}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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

function PipelineLeadDetailDialog({
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
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/leads"] });
      const prev = queryClient.getQueryData<Lead[]>(["/api/leads"]);
      if (prev) {
        queryClient.setQueryData<Lead[]>(["/api/leads"], prev.map(l => l.id === id ? { ...l, status: status as Lead["status"] } : l));
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["/api/leads"], context.prev);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead moved" });
      onClose();
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

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await apiRequest("PATCH", `/api/leads/${id}`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Notes saved" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (data: { id: number; location?: string; socialMedia?: string[] }) => {
      await apiRequest("PATCH", `/api/leads/${data.id}`, {
        location: data.location,
        socialMedia: data.socialMedia,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead updated successfully" });
      setEditingLead(false);
    },
  });

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [editingLead, setEditingLead] = useState(false);
  const [editForm, setEditForm] = useState({
    location: "",
    socialMedia: [] as string[],
  });

  useEffect(() => {
    if (lead) {
      setEditForm({
        location: lead.location || "",
        socialMedia: lead.socialMedia || [],
      });
    }
  }, [lead]);

  if (!lead) return null;

  const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";
  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.value === lead.status);
  const currentStage = PIPELINE_STAGES[currentStageIndex];

  const screenshotUrl = lead.screenshotUrl || (!noWebsite && lead.websiteUrl ? `https://image.thum.io/get/width/1280/crop/800/noanimate/${lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`}` : null);

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-sm:text-sm">
        <div className="flex items-center gap-2 sm:hidden mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-pipeline-detail-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">Back to pipeline</span>
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Building2 className="w-5 h-5 text-primary shrink-0" />
            <span className="break-words min-w-0">{lead.companyName}</span>
          </DialogTitle>
          <DialogDescription className="max-sm:text-xs">Manage this lead in your pipeline</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 mt-1 sm:mt-2">
          <div className="flex items-center gap-2 flex-wrap">
            {currentStage && (
              <Badge variant="outline" className={`${STAGE_TEXT_COLORS[currentStage.color] || ""} border-0 bg-muted`}>
                {currentStage.label}
              </Badge>
            )}
            <ScoreBadge score={lead.websiteScore} />
            {noWebsite && (
              <Badge variant="secondary" className="text-xs">
                No website
              </Badge>
            )}
            {(() => {
              const leadScore = calculateLeadScore(lead);
              if (leadScore.label === "Cold") return null;
              return (
                <Badge variant="secondary" className={`text-xs ${getScoreColor(leadScore.label)}`}>
                  <Flame className="w-3 h-3 mr-0.5" />
                  {leadScore.label} ({leadScore.score})
                </Badge>
              );
            })()}
          </div>

          <div className="space-y-2.5">
            {!noWebsite && (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <a
                  href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 truncate"
                  data-testid="link-pipeline-lead-website"
                >
                  {lead.websiteUrl}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{lead.contactName || <span className="text-muted-foreground italic">Not found</span>}</span>
            </div>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              {lead.contactEmail ? (
                <>
                  <button
                    onClick={() => setEmailDialogOpen(true)}
                    className="text-primary underline underline-offset-2 truncate text-left bg-transparent border-0 cursor-pointer p-0 flex-1"
                    data-testid="link-pipeline-contact-email"
                  >
                    {lead.contactEmail}
                  </button>
                  <CopyButton value={lead.contactEmail} label="Email" />
                </>
              ) : (
                <span className="text-muted-foreground italic">Not found</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              {lead.contactPhone ? (
                <>
                  <a href={`tel:${lead.contactPhone}`} className="text-primary underline underline-offset-2 flex-1">
                    {lead.contactPhone}
                  </a>
                  <CopyButton value={lead.contactPhone} label="Phone" />
                </>
              ) : (
                <span className="text-muted-foreground italic">Not found</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{lead.location || <span className="text-muted-foreground italic">Not found</span>}</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingLead(true)}
              className="text-xs"
            >
              Edit Lead Info
            </Button>
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
                        <details key={key} className="group">
                          <summary className="flex items-center gap-2 mb-1.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                            <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-open:rotate-0 -rotate-90" />
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium flex-1">{key}</span>
                            <span className={`text-[10px] font-bold ${grade.color}`}>{grade.letter}</span>
                            <span className="text-[10px] text-muted-foreground">{issues.length} {issues.length === 1 ? "issue" : "issues"}</span>
                          </summary>
                          <div className="w-full h-1.5 rounded-full bg-muted mb-2 ml-6">
                            <div
                              className={`h-full rounded-full transition-all ${catScore >= 80 ? "bg-emerald-500" : catScore >= 60 ? "bg-yellow-500" : catScore >= 40 ? "bg-orange-500" : "bg-red-500"}`}
                              style={{ width: `${catScore}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-1 ml-6">
                            {issues.map((issue, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {lead.detectedTechnologies && lead.detectedTechnologies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Technologies</p>
              <div className="flex flex-wrap gap-1.5">
                {lead.detectedTechnologies.map((tech, i) => {
                  const [category, value] = tech.includes(": ") ? tech.split(": ", 2) : ["Tech", tech];
                  return (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1" data-testid={`badge-pipeline-tech-${i}`}>
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
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid="info-pipeline-bbb-rating">
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
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid="info-pipeline-google-rating">
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
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid="info-pipeline-sitemap">
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
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid="info-pipeline-robots">
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
            </div>
          )}

          {!noWebsite && screenshotUrl && (
            <div data-testid="section-pipeline-screenshot">
              <p className="text-xs font-medium text-muted-foreground mb-2">Screenshot</p>
              <div className="rounded-md border overflow-hidden">
                <img
                  src={screenshotUrl}
                  alt={`Screenshot of ${lead.companyName}'s website`}
                  className="w-full h-auto object-cover object-top"
                  loading="lazy"
                  data-testid="img-pipeline-screenshot"
                  onError={(e) => {
                    const section = (e.target as HTMLImageElement).closest('[data-testid="section-pipeline-screenshot"]');
                    if (section) (section as HTMLElement).style.display = "none";
                  }}
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
                  if (lead) {
                    setNotesValue(lead.notes || "");
                  }
                }}
                data-testid="button-pipeline-edit-notes"
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
                  data-testid="input-pipeline-notes"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    updateNotesMutation.mutate({ id: lead.id, notes: notesValue });
                    setEditingNotes(false);
                  }}
                  disabled={updateNotesMutation.isPending}
                  data-testid="button-pipeline-save-notes"
                >
                  Save Notes
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-pipeline-notes">
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
                  data-testid={`button-move-to-${stage.value}`}
                >
                  {stage.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t">
            {lead.contactEmail && (
              <Button
                size="sm"
                onClick={() => setEmailDialogOpen(true)}
                className="w-full sm:w-auto"
                data-testid="button-pipeline-email-lead"
              >
                <Mail className="w-3.5 h-3.5 mr-1" />
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
    <Dialog open={editingLead} onOpenChange={setEditingLead}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Lead Information</DialogTitle>
          <DialogDescription>
            Update the lead's address and social media profiles
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Address/Location</label>
            <Input
              value={editForm.location}
              onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Enter address or location"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Social Media</label>
            <div className="space-y-2">
              {editForm.socialMedia.map((social, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={social}
                    onChange={(e) => {
                      const newSocial = [...editForm.socialMedia];
                      newSocial[index] = e.target.value;
                      setEditForm(prev => ({ ...prev, socialMedia: newSocial }));
                    }}
                    placeholder="platform:url (e.g., facebook:https://...)"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newSocial = editForm.socialMedia.filter((_, i) => i !== index);
                      setEditForm(prev => ({ ...prev, socialMedia: newSocial }));
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditForm(prev => ({ ...prev, socialMedia: [...prev.socialMedia, ""] }))}
              >
                Add Social Media
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingLead(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateLeadMutation.mutate({
                id: lead.id,
                location: editForm.location || undefined,
                socialMedia: editForm.socialMedia.filter(s => s.trim())
              })}
              disabled={updateLeadMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

const MOBILE_STAGE_LIMIT = 3;

function MobileStageSection({
  stage,
  leads,
  onSelectLead,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}) {
  const [expanded, setExpanded] = useState(leads.length > 0);
  const [showAll, setShowAll] = useState(false);
  const stageColor = STAGE_COLORS[stage.color] || "bg-muted";
  const visibleLeads = showAll ? leads : leads.slice(0, MOBILE_STAGE_LIMIT);
  const hasMore = leads.length > MOBILE_STAGE_LIMIT;

  return (
    <div data-testid={`mobile-column-${stage.value}`}>
      <button
        className="flex items-center justify-between gap-2 w-full p-3 rounded-md hover-elevate"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-toggle-${stage.value}`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${stageColor}`} />
          <h3 className="text-sm font-semibold">{stage.label}</h3>
          <Badge variant="secondary" className="text-[10px] h-5 min-w-[20px] justify-center">
            {leads.length}
          </Badge>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`} />
      </button>
      {expanded && leads.length > 0 && (
        <div className="space-y-2 px-1 pb-3">
          {visibleLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onSelect={onSelectLead} />
          ))}
          {hasMore && !showAll && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setShowAll(true)}
              data-testid={`button-show-more-${stage.value}`}
            >
              Show {leads.length - MOBILE_STAGE_LIMIT} more
            </Button>
          )}
          {hasMore && showAll && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setShowAll(false)}
              data-testid={`button-show-less-${stage.value}`}
            >
              Show less
            </Button>
          )}
        </div>
      )}
      {expanded && leads.length === 0 && (
        <div className="flex items-center justify-center h-12 mx-1 mb-3 border border-dashed rounded-md">
          <p className="text-[10px] text-muted-foreground">No leads</p>
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [mobileStage, setMobileStage] = useState("all");
  const { toast } = useToast();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/leads/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const activeStages = PIPELINE_STAGES;

  const getLeadsForStage = (stageValue: string) => {
    return leads
      .filter((l) => l.status === stageValue)
      .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-pipeline-title">Pipeline</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} across {activeStages.length} stages
          </p>
        </div>
      </div>

      <div className="md:hidden flex-1 overflow-y-auto space-y-1">
        {activeStages.map((stage) => (
          <MobileStageSection
            key={stage.value}
            stage={stage}
            leads={getLeadsForStage(stage.value)}
            onSelectLead={setSelectedLead}
          />
        ))}
      </div>

      <div className="hidden md:flex flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <div className="flex gap-3 h-full pb-2" style={{ minWidth: `${activeStages.length * 240}px` }}>
          {activeStages.map((stage) => {
            const stageLeads = getLeadsForStage(stage.value);
            const stageColor = STAGE_COLORS[stage.color] || "bg-muted";
            const stageTextColor = STAGE_TEXT_COLORS[stage.color] || "text-muted-foreground";

            return (
              <div
                key={stage.value}
                className="flex-1 min-w-[220px] max-w-[320px] flex flex-col"
                data-testid={`column-${stage.value}`}
              >
                <div className="flex items-center justify-between gap-2 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${stageColor}`} />
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      {stage.label}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5 min-w-[20px] justify-center">
                    {stageLeads.length}
                  </Badge>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto pr-1 min-h-[100px]">
                  {stageLeads.map((lead) => (
                    <div key={lead.id} className="group relative">
                      <LeadCard lead={lead} onSelect={setSelectedLead} />
                      <div className="absolute top-1 right-1 invisible group-hover:visible">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-move-menu-${lead.id}`}>
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {PIPELINE_STAGES.filter(
                              (s) => s.value !== lead.status
                            ).map((targetStage) => (
                              <DropdownMenuItem
                                key={targetStage.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateMutation.mutate({
                                    id: lead.id,
                                    status: targetStage.value,
                                  });
                                  toast({ title: `Moved to ${targetStage.label}` });
                                }}
                                data-testid={`menu-move-${lead.id}-${targetStage.value}`}
                              >
                                <ArrowRight className="w-3 h-3 mr-2" />
                                Move to {targetStage.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="flex items-center justify-center h-20 border border-dashed rounded-md">
                      <p className="text-[10px] text-muted-foreground">No leads</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PipelineLeadDetailDialog
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
