import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
    description: "Search across 6+ data sources to instantly find businesses in any niche and city that need a website or a better one.",
    badge: "AI-Powered"
  },
  {
    icon: Globe,
    title: "Website Scoring",
    description: "Every prospect's site gets graded on speed, SEO, mobile, and security — so you can show them exactly what's wrong.",
    badge: "Technical Analysis"
  },
  {
    icon: Kanban,
    title: "Sales Pipeline",
    description: "Drag-and-drop Kanban board moves prospects from first contact to signed contract across 8 customizable stages.",
    badge: "Visual CRM"
  },
  {
    icon: Briefcase,
    title: "Job Scraper",
    description: "Find web development jobs from multiple platforms - Upwork, Freelancer, and more - all in one place.",
    badge: "NEW"
  },
  {
    icon: Code,
    title: "Project Management",
    description: "Track all your client projects in one place with timelines, budgets, and lead-to-project connections.",
    badge: "NEW"
  },
  {
    icon: Mail,
    title: "Built-In Outreach",
    description: "Send personalized pitch emails straight from FunnelFox with Gmail — no copy-pasting into another tool.",
    badge: "Email Integration"
  },
  {
    icon: BarChart3,
    title: "Priority Scoring",
    description: "Leads are auto-ranked Hot, Warm, Cool, or Cold so you spend time on the prospects most likely to convert.",
    badge: "Smart Scoring"
  },
  {
    icon: Shield,
    title: "Deep Business Intel",
    description: "Phone numbers, emails, Google ratings, BBB scores, social links, and tech stack — all pulled automatically.",
    badge: "Data Mining"
  },
];

const stats = [
  { value: "6+", label: "Data Sources" },
  { value: "8", label: "Pipeline Stages" },
  { value: "100%", label: "Automated" },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: typeof Search;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="hover-elevate h-full relative overflow-hidden">
        {badge && (
          <Badge className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground text-xs font-medium px-2 py-1">
            {badge}
          </Badge>
        )}
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
              <Link href="/find-work">
                <Button variant="outline" size="lg" data-testid="button-find-work-nav">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Browse Jobs
                </Button>
              </Link>
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
          className="px-5 pb-14 sm:pb-20 max-w-6xl mx-auto w-full"
        >
          <motion.div variants={fadeUp} custom={0} className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-features-heading">
              Your entire business workflow, automated
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Find the prospect, prove they need you, send the pitch, track deals, manage projects, and find jobs — all in one platform.
            </p>
          </motion.div>
          
          <Tabs defaultValue="lead-generation" className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="lead-generation" className="data-[state=active]:bg-background">
                <Search className="w-4 h-4 mr-2" />
                Lead Generation
              </TabsTrigger>
              <TabsTrigger value="project-management" className="data-[state=active]:bg-background">
                <Code className="w-4 h-4 mr-2" />
                Project Management
              </TabsTrigger>
              <TabsTrigger value="job-search" className="data-[state=active]:bg-background">
                <Briefcase className="w-4 h-4 mr-2" />
                Job Search
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="lead-generation" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.slice(0, 6).map((feature) => (
                  <FeatureCard key={feature.title} {...feature} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="project-management" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <Code className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Project Management</h3>
                        <p className="text-sm text-muted-foreground">Track all your client projects in one place</p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Convert leads to projects with one click</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Track timelines, budgets, and priorities</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Visual project cards with status indicators</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Technology stack organization</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                        <Target className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Lead-to-Project Pipeline</h3>
                        <p className="text-sm text-muted-foreground">Seamless workflow from lead to client</p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-blue-500" />
                        <span>Discover leads → Convert to projects</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-blue-500" />
                        <span>Track progress → Close deals</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-blue-500" />
                        <span>Manage multiple clients simultaneously</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="job-search" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Job Scraper</h3>
                        <p className="text-sm text-muted-foreground">Find web development opportunities</p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Multiple job platforms integrated</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Upwork, Freelancer, and more</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Filter by technology and experience</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Remote and on-site opportunities</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <Card className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Career Growth</h3>
                        <p className="text-sm text-muted-foreground">Expand your web dev business</p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>Find higher-paying projects</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>Build your client portfolio</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span>Save time on job searching</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
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
                  25 free leads per month, job scraping, and project management. 
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
                  <Link href="/find-work">
                    <Button variant="outline" size="lg" className="border-primary/20 hover:bg-primary/10" data-testid="button-jobs-cta">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Browse Jobs
                    </Button>
                  </Link>
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
    </div>
  );
}
