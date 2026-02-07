# LeadHunter - Web Development Lead Generator

## Overview
A lead generation web application designed for web developers to discover, track, and manage potential clients. The app searches the web for businesses, analyzes their websites for quality issues, and provides a CRM-style pipeline to manage outreach from discovery through conversion.

## Recent Changes
- 2026-02-07: Added Terms of Service (/terms) and Privacy Policy (/privacy) legal pages. Contact email: contact@mellowsites.com, company: MellowSites. Covers billing, cookies, data handling, GDPR rights, third-party services. Legal links added to landing page footer, auth page, and sidebar footer. Routes accessible both logged in and logged out. Files: client/src/pages/terms.tsx, client/src/pages/privacy.tsx.
- 2026-02-07: Enhanced webhook handler with invoice.payment_failed logging, cancel_at_period_end awareness, and monthlyDiscoveriesUsed reset on subscription deletion. Fixed discovery limit check to use req.session.userId.
- 2026-02-07: Added SaaS subscription system with Stripe integration. $20/month Pro plan with 50 discoveries/month and unlimited leads. Free tier: 5 discoveries/month, 25 leads max. Pricing page with plan comparison. Stripe checkout, billing portal, and webhook handling. Usage tracking with monthly reset. Plan status shown in sidebar footer and discover page. Feature gating on discover and lead creation endpoints. Files: server/stripeClient.ts, server/stripe-routes.ts, server/webhookHandlers.ts, server/seed-stripe.ts, client/src/pages/pricing.tsx. New user columns: stripeCustomerId, stripeSubscriptionId, planStatus, monthlyDiscoveriesUsed, usageResetDate.
- 2026-02-07: Added Business Intelligence section to lead detail dialogs (leads + pipeline pages) showing BBB rating, Google rating/reviews, sitemap status, robots.txt status. Compact BBB/Google indicators on lead list cards and pipeline cards.
- 2026-02-07: Added Help page (/help) with Getting Started guide, Pages Overview, Key Features, Pipeline Stages, and FAQ accordion. Added Help link with HelpCircle icon to sidebar navigation. Added email send confirmation dialog (AlertDialog) that shows recipient and subject before sending.
- 2026-02-07: Added Gmail integration for sending outreach emails directly from the app. Uses Replit Gmail connector with OAuth. Send button in email template dialog sends via Gmail API. Sent emails logged in activity timeline. Falls back to "Open in Email App" if Gmail not connected. Endpoints: GET /api/gmail/status, POST /api/gmail/send. Server module: server/gmail.ts.
- 2026-02-06: Added Lighthouse-style website scoring with categorized issues (Performance, SEO, Accessibility, Security). Technology detection identifies CMS (WordPress, Wix, Squarespace, Shopify, etc.), frameworks (React, Next.js, Vue, Angular), analytics, marketing tools, hosting, and e-commerce platforms. Website screenshots via thum.io. New DB columns: detected_technologies (text array), screenshot_url (text).
- 2026-02-06: Enhanced contact extraction to follow About, Contact, Team, Staff, and People pages (up to 4 in parallel) for deeper email/phone discovery. Added Yelp scraping (direct HTML + JSON fallback + DDG fallback) and Facebook/Instagram business page discovery via DuckDuckGo as new data sources.
- 2026-02-06: Added bulk actions (multi-select leads, bulk move stage, bulk delete, bulk export). Added lead scoring system that auto-ranks leads by priority (Hot/Warm/Cool/Cold) based on website status, social media, contact info, and website quality. Added activity log/timeline tracking stage changes and note edits with timestamps. Sort leads by priority or date.
- 2026-02-06: Added in-memory search result caching (3-hour TTL, max 200 entries). Repeat searches return instantly from cache. Cache stats and clear endpoints added (GET /api/cache/stats, POST /api/cache/clear). "From cache" badge shown on discover page results. Automatic pruning of expired/overflow entries.
- 2026-02-06: Improved deduplication with fuzzy name matching (Levenshtein similarity >0.85), phone-based dedup, substring matching, and cross-key lookup (domain + name + phone). Route-level dedup also improved with same logic against existing DB leads. Added contact info extraction from websites: scrapes emails (regex + mailto: links), phone numbers (regex + tel: links), follows contact pages for additional data. Auto-fills lead contactEmail and contactPhone fields.
- 2026-02-06: Added social media detection feature. Scraper searches Facebook/Instagram via DuckDuckGo, extracts social links from analyzed websites, stores as "platform:url" arrays in leads.socialMedia column. Businesses with social media but no website flagged as "High value" leads with star badge. Social media icons (react-icons/si) shown in leads list, pipeline cards, and detail dialogs with clickable links.
- 2026-02-06: Switched from Replit Auth (OIDC) to custom email/password authentication with bcrypt password hashing, express-session with PostgreSQL session store. Added login/register pages, landing page redesign with hero, how-it-works, features, and CTA sections. Seeded account: Melvin.a.p.cruz@gmail.com.
- 2026-02-06: Made app a PWA with manifest, service worker, and app icons. Added safe-area-inset handling for phone notches (viewport-fit=cover, safe-area CSS classes). Uses 100dvh for proper mobile height. Added apple-mobile-web-app meta tags.
- 2026-02-06: Added OpenStreetMap Overpass API and Google Places API (optional) as additional data sources. OSM provides structured business data with addresses, phone numbers, and cuisine info. Google Places requires GOOGLE_PLACES_API_KEY env var. Added 30+ OSM category mappings, geocoding via Nominatim, and improved address/phone propagation to leads.
- 2026-02-06: Rewrote scraper to fix search engine blocking (switched to Safari UA), extract real URLs from Bing cite elements instead of redirect URLs, added 50+ aggregator site filters, list-title pattern detection, and improved business name cleaning. Cleaned junk data from database.
- 2026-02-06: Added CRM pipeline with 8 stages (New Lead, Contacted, Interested, Demo, Proposal, Negotiation, Won, Lost). Built Kanban-style pipeline board page. Updated all pages to use new pipeline stages with move-to-stage functionality.
- 2026-02-06: Built automated lead discovery with real web scraping (DuckDuckGo + Bing), website quality analysis using cheerio, discover page with category/location search, manual lead entry, and lead pipeline management.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI with wouter routing
- **Backend**: Express.js with PostgreSQL (Drizzle ORM)
- **Database**: PostgreSQL with leads table and CRM status enum (9 stages)
- **Data Sources**: Bing search, DuckDuckGo search, OpenStreetMap Overpass API (free, no key), Google Maps (no key), Yellow Pages, Google Places API (optional, needs GOOGLE_PLACES_API_KEY)
- **Web Scraping**: cheerio for HTML parsing, server-side fetch for search engines and website analysis
- **Key Features**:
  - Dashboard with pipeline overview stats
  - **Pipeline** page - Kanban board with columns for each CRM stage, move leads between stages
  - **Discover Leads** page - search by business category + location, auto-scrapes the web and directories
  - Lead list with search, status filter, and industry filter
  - Lead detail dialog with stage management, notes, and delete
  - Add lead form with website quality analysis
  - Website analyzer checks for mobile responsiveness, HTTPS, meta tags, modern frameworks, load time, SEO, etc.
  - Identifies businesses without websites as high-value leads

## Pipeline Stages (CRM)
1. New Lead - just discovered
2. Contacted - reached out
3. Interested - showed interest
4. Demo - demo/meeting scheduled
5. Proposal - proposal/quote sent
6. Negotiation - discussing terms
7. Won - successfully converted
8. Lost - didn't work out

## Project Structure
- `shared/schema.ts` - Drizzle schema with leads table, CRM status enum, PIPELINE_STAGES config
- `server/routes.ts` - API routes (CRUD + website analyzer + discover)
- `server/storage.ts` - Database storage layer (DatabaseStorage)
- `server/scraper.ts` - Web scraping service (search engines, directory scraping, website analysis)
- `server/db.ts` - Database connection
- `client/src/pages/dashboard.tsx` - Dashboard with stats and pipeline overview
- `client/src/pages/pipeline.tsx` - Kanban board for CRM pipeline management
- `client/src/pages/discover.tsx` - Automated lead discovery page
- `client/src/pages/leads.tsx` - Lead list with filters and detail dialog
- `client/src/pages/add-lead.tsx` - Add lead form with website analysis
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `client/src/components/theme-provider.tsx` - Dark/light theme support

## Authentication
- Custom email/password auth with bcrypt password hashing
- express-session with PostgreSQL session store (connect-pg-simple)
- POST /api/register, POST /api/login, POST /api/logout, GET /api/auth/user
- All API endpoints protected with isAuthenticated middleware
- Auth files in server/replit_integrations/auth/ (replitAuth.ts, routes.ts, storage.ts)

## API Endpoints
- `POST /api/register` - Create account (email, password, firstName, lastName)
- `POST /api/login` - Sign in (email, password)
- `POST /api/logout` - Sign out
- `GET /api/auth/user` - Get current user
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create a lead
- `PATCH /api/leads/:id` - Update a lead (including status/stage changes)
- `DELETE /api/leads/:id` - Delete a lead
- `POST /api/discover` - Discover businesses by category/location (auto-scrape)
- `POST /api/analyze-website` - Analyze a single website

## User Preferences
- Web developer looking for client leads
- Wants automated lead discovery via web scraping
- Needs CRM-style pipeline to move leads through sales stages
- Focus on finding businesses without websites or with poor websites
- No mock data - real scraping only
