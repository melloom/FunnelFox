import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Copy, Check, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead } from "@shared/schema";

interface EmailTemplate {
  id: string;
  name: string;
  subject: (lead: Lead) => string;
  body: (lead: Lead) => string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "intro",
    name: "Introduction",
    subject: (lead) => `Web Development Services for ${lead.companyName}`,
    body: (lead) => {
      const issues = lead.websiteIssues?.length
        ? `\n\nI took a look at your current website and noticed a few areas that could be improved:\n${lead.websiteIssues.map((i) => `  - ${i}`).join("\n")}\n\nAddressing these could help attract more customers and improve your online visibility.`
        : "";
      const noSite =
        !lead.websiteUrl || lead.websiteUrl === "none"
          ? "\n\nI noticed your business doesn't currently have a website. Having a professional web presence can significantly increase your customer reach and credibility. I'd love to help you get started."
          : "";
      return `Hi${lead.contactName ? ` ${lead.contactName.split(" ")[0]}` : ""},\n\nMy name is Melvin Peralta, and I'm a web developer who specializes in helping local businesses like ${lead.companyName} grow their online presence.${noSite}${issues}\n\nI'd love to schedule a quick 15-minute call to discuss how I can help. Would you be available this week?\n\nBest regards,\nMelvin Peralta\n667-200-9784\nhttps://mellowsites.com`;
    },
  },
  {
    id: "website_audit",
    name: "Free Website Audit",
    subject: (lead) => `Free Website Review for ${lead.companyName}`,
    body: (lead) => {
      const score = lead.websiteScore !== null ? `Your site currently scores ${lead.websiteScore}/100 on key performance metrics. ` : "";
      const issues = lead.websiteIssues?.length
        ? `Here are some quick wins I identified:\n${lead.websiteIssues.slice(0, 3).map((i) => `  - ${i}`).join("\n")}\n\n`
        : "";
      return `Hi${lead.contactName ? ` ${lead.contactName.split(" ")[0]}` : ""},\n\nI recently came across ${lead.companyName} and was impressed by what you offer${lead.industry ? ` in the ${lead.industry} space` : ""}.\n\nAs a web developer, I ran a quick audit on your online presence. ${score}${issues}I'd be happy to put together a detailed free report showing exactly how to improve your website's performance, SEO, and mobile experience.\n\nNo strings attached - just want to help local businesses thrive online. Would you be interested?\n\nCheers,\nMelvin Peralta\n667-200-9784\nhttps://mellowsites.com`;
    },
  },
  {
    id: "follow_up",
    name: "Follow Up",
    subject: (lead) => `Following Up - ${lead.companyName} Website`,
    body: (lead) =>
      `Hi${lead.contactName ? ` ${lead.contactName.split(" ")[0]}` : ""},\n\nI reached out recently about helping ${lead.companyName} with your web presence and wanted to follow up.\n\nI understand things get busy, so I wanted to keep this brief. I'm still available to help with:\n  - Modern, mobile-friendly website design\n  - Search engine optimization (SEO)\n  - Speed and performance improvements\n  - Online booking/contact systems\n\nWould a quick 10-minute chat work for you this week? I'm flexible on timing.\n\nBest,\nMelvin Peralta\n667-200-9784\nhttps://mellowsites.com`,
  },
  {
    id: "no_website",
    name: "No Website Pitch",
    subject: (lead) => `Get ${lead.companyName} Online - Affordable Web Design`,
    body: (lead) =>
      `Hi${lead.contactName ? ` ${lead.contactName.split(" ")[0]}` : ""},\n\nI came across ${lead.companyName}${lead.location ? ` in ${lead.location}` : ""} and noticed you don't currently have a website. In today's market, over 80% of customers search online before visiting a business.\n\nI help local businesses get online quickly and affordably. Here's what I can do for you:\n  - Professional website that looks great on phones and computers\n  - Show up in Google when people search for ${lead.industry || "businesses"} in your area\n  - Easy contact forms so customers can reach you 24/7\n  - Fast turnaround - you could be live in as little as 2 weeks\n\nI'd love to show you some examples of similar businesses I've helped. Can we chat for 10 minutes this week?\n\nLooking forward to hearing from you,\nMelvin Peralta\n667-200-9784\nhttps://mellowsites.com`,
  },
  {
    id: "proposal",
    name: "Proposal",
    subject: (lead) => `Website Project Proposal for ${lead.companyName}`,
    body: (lead) => {
      const noSite = !lead.websiteUrl || lead.websiteUrl === "none";
      const scope = noSite
        ? "  - Custom website design and development\n  - Mobile-responsive layout\n  - SEO-optimized structure\n  - Contact forms and call-to-action elements\n  - Google Maps integration\n  - Social media integration"
        : "  - Website redesign with modern, clean aesthetics\n  - Mobile responsiveness improvements\n  - Performance and speed optimization\n  - SEO enhancements\n  - Updated content and imagery\n  - Analytics and tracking setup";
      return `Hi${lead.contactName ? ` ${lead.contactName.split(" ")[0]}` : ""},\n\nThank you for your interest in improving ${lead.companyName}'s online presence. As discussed, I've put together a proposal for your review.\n\nProject Scope:\n${scope}\n\nTimeline: [X weeks]\nInvestment: $[Amount]\n\nWhat's Included:\n  - Initial discovery and strategy session\n  - Design mockups for your approval\n  - Development and testing\n  - Content migration and setup\n  - 30 days of post-launch support\n  - Training on how to update your site\n\nI'm confident this project will help ${lead.companyName} attract more customers and grow your business online. I'd be happy to walk through the details on a quick call.\n\nLooking forward to working together,\nMelvin Peralta\n667-200-9784\nhttps://mellowsites.com`;
    },
  },
  {
    id: "social_media",
    name: "Social to Website",
    subject: (lead) => `Turn Your Social Following into a Website - ${lead.companyName}`,
    body: (lead) => {
      const socials = lead.socialMedia?.length
        ? `I can see you're already active on social media, which is great! `
        : "";
      return `Hi${lead.contactName ? ` ${lead.contactName.split(" ")[0]}` : ""},\n\nI found ${lead.companyName} through your social media presence. ${socials}A dedicated website would complement your social channels by:\n  - Giving you a professional home base that you fully control\n  - Helping you rank in Google search results\n  - Converting social followers into paying customers\n  - Providing a place for reviews, portfolios, and detailed service info\n\nI specialize in building websites that work seamlessly with social media. I can even set up automatic feeds from your social profiles.\n\nWould you be interested in a free mockup of what your website could look like?\n\nBest,\nMelvin Peralta\n667-200-9784\nhttps://mellowsites.com`;
    },
  },
];

export function EmailTemplateDialog({
  lead,
  open,
  onClose,
}: {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}) {
  const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";
  const hasSocial = lead.socialMedia && lead.socialMedia.length > 0;
  const defaultTemplate = noWebsite ? (hasSocial ? "social_media" : "no_website") : "intro";

  const [selectedTemplate, setSelectedTemplate] = useState<string>(defaultTemplate);
  const [editedSubject, setEditedSubject] = useState(() => {
    const tmpl = EMAIL_TEMPLATES.find((t) => t.id === defaultTemplate);
    return tmpl ? tmpl.subject(lead) : "";
  });
  const [editedBody, setEditedBody] = useState(() => {
    const tmpl = EMAIL_TEMPLATES.find((t) => t.id === defaultTemplate);
    return tmpl ? tmpl.body(lead) : "";
  });
  const [editedTo, setEditedTo] = useState(lead.contactEmail || "");
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const { data: gmailStatus } = useQuery<{ connected: boolean; email: string | null; method?: string }>({
    queryKey: ["/api/gmail/status"],
    enabled: open,
    staleTime: 60000,
  });

  useEffect(() => {
    setEditedTo(lead.contactEmail || "");
  }, [lead.contactEmail]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/gmail/send", {
        to: editedTo,
        subject: editedSubject,
        body: editedBody,
        leadId: lead.id,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email sent successfully", description: `Sent to ${editedTo}` });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      handleClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    },
  });

  const loadTemplate = (templateId: string) => {
    const tmpl = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setSelectedTemplate(templateId);
      setEditedSubject(tmpl.subject(lead));
      setEditedBody(tmpl.body(lead));
      setCopied(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${editedSubject}\n\n${editedBody}`);
      setCopied(true);
      toast({ title: "Email copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const handleMailto = () => {
    const mailto = `mailto:${encodeURIComponent(editedTo)}?subject=${encodeURIComponent(editedSubject)}&body=${encodeURIComponent(editedBody)}`;
    window.location.href = mailto;
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      const tmpl = EMAIL_TEMPLATES.find((t) => t.id === defaultTemplate);
      if (tmpl) {
        setSelectedTemplate(defaultTemplate);
        setEditedSubject(tmpl.subject(lead));
        setEditedBody(tmpl.body(lead));
      }
      setCopied(false);
    }, 200);
  };

  const gmailConnected = gmailStatus?.connected === true;
  const canSend = editedTo.length > 0 && editedSubject.length > 0 && editedBody.length > 0;

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary shrink-0" />
            <span className="truncate min-w-0">Email {lead.companyName}</span>
          </DialogTitle>
          <DialogDescription>
            {gmailConnected
              ? `Sending from ${gmailStatus?.email || "your Gmail"}`
              : "Choose a template, customize it, then open in your email app or copy"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 mt-1 sm:mt-2">
          {gmailConnected && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
                <Check className="w-3 h-3 mr-1" />
                {gmailStatus?.method === "smtp" ? "Email Connected" : "Gmail Connected"}
              </Badge>
              {gmailStatus?.email && (
                <span className="text-xs text-muted-foreground truncate">{gmailStatus.email}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Template</label>
              <Select value={selectedTemplate} onValueChange={loadTemplate}>
                <SelectTrigger data-testid="select-email-template">
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
              <Input
                value={editedTo}
                onChange={(e) => setEditedTo(e.target.value)}
                placeholder="recipient@example.com"
                data-testid="input-email-to"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
            <Input
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              data-testid="input-email-subject"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
            <Textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              className="min-h-[180px] sm:min-h-[280px] text-sm font-mono leading-relaxed"
              data-testid="input-email-body"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            {gmailConnected ? (
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={sendMutation.isPending || !canSend}
                className="w-full sm:w-auto"
                data-testid="button-send-email-gmail"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                {sendMutation.isPending ? "Sending..." : gmailStatus?.method === "smtp" ? "Send Email" : "Send via Gmail"}
              </Button>
            ) : (
              <Button onClick={() => setShowConfirm(true)} disabled={!canSend} className="w-full sm:w-auto" data-testid="button-send-email">
                <Send className="w-4 h-4 mr-1.5" />
                Open in Email App
              </Button>
            )}
            <Button variant="outline" onClick={handleCopy} className="w-full sm:w-auto" data-testid="button-copy-email">
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send this email?</AlertDialogTitle>
          <AlertDialogDescription>
            {gmailConnected
              ? `This will send an email to ${editedTo} from your connected Gmail account.`
              : `This will open your email app with a pre-filled email to ${editedTo}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-md bg-muted p-3 my-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
          <p className="text-sm truncate">{editedSubject}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-send">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (gmailConnected) {
                sendMutation.mutate();
              } else {
                handleMailto();
              }
            }}
            data-testid="button-confirm-send"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {gmailConnected ? "Send Now" : "Open Email App"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
