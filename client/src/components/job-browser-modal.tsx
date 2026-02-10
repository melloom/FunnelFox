import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Search,
  Globe,
  Building,
  Calendar,
  Users,
  Star,
  TrendingUp,
  ArrowRight,
  Zap,
  Target,
  Shield,
  Database,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Filter,
} from "lucide-react";

const scraperFeatures = [
  {
    icon: Database,
    title: "Multi-Platform Scraping",
    description: "We scrape from Upwork, Freelancer, Fiverr, PeoplePerHour, and more - all in one place",
    platforms: ["Upwork", "Freelancer", "Fiverr", "PeoplePerHour", "Guru", "Toptal"]
  },
  {
    icon: RefreshCw,
    title: "Real-Time Updates",
    description: "Jobs are updated hourly so you never miss an opportunity",
    frequency: "Every 60 minutes"
  },
  {
    icon: Target,
    title: "Smart Filtering",
    description: "Filter by technology, experience level, budget, and location automatically",
    filters: ["React", "Node.js", "Python", "Remote", "Senior Level"]
  },
  {
    icon: Shield,
    title: "Verified Listings",
    description: "We verify job authenticity and filter out spam and low-quality postings",
    verification: "AI-powered verification"
  }
];

const sampleJobs = [
  {
    id: 1,
    title: "Senior Full Stack Developer",
    company: "TechCorp Solutions",
    location: "Remote",
    type: "Full-time",
    salary: "$120k - $160k",
    posted: "2 hours ago",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL"],
    platform: "Upwork",
    rating: 4.8,
    scraped: true,
  },
  {
    id: 2,
    title: "E-commerce Website Development",
    company: "Retail Startup",
    location: "New York, NY",
    type: "Contract",
    salary: "$5,000 - $8,000",
    posted: "1 hour ago",
    skills: ["React", "Node.js", "MongoDB", "Stripe API"],
    platform: "Freelancer",
    rating: 4.5,
    scraped: true,
  },
  {
    id: 3,
    title: "WordPress Website Redesign",
    company: "Local Business",
    location: "Los Angeles, CA",
    type: "Project",
    salary: "$2,000 - $3,500",
    posted: "30 minutes ago",
    skills: ["WordPress", "PHP", "CSS", "JavaScript"],
    platform: "Upwork",
    rating: 4.2,
    scraped: true,
  },
];

interface JobBrowserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobBrowserModal({ open, onOpenChange }: JobBrowserModalProps) {
  const [activeTab, setActiveTab] = useState("scraper");

  const ScraperFeatureCard = ({ feature }: { feature: typeof scraperFeatures[0] }) => (
    <Card className="border-border/50 hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <feature.icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
        {feature.platforms && (
          <div className="flex flex-wrap gap-1">
            {feature.platforms.map((platform) => (
              <Badge key={platform} variant="secondary" className="text-xs">
                {platform}
              </Badge>
            ))}
          </div>
        )}
        {feature.frequency && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3" />
            <span>{feature.frequency}</span>
          </div>
        )}
        {feature.filters && (
          <div className="flex flex-wrap gap-1">
            {feature.filters.map((filter) => (
              <Badge key={filter} variant="outline" className="text-xs">
                {filter}
              </Badge>
            ))}
          </div>
        )}
        {feature.verification && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle2 className="w-3 h-3" />
            <span>{feature.verification}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const JobCard = ({ job }: { job: typeof sampleJobs[0] }) => (
    <Card className="border-border/50 hover:shadow-lg transition-all duration-200 relative overflow-hidden">
      {job.scraped && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs font-medium">
            <Sparkles className="w-3 h-3 mr-1" />
            Scraped
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="text-base font-semibold line-clamp-1 pr-16">{job.title}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="w-3 h-3" />
            <span className="truncate">{job.company}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {job.skills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
          {job.skills.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{job.skills.length - 3}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="truncate">{job.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <span className="truncate">{job.salary}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="truncate">{job.type}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="truncate">{job.posted}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{job.rating}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {job.platform}
            </Badge>
          </div>
          <Button size="sm" className="text-xs px-2 py-1 h-7">
            View
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Job Scraping Technology
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            See how our advanced scraper finds you the best web development opportunities
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex flex-col sm:flex-row gap-2 border-b">
            <button
              onClick={() => setActiveTab("scraper")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "scraper"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="w-4 h-4 inline mr-2" />
              Scraper Features
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "jobs"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              Sample Jobs
            </button>
          </div>

          {/* Scraper Features Tab */}
          {activeTab === "scraper" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {scraperFeatures.map((feature) => (
                  <ScraperFeatureCard key={feature.title} feature={feature} />
                ))}
              </div>

              {/* Stats Section */}
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">Our Scraper Power</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">6+</div>
                        <div className="text-xs text-muted-foreground">Platforms</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">1000+</div>
                        <div className="text-xs text-muted-foreground">Daily Jobs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">24/7</div>
                        <div className="text-xs text-muted-foreground">Monitoring</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">95%</div>
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sample Jobs Tab */}
          {activeTab === "jobs" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4 inline mr-2 text-green-500" />
                  Recently scraped jobs (updated hourly)
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="w-3 h-3" />
                  <span>Last update: 15 mins ago</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {sampleJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Showing 3 of 1000+ available jobs
                </p>
                <Button variant="outline" size="sm">
                  Load More Jobs
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* CTA Section */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">Get Access to Our Job Scraper</h3>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                  Sign up for FunnelFox to get real-time job notifications, advanced filtering, 
                  and apply to jobs directly through our platform. Never miss the perfect opportunity again.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-primary/90">
                    Start Scraping Jobs
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" size="lg">
                    Learn More
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
