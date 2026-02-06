# LeadHunter - Web Development Lead Generator

## Overview
A lead generation web application designed for web developers to discover, track, and manage potential clients. The app searches the web for businesses, analyzes their websites for quality issues, and provides a pipeline to manage outreach.

## Recent Changes
- 2026-02-06: Built automated lead discovery with real web scraping (DuckDuckGo + Bing), website quality analysis using cheerio, discover page with category/location search, manual lead entry, and lead pipeline management. Removed all mock/seed data.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI with wouter routing
- **Backend**: Express.js with PostgreSQL (Drizzle ORM)
- **Database**: PostgreSQL with leads table and status enum
- **Web Scraping**: cheerio for HTML parsing, server-side fetch for DuckDuckGo/Bing search and website analysis
- **Key Features**:
  - Dashboard with pipeline overview and stats
  - **Discover Leads** page - search by business category + location, auto-scrapes the web
  - Lead list with search, status filter, and industry filter
  - Lead detail dialog with status updates and notes
  - Add lead form with website quality analysis
  - Website analyzer checks for mobile responsiveness, HTTPS, meta tags, modern frameworks, load time, SEO, etc.

## Project Structure
- `shared/schema.ts` - Drizzle schema for leads table with status enum
- `server/routes.ts` - API routes (CRUD + website analyzer + discover)
- `server/storage.ts` - Database storage layer (DatabaseStorage)
- `server/scraper.ts` - Web scraping service (search engines + website analysis)
- `server/db.ts` - Database connection
- `client/src/pages/dashboard.tsx` - Dashboard with stats and pipeline
- `client/src/pages/discover.tsx` - Automated lead discovery page
- `client/src/pages/leads.tsx` - Lead list with filters and detail dialog
- `client/src/pages/add-lead.tsx` - Add lead form with website analysis
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `client/src/components/theme-provider.tsx` - Dark/light theme support

## API Endpoints
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create a lead
- `PATCH /api/leads/:id` - Update a lead
- `DELETE /api/leads/:id` - Delete a lead
- `POST /api/discover` - Discover businesses by category/location (auto-scrape)
- `POST /api/analyze-website` - Analyze a single website

## User Preferences
- Web developer looking for client leads
- Wants automated lead discovery via web scraping
- Needs contact info and website quality assessment
- No mock data - real scraping only
