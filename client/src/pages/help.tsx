import { HelpCircle, Search, Kanban, Users, Plus, LayoutDashboard, Mail, Star, Globe, Shield, Zap, BarChart3, Smartphone, ChevronDown } from "lucide-react";
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
    answer: "When you search for a business category and location on the Discover page, LeadHunter searches multiple sources including Bing, DuckDuckGo, OpenStreetMap, Google Places, Yelp, and more. It finds real businesses, checks if they have websites, and analyzes their online presence automatically.",
  },
  {
    question: "What does the website score mean?",
    answer: "Each website gets scored from 0-100 based on performance, SEO, accessibility, and security. A low score means the business could benefit from a better website — making them a great potential client for you. You'll also see a letter grade (A through F) and breakdowns by category.",
  },
  {
    question: "How does lead scoring work?",
    answer: "Leads are automatically ranked as Hot, Warm, Cool, or Cold based on factors like whether they have a website, their website quality score, available contact information, and social media presence. Businesses with no website or a poor one are ranked higher since they need your services most.",
  },
  {
    question: "Can I send emails directly from the app?",
    answer: "Yes! If you connect your Gmail account, you can send emails directly from LeadHunter using pre-built templates. If Gmail isn't connected, you can still copy the email or open it in your default email app.",
  },
  {
    question: "What are the pipeline stages?",
    answer: "The pipeline tracks your leads through 8 stages: New Lead, Contacted, Interested, Demo, Proposal, Negotiation, Won, and Lost. Drag leads between stages on the Pipeline page or use the stage buttons in any lead's detail view.",
  },
  {
    question: "How do I avoid contacting the same business twice?",
    answer: "LeadHunter has built-in deduplication. It checks business names (with fuzzy matching), websites, phone numbers, and email addresses to prevent duplicate entries. If a match is found, the existing lead is updated rather than creating a new one.",
  },
  {
    question: "What technologies does it detect?",
    answer: "The analyzer detects 50+ technologies including CMS platforms (WordPress, Wix, Squarespace, Shopify), frameworks (React, Vue, Angular), analytics tools, marketing platforms, hosting providers, and e-commerce systems. This helps you understand what a business is currently using.",
  },
  {
    question: "Does the search cache results?",
    answer: "Yes. Search results are cached for 3 hours so repeat searches load instantly. You'll see a \"From cache\" badge when results come from cache. You can clear the cache from the Discover page if needed.",
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
    description: "Your home base. See a quick overview of your pipeline — how many leads are in each stage, your total leads, and recent activity. Use it to get a snapshot of where things stand.",
  },
  {
    icon: Search,
    title: "Discover Leads",
    description: "Search for businesses by category (like \"restaurants\" or \"dentists\") and location. LeadHunter searches multiple directories and analyzes each business's online presence, website quality, and contact info. Results are saved as leads automatically.",
  },
  {
    icon: Kanban,
    title: "Pipeline",
    description: "A visual board showing all your leads organized by stage. Move leads between stages as you make progress — from first discovery all the way to winning the deal. Think of it as your sales workflow at a glance.",
  },
  {
    icon: Users,
    title: "All Leads",
    description: "A searchable, filterable list of every lead in your database. Click any lead to see full details including website score, contact info, detected technologies, social media links, and activity history. You can also edit notes, change stages, send emails, or delete leads from here.",
  },
  {
    icon: Plus,
    title: "Add Lead",
    description: "Manually add a business you've found on your own. Enter their website URL and LeadHunter will automatically analyze it — checking the site's quality, extracting contact info, detecting technologies, and capturing a screenshot.",
  },
  {
    icon: Mail,
    title: "Email Templates",
    description: "When you're ready to reach out, click \"Email Lead\" on any lead with a contact email. Choose from pre-built templates (Introduction, Free Audit, Follow Up, No Website Pitch, Proposal, Social to Website) that auto-fill with the lead's info. Connect Gmail to send directly, or copy the email to your clipboard.",
  },
];

const features = [
  { icon: Globe, label: "Multi-source search", detail: "Bing, DuckDuckGo, OpenStreetMap, Google Places, Yelp" },
  { icon: BarChart3, label: "Website scoring", detail: "Performance, SEO, Accessibility, Security analysis with A-F grades" },
  { icon: Zap, label: "Technology detection", detail: "50+ CMS, frameworks, analytics, and hosting platforms" },
  { icon: Star, label: "Lead scoring", detail: "Auto-ranks leads as Hot, Warm, Cool, or Cold" },
  { icon: Shield, label: "Smart deduplication", detail: "Fuzzy name matching, domain, phone, and email dedup" },
  { icon: Smartphone, label: "Mobile ready", detail: "Works on any device as an installable PWA" },
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
          Everything you need to know about using LeadHunter to find and manage web development leads.
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
                  <p className="text-sm text-muted-foreground">Go to Discover Leads and search for a business type in your area — for example, "plumbers in Baltimore".</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Badge variant="secondary" className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">2</Badge>
                <div>
                  <p className="text-sm font-medium">Review results</p>
                  <p className="text-sm text-muted-foreground">LeadHunter finds businesses, checks their websites, and scores them. Look for low scores or businesses without websites — those are your best prospects.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Badge variant="secondary" className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">3</Badge>
                <div>
                  <p className="text-sm font-medium">Reach out</p>
                  <p className="text-sm text-muted-foreground">Open a lead's details, use an email template to craft your pitch, and send it directly via Gmail or your email app.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Badge variant="secondary" className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full p-0 text-xs">4</Badge>
                <div>
                  <p className="text-sm font-medium">Track progress</p>
                  <p className="text-sm text-muted-foreground">Move leads through your pipeline stages as conversations progress. Use the Dashboard for a quick overview of where everything stands.</p>
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
        <h2 className="text-lg font-semibold mb-3" data-testid="text-faq">Frequently Asked Questions</h2>
        <Card>
          <CardContent className="p-4 sm:p-6">
            {faqs.map((faq) => (
              <FAQAccordion key={faq.question} item={faq} />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
