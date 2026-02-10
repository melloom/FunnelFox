import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, DollarSign, Clock, Building, Search, Briefcase, Bookmark, BookmarkX, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SavedJobListing {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  type: string;
  experience: string;
  description: string;
  requirements: string[];
  postedDate: string;
  source: string;
  url: string;
  technologies: string[];
  remote: boolean;
  savedAt: string;
  savedNotes: string | null;
}

export default function SavedJobsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: savedJobs = [], isLoading } = useQuery<SavedJobListing[]>({
    queryKey: ["/api/saved-jobs"],
  });

  const unsaveMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("DELETE", `/api/saved-jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/ids"] });
      toast({ title: "Job removed from saved list" });
    },
    onError: () => {
      toast({ title: "Failed to remove job", variant: "destructive" });
    },
  });

  const filteredJobs = savedJobs.filter(job => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(term) ||
      job.company.toLowerCase().includes(term) ||
      job.description.toLowerCase().includes(term)
    );
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-md">
            <Bookmark className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Saved Jobs</h1>
            <p className="text-sm text-muted-foreground">
              Jobs you've bookmarked for later
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search saved jobs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-saved-jobs"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-muted rounded-full"></div>
            <div className="absolute top-0 w-12 h-12 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-muted-foreground font-medium">Loading saved jobs...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <div className="flex flex-col items-center space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-muted rounded-md">
                <Bookmark className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No saved jobs yet</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No saved jobs match your search. Try adjusting your search terms."
                    : "Browse scraped jobs and save the ones that interest you. They'll appear here for easy access."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{filteredJobs.length} saved job{filteredJobs.length !== 1 ? "s" : ""}</p>
          <div className="grid gap-4">
            {filteredJobs.map(job => (
              <Card key={job.id} className="hover-elevate" data-testid={`card-saved-job-${job.id}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1.5">
                        <h3 className="text-lg font-semibold" data-testid={`text-job-title-${job.id}`}>
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{job.company}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {job.postedDate}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{job.type}</Badge>
                        <Badge variant="outline">{job.experience}</Badge>
                        {job.remote && <Badge variant="outline">Remote</Badge>}
                        {job.technologies?.slice(0, 4).map(tech => (
                          <Badge key={tech} variant="outline">{tech}</Badge>
                        ))}
                      </div>

                      {job.savedNotes && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                          {job.savedNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 min-w-fit">
                      {job.salary && (
                        <div className="flex items-center gap-1.5 font-semibold text-green-600 dark:text-green-400">
                          <DollarSign className="w-4 h-4" />
                          <span>{job.salary}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                        <Button size="sm" asChild data-testid={`button-apply-${job.id}`}>
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                            <ExternalLink className="w-3 h-3" />
                            Apply
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unsaveMutation.mutate(job.id)}
                          disabled={unsaveMutation.isPending}
                          data-testid={`button-unsave-${job.id}`}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>

                      <Badge variant="outline" className="text-xs">{job.source}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
