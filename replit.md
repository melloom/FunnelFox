# FunnelFox - Web Development Lead Generator

## Overview
FunnelFox, formerly LeadHunter, is a lead generation web application designed for web developers. Its primary purpose is to discover, track, and manage potential clients by searching the web for businesses, analyzing their websites for quality issues, and providing a CRM-style pipeline to manage the outreach process from discovery through conversion. The project aims to empower web developers to efficiently find and engage with businesses in need of web development services, focusing on those with poor online presence or without a website.

## User Preferences
- Web developer looking for client leads
- Wants automated lead discovery via web scraping
- Needs CRM-style pipeline to move leads through sales stages
- Focus on finding businesses without websites or with poor websites
- No mock data - real scraping only

## System Architecture
The application follows a client-server architecture.
- **Frontend**: Developed with React, Vite, Tailwind CSS, and Shadcn UI, utilizing wouter for routing. It's built as a Progressive Web App (PWA) with manifest, service worker, and safe-area-inset handling for mobile.
- **Backend**: Implemented using Express.js.
- **Database**: PostgreSQL with Drizzle ORM manages lead data, user information, and session storage. The `leads` table includes a CRM status enum for pipeline management. Leads are global and shared across all users.
- **UI/UX**: Features a redesigned landing page with clear CTA sections, a Kanban-style pipeline board, and a comprehensive account settings page. The application supports dark/light themes. Sidebar navigation is structured for intuitive access to main features and account management.
- **Technical Implementations**:
    - **Authentication**: Custom email/password authentication system with bcrypt hashing and `express-session` using a PostgreSQL session store. Includes Google OAuth sign-in via Google Identity Services (`google-auth-library`) — users signing in with Google skip email verification entirely and are auto-created if new. Also includes a forgot/reset password flow with rate limiting and email integration.
    - **Lead Discovery & Analysis**: Automated web scraping (DuckDuckGo, Bing) for business discovery. `cheerio` is used for HTML parsing and website quality analysis, identifying issues like performance, SEO, accessibility, and security. Technology detection identifies CMS, frameworks, and analytics tools. Website screenshots are generated via thum.io. Add Lead page supports URL lookup (paste Facebook/Yelp/any URL to auto-scrape business info) and company name web search (search the web to find and disambiguate businesses by name).
    - **CRM Pipeline**: An 8-stage Kanban board (New Lead, Contacted, Interested, Demo, Proposal, Negotiation, Won, Lost) facilitates lead management.
    - **Lead Scoring & Management**: Leads are auto-ranked (Hot/Warm/Cool/Cold) based on website status, social media presence, and contact info. Features include bulk actions (move, delete, export), activity logging, and multiple export formats (CSV, Excel, JSON, Copy to Clipboard).
    - **Contact Extraction**: Enhanced contact extraction follows multiple pages (About, Contact, Team) to find emails and phone numbers.
    - **Deduplication**: Fuzzy name matching, phone-based, and cross-key lookup for robust lead deduplication.
    - **Social Media Detection**: Scrapes and stores social media links from websites and via DuckDuckGo, highlighting businesses without websites but with social presence.
    - **Email Integration**: Per-user SMTP email integration allows each user to connect their own email provider (Gmail, Outlook, Yahoo, Zoho, or any SMTP host including business email). Users configure SMTP settings in Account Settings with presets and test connection. Admin retains Gmail API access. Outreach emails are sent from the user's own connected email, with fallback to "Open in Email App" (mailto) if no provider is connected. Emails are logged in the activity timeline.
    - **Business Intelligence**: Lead detail dialogs include BBB rating, Google rating/reviews, sitemap, and robots.txt status.
    - **Job Search (Find Work)**: Pro-only feature with dedicated sidebar navigation. Includes a scraping page (Find Work), a Scraped Jobs page for browsing all scraped listings with filters, and a Saved Jobs page for bookmarked jobs. Users can save/unsave jobs from any job listing view. The sidebar dynamically switches between CRM and Job Search navigation based on the current page.
    - **SaaS Subscription**: Implemented with Stripe for subscription management, including a Free tier and a Pro plan ($30/month) with usage limits (discoveries, leads) and plan comparison. Includes subscription cancellation, resumption, and billing portal access.
    - **Legal Pages**: Dedicated Terms of Service and Privacy Policy pages.

## External Dependencies
- **Stripe**: For SaaS subscription management, checkout, billing portal, and webhook handling.
- **Gmail API (via Replit Gmail connector)**: For sending outreach emails directly from the application.
- **PostgreSQL**: Primary database for all application data.
- **Bing Search**: Data source for lead discovery.
- **DuckDuckGo Search**: Data source for lead discovery, including social media searches.
- **OpenStreetMap Overpass API**: Provides structured business data (addresses, phone numbers, cuisine info) and geocoding via Nominatim.
- **Google Places API (Optional)**: Additional data source for business information (requires `GOOGLE_PLACES_API_KEY`).
- **Yellow Pages**: Data source for business information.
- **thum.io**: For generating website screenshots.
- **SheetJS**: For Excel (.xlsx) export functionality.
- **react-icons/si**: For social media icons.