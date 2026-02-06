import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, Star, TrendingUp, Globe, Search, Kanban, AlertCircle } from "lucide-react";
import type { Lead } from "@shared/schema";
import { PIPELINE_STAGES } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  testId,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  testId: string;
}) {
  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={testId}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

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

export default function Dashboard() {
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const activeLeads = leads.filter((l) => l.status !== "lost" && l.status !== "not_interested");
  const noWebsiteLeads = leads.filter((l) => !l.websiteUrl || l.websiteUrl === "none");

  const stats = {
    total: leads.length,
    active: activeLeads.length,
    new: leads.filter((l) => l.status === "new").length,
    inProgress: leads.filter((l) =>
      ["contacted", "interested", "demo_scheduled", "proposal_sent", "negotiation"].includes(l.status)
    ).length,
    converted: leads.filter((l) => l.status === "converted").length,
    noWebsite: noWebsiteLeads.length,
  };

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your web development lead pipeline at a glance
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/discover">
            <Button data-testid="button-discover-leads-hero">
              <Search className="w-4 h-4 mr-2" />
              Discover Leads
            </Button>
          </Link>
          <Link href="/pipeline">
            <Button variant="outline" data-testid="button-pipeline-hero">
              <Kanban className="w-4 h-4 mr-2" />
              Pipeline
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={stats.total}
          icon={Users}
          description="All discovered leads"
          testId="stat-total-leads"
        />
        <StatCard
          title="New Leads"
          value={stats.new}
          icon={Globe}
          description="Waiting to be contacted"
          testId="stat-new-leads"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={UserCheck}
          description="Actively in pipeline"
          testId="stat-in-progress"
        />
        <StatCard
          title="Won"
          value={stats.converted}
          icon={Star}
          description="Successful conversions"
          testId="stat-converted"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PIPELINE_STAGES.map((stage) => {
                const count = leads.filter((l) => l.status === stage.value).length;
                const color = STAGE_COLORS[stage.color] || "bg-muted";
                return (
                  <div key={stage.value} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">{stage.label}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="h-2 rounded-md bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-md ${color} transition-all duration-500`}
                        style={{
                          width: stats.total > 0
                            ? `${(count / stats.total) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No leads yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Discover leads to start building your pipeline
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeads.map((lead) => {
                  const stage = PIPELINE_STAGES.find((s) => s.value === lead.status);
                  const textColor = stage ? (STAGE_TEXT_COLORS[stage.color] || "") : "";
                  const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";

                  return (
                    <Link href="/pipeline" key={lead.id}>
                      <div
                        className="flex items-center justify-between gap-3 p-3 rounded-md hover-elevate cursor-pointer"
                        data-testid={`card-recent-lead-${lead.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{lead.companyName}</p>
                            {noWebsite && (
                              <Badge variant="secondary" className="text-[10px]">
                                No site
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {noWebsite ? (lead.location || lead.industry || "No website") : lead.websiteUrl}
                          </p>
                        </div>
                        {stage && (
                          <Badge variant="outline" className={`${textColor} border-0 bg-muted text-xs shrink-0`}>
                            {stage.label}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
