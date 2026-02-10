# FunnelFox - Web Development Lead Generator

**Live Site:** [https://funnelfox.org](https://funnelfox.org)

A lead generation web application built for web developers to discover, track, and manage potential clients. FunnelFox searches the web for businesses, analyzes their websites for quality issues, and provides a CRM-style pipeline to manage outreach from discovery through conversion.

## Features

### Lead Discovery
- Automated business discovery using multiple data sources (Bing, DuckDuckGo, OpenStreetMap, Google Maps, Yelp, Yellow Pages, Google Places)
- Search by business category and location
- Smart deduplication with fuzzy name matching
- In-memory caching for fast repeat searches
- Social media detection (Facebook, Instagram, LinkedIn, YouTube, TikTok, Pinterest)
- Contact information extraction (emails, phone numbers) from business websites

### Website Analysis
- Lighthouse-style scoring with A-F letter grades
- Per-category sub-scores: Performance, SEO, Accessibility, Security
- Core Web Vitals proxy checks (render-blocking resources, CLS indicators, font optimization, image optimization)
- 50+ technology detection signatures (CMS, frameworks, UI libraries, hosting, analytics, marketing tools)
- Website screenshots via thum.io
- Identifies businesses without websites as high-value leads

### CRM Pipeline
- 8-stage Kanban board: New Lead, Contacted, Interested, Demo, Proposal, Negotiation, Won, Lost
- Drag leads through stages with one click
- Lead scoring system (Hot, Warm, Cool, Cold) based on website status, contact info, and quality
- Activity timeline tracking stage changes and notes
- Bulk actions: multi-select, bulk move, bulk delete, bulk export

### Outreach Tools
- Built-in email templates with dynamic lead data
- Copy-to-clipboard for emails and phone numbers
- CSV export for lead lists
- Lead notes and activity history

### Mobile-Ready
- Progressive Web App (PWA) with offline support
- Safe-area handling for phone notches
- Responsive design across all screen sizes

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Custom email/password auth with bcrypt
- **Web Scraping:** Cheerio for HTML parsing
