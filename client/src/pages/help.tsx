import {
  HelpCircle, Search, Kanban, Users, Plus, LayoutDashboard, Mail, Star,
  Globe, Shield, Zap, BarChart3, Smartphone, ChevronDown, CreditCard,
  Download, CheckSquare, Settings, FileText, Target, Crown, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does lead discovery work?",
    answer: "When you search for a business category and location on the Discover page, FunnelFox searches multiple sources including Bing, DuckDuckGo, OpenStreetMap, Google Places, Yelp, and more. It finds real businesses, checks if they have websites, and analyzes their online presence automatically. Results are automatically saved as leads in your database.",
  },
  {
    question: "What does the website score mean?",
    answer: "Each website gets scored from 0-100 based on four categories: Performance, SEO, Accessibility, and Security. A low score means the business could benefit from a better website, making them a great potential client. You'll see a letter grade (A through F) and breakdowns by category. Businesses without websites get a score of 0 and are flagged as high-priority leads.",
  },
  {
    question: "How does lead scoring work?",
    answer: "Leads are automatically ranked as Hot, Warm, Cool, or Cold based on several factors: whether they have a website, their website quality score, available contact information (email, phone), social media presence, and business intelligence data (BBB rating, Google reviews). Businesses with no website or a very poor one are ranked highest since they need your services most.",
  },
  {
    question: "Can I send emails directly from the app?",
    answer: "Yes! If you connect your Gmail account through the app, you can send professional outreach emails directly from FunnelFox using pre-built templates. Templates include Introduction, Free Audit, Follow Up, No Website Pitch, Proposal, and Social to Website. Each email uses a professional HTML layout with your name and branding. If Gmail isn't connected, you can copy the email content or open it in your default email client.",
  },
  {
    question: "What are the pipeline stages?",
    answer: "The pipeline tracks your leads through 8 stages: New Lead (just discovered), Contacted (reached out), Interested (showed interest), Demo (meeting scheduled), Proposal (quote sent), Negotiation (discussing terms), Won (deal closed), and Lost (didn't work out). Drag leads between stages on the Pipeline page or use the stage buttons in any lead's detail view.",
  },
  {
    question: "How do I avoid contacting the same business twice?",
    answer: "FunnelFox has built-in smart deduplication that runs automatically during discovery. It checks business names (with fuzzy matching using Levenshtein similarity), website domains, phone numbers, and email addresses to prevent duplicate entries. If a match is found, the existing lead is updated with any new information rather than creating a duplicate.",
  },
  {
    question: "What technologies does it detect?",
    answer: "The analyzer detects 50+ technologies including CMS platforms (WordPress, Wix, Squarespace, Shopify, Webflow), JavaScript frameworks (React, Vue, Angular, Next.js), analytics tools (Google Analytics, Facebook Pixel), marketing platforms, hosting providers (Cloudflare, AWS, Vercel), and e-commerce systems. This helps you understand what a business is currently using and tailor your pitch.",
  },
  {
    question: "Does the search cache results?",
    answer: "Yes. Search results are cached for 3 hours so repeat searches load instantly without counting against your discovery limit. You'll see a 'From cache' badge when results come from cache. You can clear the cache from the Discover page if you want fresh results.",
  },
  {
    question: "How do I export my leads?",
    answer: "Go to the All Leads page and click the Export button. You can export in four formats: CSV (.csv) for spreadsheets, Excel (.xlsx) for Microsoft Excel, JSON (.json) for developer tools, or Copy to Clipboard (tab-separated format that pastes directly into Google Sheets or Airtable). You can also select specific leads first and export just those.",
  },
  {
    question: "What are bulk actions?",
    answer: "On the All Leads page, you can select multiple leads using the checkboxes, then perform actions on all selected leads at once: move them to a pipeline stage, delete them, or export them. This is especially useful when processing large discovery batches.",
  },
  {
    question: "What's included in the Free plan?",
    answer: "The Free plan includes up to 25 leads per month, up to 25 saved leads, basic website analysis, and full pipeline management. Limits reset on the first of each month.",
  },
  {
    question: "What's included in the Pro plan?",
    answer: "The Pro plan ($30/month) includes up to 300 leads per month, unlimited saved leads, full website analysis and scoring, all data sources (BBB, Google, Yelp), Gmail integration for direct outreach, bulk actions and export, technology detection for 50+ platforms, and the Find Work feature for job discovery and freelance projects from multiple sources.",
  },
  {
    question: "How do I cancel or change my subscription?",
    answer: "Go to the Subscription page from the sidebar. Pro subscribers can cancel their subscription directly with the Cancel button -- you'll keep access until the end of your billing period. If you've canceled, you can resume anytime before the period ends. You can also manage your payment method and billing details through the Manage Billing portal.",
  },
  {
    question: "What business intelligence is shown for leads?",
    answer: "FunnelFox enriches leads with BBB (Better Business Bureau) ratings and accreditation status, Google ratings and review counts, sitemap availability, and robots.txt status. These indicators appear as compact badges on lead cards and as a detailed section in the lead detail view.",
  },
  {
    question: "Can I add leads manually?",
    answer: "Yes! Use the Add Lead page to enter a business website URL. FunnelFox will automatically analyze the website, check quality, extract contact information (emails, phone numbers), detect technologies, capture a screenshot, and calculate a website score. You can also fill in details manually.",
  },
  {
    question: "What is Find Work and how does it work?",
    answer: "Find Work is a premium feature that scrapes real job opportunities and freelance projects from multiple sources. It searches job boards like Indeed, LinkedIn, RemoteOK for traditional jobs, and freelance platforms like Upwork, Fiverr, Reddit, and Facebook Groups for project-based work. You can filter by technology stack, experience level, job type, location, and salary. Available with the $30/month subscription.",
  },
  {
    question: "What job sources does Find Work scrape?",
    answer: "Find Work scrapes from multiple sources: Traditional job boards (Indeed, LinkedIn, Stack Overflow Jobs, RemoteOK) for full-time and part-time positions, and freelance platforms (Upwork, Fiverr, Reddit subreddits like r/freelance and r/webdev, Facebook Groups for developers) for project-based work. All sources are scraped in real-time with proper rate limiting.",
  },
  {
    question: "How often does Find Work scrape new jobs?",
    answer: "You can trigger fresh scraping anytime with the 'Scrape New Jobs' button. The system scrapes the most recent postings from each source (typically from the last 7 days for Indeed, 24 hours for Reddit, etc.). Jobs are cached in your database so you can search and filter them instantly without re-scraping.",
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-3 text-left hover-elevate rounded-md px-2"
        data-testid={`button-faq-${item.question.slice(0, 20).replace(/\s/g, "-").toLowerCase()}`}
      >
        <span className="text-sm font-medium pr-4">{item.question}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="text-sm text-muted-foreground pb-3 px-2 leading-relaxed">{item.answer}</p>
      )}
    </div>
  );
}

const sections = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Your home base. See a quick overview of your pipeline, how many leads are in each stage, your total leads, and recent activity. Use it to get a snapshot of where things stand at a glance.",
  },
  {
    icon: Search,
    title: "Discover Leads",
    description: "Search for businesses by category (like 'restaurants' or 'dentists') and location. FunnelFox searches multiple directories and analyzes each business's online presence, website quality, contact info, and social media. Results are saved as leads automatically.",
  },
  {
    icon: Kanban,
    title: "Pipeline",
    description: "A visual Kanban board showing all your leads organized by stage. Move leads between stages as you make progress, from first discovery all the way to winning the deal. Each column represents a stage in your sales workflow.",
  },
  {
    icon: Users,
    title: "All Leads",
    description: "A searchable, filterable list of every lead in your database. Click any lead to see full details including website score, contact info, detected technologies, social media links, business intelligence, and activity history. Edit notes, change stages, send emails, export, or delete leads from here.",
  },
  {
    icon: Plus,
    title: "Add Lead",
    description: "Manually add a business you've found on your own. Enter their website URL and FunnelFox will automatically analyze it, checking the site's quality, extracting contact info, detecting technologies, and capturing a screenshot.",
  },
  {
    icon: Mail,
    title: "Email Outreach",
    description: "When you're ready to reach out, click 'Email Lead' on any lead with a contact email. Choose from 6 pre-built templates (Introduction, Free Audit, Follow Up, No Website Pitch, Proposal, Social to Website) that auto-fill with the lead's info. Connect Gmail to send directly with a professional HTML template, or copy the email to your clipboard.",
  },
  {
    icon: Briefcase,
    title: "Find Work",
    description: "Discover job opportunities and freelance projects from multiple sources. Scrape real job listings from Indeed, LinkedIn, RemoteOK, and freelance projects from Upwork, Fiverr, Reddit, and Facebook Groups. Filter by technology, experience level, job type, and location. Available with the $30/month subscription.",
  },
  {
    icon: CreditCard,
    title: "Subscription",
    description: "View your current plan, usage limits, and billing details. Upgrade to Pro for more discoveries and unlimited leads. Cancel, resume, or manage your billing directly from this page.",
  },
  {
    icon: Settings,
    title: "Account",
    description: "View your profile information and manage your account. Delete your account if needed (requires canceling any active subscription first).",
  },
];

const features = [
  { icon: Globe, label: "Multi-source search", detail: "Bing, DuckDuckGo, OpenStreetMap, Google Places, Yellow Pages, Yelp" },
  { icon: BarChart3, label: "Website scoring", detail: "Performance, SEO, Accessibility, Security analysis with A-F letter grades" },
  { icon: Zap, label: "Technology detection", detail: "50+ CMS, frameworks, analytics, hosting, and e-commerce platforms" },
  { icon: Star, label: "Lead scoring", detail: "Auto-ranks leads as Hot, Warm, Cool, or Cold based on multiple signals" },
  { icon: Shield, label: "Smart deduplication", detail: "Fuzzy name matching, domain, phone, and email dedup prevents duplicates" },
  { icon: Mail, label: "Gmail integration", detail: "Send professional outreach emails with 6 templates directly from the app" },
  { icon: Download, label: "Export options", detail: "CSV, Excel (.xlsx), JSON, or copy to clipboard for Google Sheets / Airtable" },
  { icon: CheckSquare, label: "Bulk actions", detail: "Select multiple leads to move stages, delete, or export all at once" },
  { icon: Smartphone, label: "Mobile ready (PWA)", detail: "Works on any device and can be installed as an app on your phone" },
  { icon: Target, label: "Contact extraction", detail: "Auto-scrapes emails, phone numbers from websites and contact pages" },
  { icon: FileText, label: "Business intelligence", detail: "BBB rating, Google reviews, sitemap and robots.txt status" },
  { icon: Crown, label: "Activity timeline", detail: "Track every action on a lead: stage changes, notes, emails sent" },
];

export default function HelpPage() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-help-title">
          <HelpCircle className="w-6 h-6 text-primary" />
          Help & Guide
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you need to know about using FunnelFox to find and manage web development leads.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3" data-testid="text-getting-started">Getting Started</h2>
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Badge variant="secondary" className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">1</Badge>
                <div>
                  <p className="text-sm font-medium">Discover leads</p>
                  <p className="text-sm text-muted-foreground">Go to Discover Leads and search for a business type in your area, for example "plumbers in Baltimore" or "restaurants in Austin". FunnelFox searches across multiple sources simultaneously.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Badge variant="secondary" className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">2</Badge>
                <div>
                  <p className="text-sm font-medium">Review results</p>
                  <p className="text-sm text-muted-foreground">FunnelFox finds businesses, checks their websites, and scores them. Look for low scores or businesses without websites. Those are your best prospects. Each lead shows a priority badge (Hot, Warm, Cool, Cold).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Badge variant="secondary" className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">3</Badge>
                <div>
                  <p className="text-sm font-medium">Reach out</p>
                  <p className="text-sm text-muted-foreground">Open a lead's details, pick an email template that fits, customize your message, and send it directly via Gmail or copy it to your email app. Move the lead to "Contacted" in the pipeline.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Badge variant="secondary" className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">4</Badge>
                <div>
                  <p className="text-sm font-medium">Track progress</p>
                  <p className="text-sm text-muted-foreground">Move leads through your pipeline stages as conversations progress. Add notes, track activity, and use the Dashboard for a quick overview of where everything stands.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Badge variant="secondary" className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">5</Badge>
                <div>
                  <p className="text-sm font-medium">Export and organize</p>
                  <p className="text-sm text-muted-foreground">Use bulk actions to manage leads efficiently. Export your leads to CSV, Excel, or JSON. Copy to clipboard for quick pasting into Google Sheets or Airtable.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3" data-testid="text-pages-overview">Pages Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sections.map((s) => (
            <Card key={s.title}>
              <CardHeader className="flex flex-row items-center gap-3 p-4 pb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="text-sm">{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3" data-testid="text-key-features">Key Features</h2>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((f) => (
                <div key={f.label} className="flex gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3" data-testid="text-pipeline-stages">Pipeline Stages</h2>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-muted-foreground mb-3">
              Your leads move through these stages as you progress from discovery to closing the deal:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: "New Lead", desc: "Just discovered" },
                { name: "Contacted", desc: "Reached out" },
                { name: "Interested", desc: "Showed interest" },
                { name: "Demo", desc: "Meeting scheduled" },
                { name: "Proposal", desc: "Quote sent" },
                { name: "Negotiation", desc: "Discussing terms" },
                { name: "Won", desc: "Deal closed" },
                { name: "Lost", desc: "Didn't work out" },
              ].map((stage, i) => (
                <div key={stage.name} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                  <span className="text-xs font-bold text-muted-foreground">{i + 1}.</span>
                  <div>
                    <p className="text-xs font-medium">{stage.name}</p>
                    <p className="text-[11px] text-muted-foreground">{stage.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3" data-testid="text-subscription-plans">Subscription Plans</h2>
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Free Plan</p>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 pl-6">
                  <li>25 leads per month</li>
                  <li>25 saved leads maximum</li>
                  <li>Basic website analysis</li>
                  <li>Full pipeline management</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Pro Plan - $30/month</p>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 pl-6">
                  <li>300 leads per month</li>
                  <li>Unlimited saved leads</li>
                  <li>Full website scoring & analysis</li>
                  <li>All data sources (BBB, Google, Yelp)</li>
                  <li>Gmail integration for outreach</li>
                  <li>Bulk actions & multi-format export</li>
                  <li>Technology detection (50+ platforms)</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Discovery limits reset on the 1st of each month. You can upgrade, cancel, or resume your subscription anytime from the Subscription page.
              Canceling keeps your Pro access until the end of the billing period. No partial refunds for unused time.
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3" data-testid="text-faq">Frequently Asked Questions</h2>
        <Card>
          <CardContent className="p-4 sm:p-6">
            {faqs.map((faq) => (
              <FAQAccordion key={faq.question} item={faq} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Need more help? Contact us at{" "}
              <a href="mailto:contact@mellowsites.com" className="text-primary underline" data-testid="link-help-email">
                contact@mellowsites.com
              </a>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
