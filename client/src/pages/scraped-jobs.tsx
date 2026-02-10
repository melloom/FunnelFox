import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, MapPin, DollarSign, Clock, Building, Search, Briefcase, Bookmark, BookmarkCheck, RefreshCw, Filter, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface JobListing {
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
}

const JOB_SOURCES = [
  { value: "all", label: "All Sources" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
  { value: "glassdoor", label: "Glassdoor" },
  { value: "stackoverflow", label: "Stack Overflow Jobs" },
  { value: "remoteok", label: "RemoteOK" },
  { value: "upwork", label: "Upwork" },
  { value: "fiverr", label: "Fiverr" },
  { value: "facebook", label: "Facebook Groups" },
  { value: "reddit", label: "Reddit" },
];

const JOB_TYPES = [
  { value: "all", label: "All Types" },
  { value: "full-time", label: "Full Time" },
  { value: "part-time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship" },
];

const EXPERIENCE_LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior Level" },
  { value: "lead", label: "Lead/Principal" },
];

export default function ScrapedJobsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const { toast } = useToast();

  const { data: jobs = [], isLoading, refetch } = useQuery<JobListing[]>({
    queryKey: ["/api/jobs", searchTerm, selectedSource, selectedType, selectedExperience],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        source: selectedSource,
        type: selectedType,
        experience: selectedExperience,
      });
      const res = await apiRequest("GET", `/api/jobs?${params}`);
      if (!res.ok) {
        if (res.status === 403) {
          const error = await res.json();
          throw new Error(error.message || "Premium subscription required");
        }
        throw new Error("Failed to fetch jobs");
      }
      return res.json();
    },
    retry: (failureCount, error) => {
      if (error.message?.includes("subscription")) return false;
      return failureCount < 3;
    },
  });

  const { data: savedJobIds = [] } = useQuery<number[]>({
    queryKey: ["/api/saved-jobs/ids"],
  });

  const saveMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("POST", `/api/saved-jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/ids"] });
      toast({ title: "Job saved" });
    },
    onError: () => {
      toast({ title: "Failed to save job", variant: "destructive" });
    },
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

  const toggleSave = (jobId: number) => {
    if (savedJobIds.includes(jobId)) {
      unsaveMutation.mutate(jobId);
    } else {
      saveMutation.mutate(jobId);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-md">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">All Scraped Jobs</h1>
            <p className="text-sm text-muted-foreground">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} from your latest scrapes
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="gap-2"
          data-testid="button-refresh-jobs"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs, companies, or technologies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-jobs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger data-testid="select-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_SOURCES.map(source => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger data-testid="select-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedExperience} onValueChange={setSelectedExperience}>
              <SelectTrigger data-testid="select-experience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-muted rounded-full"></div>
            <div className="absolute top-0 w-12 h-12 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-muted-foreground font-medium">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <div className="flex flex-col items-center space-y-4 max-w-md mx-auto">
              <div className="p-4 bg-muted rounded-md">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No scraped jobs yet</h3>
                <p className="text-muted-foreground">
                  Go to the Find Work page to scrape new job listings from multiple sources.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map(job => (
            <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
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
                      {job.technologies?.slice(0, 5).map(tech => (
                        <Badge key={tech} variant="outline">{tech}</Badge>
                      ))}
                    </div>

                    {job.requirements && job.requirements.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Key Requirements:</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {job.requirements.slice(0, 3).map((req, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <div className="w-1 h-1 bg-muted-foreground rounded-full mt-1.5 flex-shrink-0"></div>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
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
                        variant={savedJobIds.includes(job.id) ? "default" : "outline"}
                        onClick={() => toggleSave(job.id)}
                        disabled={saveMutation.isPending || unsaveMutation.isPending}
                        className="gap-1.5"
                        data-testid={`button-save-${job.id}`}
                      >
                        {savedJobIds.includes(job.id) ? (
                          <>
                            <BookmarkCheck className="w-3 h-3" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3 h-3" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>

                    <Badge variant="outline" className="text-xs">{job.source}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
