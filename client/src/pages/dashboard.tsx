import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, UserX, Star, TrendingUp, Globe, Search } from "lucide-react";
import type { Lead } from "@shared/schema";
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

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    new: "bg-chart-1/15 text-chart-1",
    contacted: "bg-chart-4/15 text-chart-4",
    interested: "bg-chart-2/15 text-chart-2",
    not_interested: "bg-chart-5/15 text-chart-5",
    converted: "bg-primary/15 text-primary",
  };
  const labels: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    interested: "Interested",
    not_interested: "Not Interested",
    converted: "Converted",
  };
  return (
    <Badge variant="outline" className={`${variants[status] || ""} border-0`}>
      {labels[status] || status}
    </Badge>
  );
}

export default function Dashboard() {
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    interested: leads.filter((l) => l.status === "interested").length,
    converted: leads.filter((l) => l.status === "converted").length,
    avgScore: leads.length
      ? Math.round(
          leads.reduce((acc, l) => acc + (l.websiteScore || 0), 0) / leads.length
        )
      : 0,
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
          <Link href="/add">
            <Button variant="outline" data-testid="button-add-lead-hero">
              <TrendingUp className="w-4 h-4 mr-2" />
              Add Manually
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
          title="Interested"
          value={stats.interested}
          icon={UserCheck}
          description="Potential clients"
          testId="stat-interested"
        />
        <StatCard
          title="Converted"
          value={stats.converted}
          icon={Star}
          description="Successful conversions"
          testId="stat-converted"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  Add your first lead to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <Link href={`/leads`} key={lead.id}>
                    <div
                      className="flex items-center justify-between gap-3 p-3 rounded-md hover-elevate cursor-pointer"
                      data-testid={`card-recent-lead-${lead.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{lead.companyName}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.websiteUrl}</p>
                      </div>
                      <StatusBadge status={lead.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "New", count: stats.new, color: "bg-chart-1" },
                { label: "Contacted", count: stats.contacted, color: "bg-chart-4" },
                { label: "Interested", count: stats.interested, color: "bg-chart-2" },
                { label: "Converted", count: stats.converted, color: "bg-primary" },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-md bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-md ${item.color} transition-all duration-500`}
                      style={{
                        width: stats.total > 0
                          ? `${(item.count / stats.total) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
