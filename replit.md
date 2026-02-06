# LeadHunter - Web Development Lead Generator

## Overview
A lead generation web application designed for web developers to discover, track, and manage potential clients. The app helps find businesses with outdated or poor websites and provides a pipeline to manage outreach.

## Recent Changes
- 2026-02-06: Initial MVP built with dashboard, lead list, add lead form, website analyzer, and seed data

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI with wouter routing
- **Backend**: Express.js with PostgreSQL (Drizzle ORM)
- **Database**: PostgreSQL with leads table and status enum
- **Key Features**:
  - Dashboard with pipeline overview and stats
  - Lead list with search, status filter, and industry filter
  - Lead detail dialog with status updates and notes
  - Add lead form with website analysis (scores website quality)
  - Website analyzer checks for mobile responsiveness, HTTPS, meta tags, modern frameworks, etc.

## Project Structure
- `shared/schema.ts` - Drizzle schema for leads table with status enum
- `server/routes.ts` - API routes (CRUD + website analyzer)
- `server/storage.ts` - Database storage layer
- `server/seed.ts` - Seed data with 7 sample leads
- `client/src/pages/dashboard.tsx` - Dashboard with stats and pipeline
- `client/src/pages/leads.tsx` - Lead list with filters and detail dialog
- `client/src/pages/add-lead.tsx` - Add lead form with website analysis
- `client/src/components/app-sidebar.tsx` - Navigation sidebar

## User Preferences
- Web developer looking for client leads
- Wants automated lead discovery
- Needs contact info and website quality assessment
