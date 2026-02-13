import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JobBrowserModal } from "@/components/job-browser-modal";
import {
  Search,
  Globe,
  Kanban,
  ArrowRight,
  Zap,
  Mail,
  BarChart3,
  Shield,
  Briefcase,
  Users,
  TrendingUp,
  Clock,
  Target,
  Code,
  Database,
  Globe2,
  Rocket,
  CheckCircle2,
  Star,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import { useState } from "react";
import foxLogo from "@assets/fox_1770439380079.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const features = [
  {
    icon: Search,
    title: "Smart Discovery",
    description: "Search across 13+ data sources to instantly find businesses in any niche and city that need a website or a better one.",
  },
  {
    icon: Globe,
    title: "Website Analysis",
    description: "Every prospect's site gets graded on speed, SEO, mobile, and security — so you can show them exactly what's wrong.",
  },
  {
    icon: Kanban,
    title: "Sales Pipeline",
    description: "Drag-and-drop Kanban board moves prospects from first contact to signed contract across 8 customizable stages.",
  },
  {
    icon: Briefcase,
    title: "Multi-Platform Job Scraper",
    description: "Find web development jobs from 13+ platforms including LinkedIn, Glassdoor, AngelList, Upwork, Freelancer, and more - all in one place.",
  },
  {
    icon: Code,
    title: "Project Management",
    description: "Track all your client projects in one place with timelines, budgets, and lead-to-project connections.",
  },
  {
    icon: Mail,
    title: "Email Outreach",
    description: "Send personalized pitch emails straight from FunnelFox with Gmail — no copy-pasting into another tool.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Track your lead generation performance, conversion rates, and ROI with comprehensive analytics dashboard.",
  },
  {
    icon: Shield,
    title: "Data Security",
    description: "Your data is encrypted and secure with enterprise-grade security and regular backups.",
  },
];

const stats = [
  { value: "13+", label: "Data Sources" },
  { value: "8", label: "Pipeline Stages" },
  { value: "100%", label: "Automated" },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: typeof Search;
  title: string;
  description: string;
  index?: number;
}) {
  return (
    <motion.div variants={fadeUp} custom={index}>
      <Card className="hover-elevate h-full">
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LandingPage() {
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between px-5 py-4 safe-area-x safe-area-top sticky top-0 z-[9999] bg-background/80 backdrop-blur-md border-b"
      >
        <div className="flex items-center gap-2.5">
          <img src={foxLogo} alt="FunnelFox" className="w-8 h-8 rounded-md object-cover" data-testid="img-app-logo" />
          <span className="text-sm font-bold tracking-tight">FunnelFox</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/auth">
            <Button variant="outline" data-testid="button-login-header">
              Log in
            </Button>
          </Link>
        </div>
      </motion.header>

      <main className="flex-1 safe-area-x">
        <section className="px-5 pt-16 pb-14 sm:pt-24 sm:pb-20 text-center max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-6"
          >
            <motion.div variants={fadeUp} custom={0}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary text-xs font-medium border border-primary/20">
                <Sparkles className="w-3 h-3" />
                Built for Web Developers
              </div>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
              data-testid="text-landing-headline"
            >
              Stop chasing leads.
              <span className="text-primary"> Start closing them.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              data-testid="text-landing-subtitle"
            >
              FunnelFox automatically finds businesses with no website or a broken one,
              scores their web presence, and gives you everything you need to pitch them — 
              emails, phone numbers, and a full CRM to close the deal.
              <span className="text-primary font-medium"> Plus, find web dev jobs and manage projects!</span>
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/auth">
                <Button size="lg" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary" data-testid="button-login-nav">
                  <Rocket className="w-4 h-4 mr-2" />
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" onClick={() => setIsJobModalOpen(true)} data-testid="button-find-work-nav">
                <Briefcase className="w-4 h-4 mr-2" />
                Browse Jobs
              </Button>
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="px-5 pb-14 sm:pb-20 max-w-4xl mx-auto w-full"
        >
          <div className="flex items-center justify-center gap-8 sm:gap-16">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary" data-testid={`text-stat-value-${i}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1" data-testid={`text-stat-label-${i}`}>{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="px-5 py-16 sm:py-24 max-w-6xl mx-auto w-full"
        >
          <motion.div variants={fadeUp} custom={0} className="text-center mb-16">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">All-in-One Platform</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight" data-testid="text-features-heading">
                Your entire business workflow,
                <span className="text-primary"> automated</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Find the prospect, prove they need you, send the pitch, track deals, manage projects, and find jobs — all in one powerful platform.
              </p>
            </div>
          </motion.div>
          
          <div className="bg-gradient-to-br from-background via-background to-muted/20 rounded-2xl border border-border/50 shadow-xl p-8">
            <Tabs defaultValue="lead-generation" className="w-full max-w-5xl mx-auto">
              <TabsList className="flex flex-col sm:grid sm:grid-cols-3 w-full h-auto sm:h-14 bg-background/80 backdrop-blur-sm border border-border/50 rounded-xl p-1 sm:p-1 mb-8 sm:mb-12 gap-2 sm:gap-0">
                <TabsTrigger value="lead-generation" className="data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg text-sm font-medium transition-all duration-200 justify-start sm:justify-center px-4 py-3 sm:py-0">
                  <Search className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Lead Generation</span>
                </TabsTrigger>
                <TabsTrigger value="project-management" className="data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg text-sm font-medium transition-all duration-200 justify-start sm:justify-center px-4 py-3 sm:py-0">
                  <Code className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Project Management</span>
                </TabsTrigger>
                <TabsTrigger value="job-search" className="data-[state=active]:bg-background data-[state=active]:shadow-md rounded-lg text-sm font-medium transition-all duration-200 justify-start sm:justify-center px-4 py-3 sm:py-0">
                  <Briefcase className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Job Search</span>
                </TabsTrigger>
              </TabsList>
            
            <TabsContent value="lead-generation" className="space-y-8 mt-8">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {features.slice(0, 6).map((feature, index) => (
                  <FeatureCard key={feature.title} {...feature} index={index} />
                ))}
              </motion.div>
            </TabsContent>
            
            <TabsContent value="project-management" className="space-y-8 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover-elevate border-border/50 shadow-lg">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <Code className="w-7 h-7 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Project Management</h3>
                        <p className="text-sm text-muted-foreground">Track all your client projects in one place</p>
                      </div>
                    </div>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>Convert leads to projects with one click</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>Track timelines, budgets, and priorities</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>Visual project cards with status indicators</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>Technology stack organization</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <Card className="hover-elevate border-border/50 shadow-lg">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                        <Target className="w-7 h-7 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Lead-to-Project Pipeline</h3>
                        <p className="text-sm text-muted-foreground">Seamless workflow from lead to client</p>
                      </div>
                    </div>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <ArrowRight className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span>Discover leads → Convert to projects</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <ArrowRight className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span>Track progress → Close deals</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <ArrowRight className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span>Manage multiple clients simultaneously</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="job-search" className="space-y-8 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover-elevate border-border/50 shadow-lg">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                        <Briefcase className="w-7 h-7 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Job Scraper</h3>
                        <p className="text-sm text-muted-foreground">Find web development opportunities</p>
                      </div>
                    </div>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>Multiple job platforms integrated</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>Upwork, Freelancer, and more</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>Filter by technology and experience</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>Remote and on-site opportunities</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <Card className="hover-elevate border-border/50 shadow-lg">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <TrendingUp className="w-7 h-7 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Career Growth</h3>
                        <p className="text-sm text-muted-foreground">Expand your web dev business</p>
                      </div>
                    </div>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        <span>Find higher-paying projects</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        <span>Build your client portfolio</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span>Save time on job searching</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="px-5 pb-16 sm:pb-24 max-w-4xl mx-auto"
        >
          <motion.div variants={fadeUp} custom={0}>
            <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-8 pb-8 space-y-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Rocket className="w-6 h-6 text-primary" />
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Ready to grow your web development business?
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  100 free leads per month, multi-platform job scraping, and project management. 
                  No credit card needed. Start landing clients today.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/auth">
                    <Button size="lg" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary" data-testid="button-cta-bottom">
                      <Rocket className="w-4 h-4 mr-2" />
                      Get Started Free
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="border-primary/20 hover:bg-primary/10" onClick={() => setIsJobModalOpen(true)} data-testid="button-jobs-cta">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Browse Jobs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.section>
      </main>

      <footer className="px-5 py-5 pb-8 safe-area-bottom border-t">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground">
          <span>FunnelFox by MellowSites</span>
          <div className="flex items-center gap-3">
            <Link href="/terms">
              <span className="underline cursor-pointer" data-testid="link-footer-terms">Terms of Service</span>
            </Link>
            <Link href="/privacy">
              <span className="underline cursor-pointer" data-testid="link-footer-privacy">Privacy Policy</span>
            </Link>
            <a href="mailto:contact@mellowsites.com" className="underline" data-testid="link-footer-contact">Contact</a>
          </div>
        </div>
      </footer>

      <JobBrowserModal open={isJobModalOpen} onOpenChange={setIsJobModalOpen} />
    </div>
  );
}
