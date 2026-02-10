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

  const handleScrapeFreelanceProjects = async () => {
    setIsScraping(true);
    try {
      const res = await apiRequest("POST", "/api/jobs/scrape", {
        sources: ["upwork", "fiverr", "facebook", "reddit"],
        keywords: ["web development", "react", "node.js", "wordpress", "javascript"],
        includeFreelance: true,
      });
      
      if (!res.ok) throw new Error("Failed to scrape freelance projects");
      
      const result = await res.json();
      toast({
        title: "Freelance Projects Scraped Successfully!",
        description: `Found ${result.freelanceProjects} new freelance projects from ${result.sourcesScraped} sources.`,
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Freelance Scraping Failed",
        description: "Unable to scrape freelance projects. Please try again.",
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Find Work</h1>
                  <p className="text-slate-600 mt-1">
                    Discover web development opportunities from top job boards
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Real-time job listings tailored to your skills</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              <Button 
                onClick={handleScrapeJobs} 
                disabled={isScraping}
                className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-105"
                size="lg"
              >
                <RefreshCw className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
                {isScraping ? "Scraping Jobs..." : "Scrape New Jobs"}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => refetch()} 
                className="gap-2 border-slate-200 hover:bg-slate-50 transition-all duration-200"
                size="lg"
              >
                <Search className="w-4 h-4" />
                Refresh
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleScrapeFreelanceProjects} 
                disabled={isScraping}
                className="gap-2 border-purple-200 hover:bg-purple-50 transition-all duration-200"
                size="lg"
              >
                <Briefcase className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
                {isScraping ? "Scraping Freelance..." : "Scrape Freelance Projects"}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Filter className="w-5 h-5 text-blue-600" />
              <span>Smart Filters</span>
            </CardTitle>
            <CardDescription className="text-slate-600">
              Customize your job search with these filters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search jobs, companies, or technologies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            
            {/* Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Building className="w-3 h-3" />
                  Source
                </label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500">
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
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Job Type
                </label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500">
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
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Briefcase className="w-3 h-3" />
                  Experience
                </label>
                <Select value={selectedExperience} onValueChange={setSelectedExperience}>
                  <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500">
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
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Location</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-10 border-slate-200 focus:border-blue-500">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Technology Tags */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">Technologies</label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TECH.map(tech => (
                  <Badge
                    key={tech}
                    variant={selectedTech.includes(tech) ? "default" : "outline"}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedTech.includes(tech) 
                        ? "bg-blue-600 hover:bg-blue-700 border-blue-600" 
                        : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                    onClick={() => toggleTech(tech)}
                  >
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Section */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-slate-200 rounded-full"></div>
                <div className="absolute top-0 w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-slate-600 font-medium">Loading amazing jobs...</p>
              <p className="text-sm text-slate-500">Finding the perfect opportunities for you</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <Card className="border-slate-200/60">
              <CardContent className="text-center py-16">
                <div className="flex flex-col items-center space-y-4 max-w-md mx-auto">
                  <div className="p-4 bg-slate-100 rounded-2xl">
                    <Briefcase className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-slate-900">No jobs found</h3>
                    <p className="text-slate-600">
                      Try adjusting your filters or scrape new jobs to get started with your job search.
                    </p>
                  </div>
                  <Button 
                    onClick={handleScrapeJobs} 
                    disabled={isScraping}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isScraping ? "Scraping Jobs..." : "Scrape Jobs"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.map(job => (
                <Card key={job.id} className="border-slate-200/60 hover:border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      {/* Job Details */}
                      <div className="flex-1 space-y-4">
                        {/* Header */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                              <h3 className="text-xl font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                                {job.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                <span className="font-medium text-slate-900">{job.company}</span>
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
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-slate-600 leading-relaxed line-clamp-2">
                          {job.description}
                        </p>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            {job.type}
                          </Badge>
                          <Badge variant="outline" className="border-slate-200">
                            {job.experience}
                          </Badge>
                          {job.remote && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Remote
                            </Badge>
                          )}
                          {job.technologies.slice(0, 5).map(tech => (
                            <Badge 
                              key={tech} 
                              variant="outline" 
                              className="border-blue-200 text-blue-700 bg-blue-50"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Requirements */}
                        {job.requirements.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-700">Key Requirements:</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                              {job.requirements.slice(0, 3).map((req, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <div className="w-1 h-1 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      {/* Sidebar */}
                      <div className="flex flex-col gap-4 min-w-fit lg:text-right">
                        {job.salary && (
                          <div className="flex items-center gap-2 text-green-600 font-semibold text-lg">
                            <DollarSign className="w-5 h-5" />
                            <span>{job.salary}</span>
                          </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                          <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700">
                            <a href={job.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                              <ExternalLink className="w-3 h-3" />
                              Apply Now
                            </a>
                          </Button>
                          
                          <Badge variant="outline" className="text-xs border-slate-200">
                            {job.source}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
