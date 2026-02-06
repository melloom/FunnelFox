# LeadHunter - Web Development Lead Generator

## Overview
A lead generation web application designed for web developers to discover, track, and manage potential clients. The app searches the web for businesses, analyzes their websites for quality issues, and provides a CRM-style pipeline to manage outreach from discovery through conversion.

## Recent Changes
- 2026-02-06: Added OpenStreetMap Overpass API and Google Places API (optional) as additional data sources. OSM provides structured business data with addresses, phone numbers, and cuisine info. Google Places requires GOOGLE_PLACES_API_KEY env var. Added 30+ OSM category mappings, geocoding via Nominatim, and improved address/phone propagation to leads.
- 2026-02-06: Rewrote scraper to fix search engine blocking (switched to Safari UA), extract real URLs from Bing cite elements instead of redirect URLs, added 50+ aggregator site filters, list-title pattern detection, and improved business name cleaning. Cleaned junk data from database.
- 2026-02-06: Added CRM pipeline with 8 stages (New Lead, Contacted, Interested, Demo, Proposal, Negotiation, Won, Lost). Built Kanban-style pipeline board page. Updated all pages to use new pipeline stages with move-to-stage functionality.
- 2026-02-06: Built automated lead discovery with real web scraping (DuckDuckGo + Bing), website quality analysis using cheerio, discover page with category/location search, manual lead entry, and lead pipeline management.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI with wouter routing
- **Backend**: Express.js with PostgreSQL (Drizzle ORM)
- **Database**: PostgreSQL with leads table and CRM status enum (9 stages)
- **Data Sources**: Bing search, DuckDuckGo search, OpenStreetMap Overpass API (free, no key), Google Places API (optional, needs GOOGLE_PLACES_API_KEY)
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

## API Endpoints
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
