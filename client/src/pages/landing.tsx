import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Globe,
  Kanban,
  ArrowRight,
  Zap,
  Mail,
  BarChart3,
  Shield,
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
  },
  {
    icon: Globe,
    title: "Website Scoring",
    description: "Every prospect's site gets graded on speed, SEO, mobile, and security — so you can show them exactly what's wrong.",
  },
  {
    icon: Kanban,
    title: "Sales Pipeline",
    description: "Drag-and-drop Kanban board moves prospects from first contact to signed contract across 8 customizable stages.",
  },
  {
    icon: Mail,
    title: "Built-In Outreach",
    description: "Send personalized pitch emails straight from FunnelFox with Gmail — no copy-pasting into another tool.",
  },
  {
    icon: BarChart3,
    title: "Priority Scoring",
    description: "Leads are auto-ranked Hot, Warm, Cool, or Cold so you spend time on the prospects most likely to convert.",
  },
  {
    icon: Shield,
    title: "Deep Business Intel",
    description: "Phone numbers, emails, Google ratings, BBB scores, social links, and tech stack — all pulled automatically.",
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
}: {
  icon: typeof Search;
  title: string;
  description: string;
}) {
  return (
    <motion.div variants={fadeUp}>
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
        <section className="px-5 pt-16 pb-14 sm:pt-24 sm:pb-20 text-center max-w-2xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-5"
          >
            <motion.div variants={fadeUp} custom={0}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Zap className="w-3 h-3" />
                Built for web developers
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
              className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed"
              data-testid="text-landing-subtitle"
            >
              FunnelFox automatically finds businesses with no website or a broken one,
              scores their web presence, and gives you everything you need to pitch them — emails, phone numbers, and a full CRM to close the deal.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/auth">
                <Button size="lg" data-testid="button-login-nav">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
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
          className="px-5 pb-14 sm:pb-20 max-w-2xl mx-auto w-full"
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
          className="px-5 pb-14 sm:pb-20 max-w-4xl mx-auto w-full"
        >
          <motion.div variants={fadeUp} custom={0} className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-features-heading">
              Your entire sales workflow, automated
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Find the prospect, prove they need you, send the pitch, and track every deal — without leaving FunnelFox.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="px-5 pb-16 sm:pb-24 max-w-2xl mx-auto text-center"
        >
          <motion.div variants={fadeUp} custom={0}>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-8 pb-8 space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Your next client is one search away
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  25 free leads a month. No credit card needed. Start landing clients today.
                </p>
                <Link href="/auth">
                  <Button size="lg" data-testid="button-cta-bottom">
                    Get Started Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
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
