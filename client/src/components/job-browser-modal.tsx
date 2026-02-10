import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";
import {
  Briefcase,
  Search,
  Globe,
  Users,
  TrendingUp,
  ArrowRight,
  Zap,
  Target,
  Shield,
  Database,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const scraperFeatures = [
  {
    icon: Database,
    title: "Multi-Platform Scraping",
    description: "We scrape from 13+ platforms including LinkedIn, Glassdoor, AngelList, Indeed, RemoteOK, Upwork, Fiverr, Freelancer.com, PeoplePerHour, Guru, Stack Overflow, GitHub, and more - all in one place",
    platforms: ["LinkedIn", "Glassdoor", "AngelList", "Indeed", "RemoteOK", "Upwork", "Fiverr", "Freelancer.com", "PeoplePerHour", "Guru", "Stack Overflow", "GitHub"]
  },
  {
    icon: Target,
    title: "AI-Powered Job Ranking",
    description: "Our intelligent scoring algorithm ranks jobs by relevance, quality, freshness, and platform authority to show you the best opportunities first",
    filters: ["Relevance Score", "Quality Score", "Freshness Score", "Platform Authority", "Smart Ranking"]
  },
  {
    icon: RefreshCw,
    title: "Advanced Deduplication",
    description: "Multi-layer deduplication removes duplicate postings across platforms while keeping the highest quality version",
    verification: "AI-powered deduplication + quality preservation"
  },
  {
    icon: Shield,
    title: "Real-Time Intelligence",
    description: "Continuous monitoring with intelligent rate limiting, proxy rotation, and spam filtering ensures reliable, up-to-date job listings",
    frequency: "Every 15-30 minutes with smart caching"
  }
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
          <div className="flex border-b">
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
                        <div className="text-2xl font-bold text-primary">13+</div>
                        <div className="text-xs text-muted-foreground">Platforms</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">1000+</div>
                        <div className="text-xs text-muted-foreground">Daily Jobs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">24/7</div>
                        <div className="text-xs text-muted-foreground">AI Monitoring</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">98%</div>
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  <Link to="/auth">
                    <Button size="lg" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
                      Sign Up
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="outline" size="lg">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
