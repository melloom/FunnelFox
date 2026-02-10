import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, MapPin, DollarSign, Clock, Building, Search, RefreshCw, Filter, Briefcase } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
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

const POPULAR_TECH = [
  "React", "Vue", "Angular", "Node.js", "Python", "TypeScript", 
  "JavaScript", "Java", "C#", "PHP", "Ruby", "Go", "Rust", "Swift"
];

export default function FindWorkPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const { toast } = useToast();

  const { data: jobs = [], isLoading, refetch } = useQuery<JobListing[]>({
    queryKey: ["/api/jobs", searchTerm, selectedSource, selectedType, selectedExperience, selectedTech],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        source: selectedSource,
        type: selectedType,
        experience: selectedExperience,
        tech: selectedTech.join(","),
      });
      
      const res = await apiRequest("GET", `/api/jobs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  const handleScrapeJobs = async () => {
    setIsScraping(true);
    try {
      const res = await apiRequest("POST", "/api/jobs/scrape", {
        sources: ["linkedin", "indeed", "stackoverflow", "remoteok"],
        keywords: ["web developer", "frontend", "backend", "full stack", "react", "node.js"],
      });
      
      if (!res.ok) throw new Error("Failed to scrape jobs");
      
      const result = await res.json();
      toast({
        title: "Jobs Scraped Successfully!",
        description: `Found ${result.jobsFound} new job listings from ${result.sourcesScraped} sources.`,
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Scraping Failed",
        description: "Unable to scrape jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };

  const toggleTech = (tech: string) => {
    setSelectedTech(prev => 
      prev.includes(tech) 
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTech = selectedTech.length === 0 || 
      selectedTech.some(tech => job.technologies.includes(tech));
    
    return matchesSearch && matchesTech;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">Find Work</h1>
          <p className="text-muted-foreground mt-2">
            Discover web development opportunities from top job boards. Get real-time job listings tailored to your skills.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Button 
            onClick={handleScrapeJobs} 
            disabled={isScraping}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
            {isScraping ? "Scraping Jobs..." : "Scrape New Jobs"}
          </Button>
          
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <Search className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search jobs, companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Source</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
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
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Job Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
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
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Experience Level</label>
              <Select value={selectedExperience} onValueChange={setSelectedExperience}>
                <SelectTrigger>
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
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Technologies</label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TECH.map(tech => (
                <Badge
                  key={tech}
                  variant={selectedTech.includes(tech) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTech(tech)}
                >
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or scrape new jobs to get started.
              </p>
              <Button onClick={handleScrapeJobs} disabled={isScraping}>
                {isScraping ? "Scraping..." : "Scrape Jobs"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map(job => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="font-medium">{job.company}</span>
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
                    
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {job.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{job.type}</Badge>
                      <Badge variant="outline">{job.experience}</Badge>
                      {job.remote && <Badge variant="default">Remote</Badge>}
                      {job.technologies.slice(0, 5).map(tech => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    
                    {job.requirements.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Key Requirements:</p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {job.requirements.slice(0, 3).map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-fit">
                    {job.salary && (
                      <div className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign className="w-4 h-4" />
                        {job.salary}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button size="sm" asChild>
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="gap-1">
                          <ExternalLink className="w-3 h-3" />
                          Apply
                        </a>
                      </Button>
                      
                      <Badge variant="outline" className="text-xs">
                        {job.source}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
