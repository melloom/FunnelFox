import { useState } from "react";
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
  ExternalLink,
  ArrowRight,
  ChevronRight,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import type { Lead } from "@shared/schema";
import { PIPELINE_STAGES } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  let color = "text-chart-5";
  if (score >= 70) color = "text-chart-2";
  else if (score >= 40) color = "text-chart-4";
  return (
    <div className="flex items-center gap-1">
      <span className={`text-[11px] font-bold ${color}`}>{score}</span>
      <span className="text-[10px] text-muted-foreground">/100</span>
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
          {noWebsite && (
            <Badge variant="secondary" className="text-[10px]">
              No website
            </Badge>
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
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
      toast({ title: "Lead moved" });
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

  if (!lead) return null;

  const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";
  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.value === lead.status);
  const currentStage = PIPELINE_STAGES[currentStageIndex];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {lead.companyName}
          </DialogTitle>
          <DialogDescription>Manage this lead in your pipeline</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
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
          </div>

          <div className="space-y-2.5">
            {!noWebsite && (
              <div className="flex items-center gap-2 text-sm">
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
            {lead.contactName && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{lead.contactName}</span>
              </div>
            )}
            {lead.contactEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${lead.contactEmail}`} className="text-primary underline underline-offset-2">
                  {lead.contactEmail}
                </a>
              </div>
            )}
            {lead.contactPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`tel:${lead.contactPhone}`} className="text-primary underline underline-offset-2">
                  {lead.contactPhone}
                </a>
              </div>
            )}
            {lead.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{lead.location}</span>
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

          {lead.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-muted-foreground">{lead.notes}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Move to Stage</p>
            <div className="flex flex-wrap gap-1.5">
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

export default function PipelinePage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
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
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 overflow-x-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="min-w-[250px] space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-pipeline-title">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} across {activeStages.length} stages
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
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
                            <Button size="icon" variant="ghost" className="h-6 w-6" data-testid={`button-move-menu-${lead.id}`}>
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

      <LeadDetailDialog
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
