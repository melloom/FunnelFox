import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import type { Lead } from "@shared/schema";
import { PIPELINE_STAGES } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  let color = "text-chart-5";
  if (score >= 70) color = "text-chart-2";
  else if (score >= 40) color = "text-chart-4";
  return (
    <div className="flex items-center gap-1">
      <div className={`text-xs font-bold ${color}`}>{score}</div>
      <div className="text-xs text-muted-foreground">/100</div>
    </div>
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
      toast({ title: "Lead updated" });
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

  if (!lead) return null;

  const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Building2 className="w-5 h-5 text-primary shrink-0" />
            <span className="break-words">{lead.companyName}</span>
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
          </div>

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

            {lead.contactName && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span data-testid="text-contact-name">{lead.contactName}</span>
              </div>
            )}

            {lead.contactEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${lead.contactEmail}`} className="text-primary underline underline-offset-2" data-testid="link-contact-email">
                  {lead.contactEmail}
                </a>
              </div>
            )}

            {lead.contactPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`tel:${lead.contactPhone}`} className="text-primary underline underline-offset-2" data-testid="link-contact-phone">
                  {lead.contactPhone}
                </a>
              </div>
            )}

            {lead.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span data-testid="text-lead-location">{lead.location}</span>
              </div>
            )}
          </div>

          {lead.websiteIssues && lead.websiteIssues.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Website Issues</p>
              <div className="flex flex-wrap gap-1.5">
                {lead.websiteIssues.map((issue, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {issue}
                  </Badge>
                ))}
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

          <div className="flex justify-end pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
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
  );
}

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
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

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const hasFilters = search || statusFilter !== "all" || industryFilter !== "all";

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
        </div>
      </div>

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
          {sorted.map((lead) => {
            const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";
            return (
              <Card
                key={lead.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setSelectedLead(lead)}
                data-testid={`card-lead-${lead.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold truncate" data-testid={`text-company-name-${lead.id}`}>
                          {lead.companyName}
                        </h3>
                        <StatusBadge status={lead.status} />
                        {noWebsite && (
                          <Badge variant="secondary" className="text-[10px]">
                            No site
                          </Badge>
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
