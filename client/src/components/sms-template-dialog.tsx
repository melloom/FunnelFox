import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Copy, Check, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@shared/schema";

interface SMSTemplate {
  id: string;
  name: string;
  body: (lead: Lead) => string;
}

const SMS_TEMPLATES: SMSTemplate[] = [
  {
    id: "intro",
    name: "Quick Intro",
    body: (lead) => `Hi ${lead.contactName?.split(" ")[0] || "there"}, this is Melvin from MellowSites. I noticed ${lead.companyName} could use a website refresh. Interested in a quick chat?`,
  },
  {
    id: "no_website",
    name: "No Website",
    body: (lead) => `Hi ${lead.contactName?.split(" ")[0] || "there"}, noticed ${lead.companyName} doesn't have a website yet. I help local businesses get online quickly. Want to see some examples?`,
  },
  {
    id: "follow_up",
    name: "Follow Up",
    body: (lead) => `Hi ${lead.contactName?.split(" ")[0] || "there"}, just following up on my email regarding ${lead.companyName}'s website. Let me know if you'd like to chat!`,
  },
];

export function SMSTemplateDialog({
  lead,
  open,
  onClose,
}: {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}) {
  const defaultTemplate = lead.websiteUrl === "none" ? "no_website" : "intro";
  const [selectedTemplate, setSelectedTemplate] = useState<string>(defaultTemplate);
  const [editedBody, setEditedBody] = useState("");
  const [editedTo, setEditedTo] = useState(lead.contactPhone || "");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const tmpl = SMS_TEMPLATES.find((t) => t.id === defaultTemplate);
      setEditedBody(tmpl ? tmpl.body(lead) : "");
      setEditedTo(lead.contactPhone || "");
    }
  }, [open, lead, defaultTemplate]);

  const loadTemplate = (templateId: string) => {
    const tmpl = SMS_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setSelectedTemplate(templateId);
      setEditedBody(tmpl.body(lead));
      setCopied(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedBody);
      setCopied(true);
      toast({ title: "Message copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const handleSMS = () => {
    const smsUrl = `sms:${editedTo}${window.navigator.userAgent.match(/iPhone/i) ? '&' : '?'}body=${encodeURIComponent(editedBody)}`;
    window.location.href = smsUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary shrink-0" />
            <span>Text {lead.companyName}</span>
          </DialogTitle>
          <DialogDescription>
            Choose a template, customize it, then open in your messages app or copy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Template</label>
              <Select value={selectedTemplate} onValueChange={loadTemplate}>
                <SelectTrigger>
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SMS_TEMPLATES.map((t) => (
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
                placeholder="Phone number"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
            <Textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              className="min-h-[120px] text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button onClick={handleSMS} disabled={!editedTo || !editedBody} className="w-full sm:w-auto">
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Open in Messages
            </Button>
            <Button variant="outline" onClick={handleCopy} className="w-full sm:w-auto">
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? "Copied" : "Copy Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
