import type { Lead } from "@shared/schema";

export interface LeadScore {
  score: number;
  label: "Hot" | "Warm" | "Cool" | "Cold";
  reasons: string[];
}

export function calculateLeadScore(lead: Lead): LeadScore {
  let score = 0;
  const reasons: string[] = [];

  const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";
  const hasSocial = lead.socialMedia && lead.socialMedia.length > 0;
  const hasEmail = !!lead.contactEmail;
  const hasPhone = !!lead.contactPhone;
  const hasContactName = !!lead.contactName;

  if (noWebsite) {
    score += 30;
    reasons.push("No website — needs one built");
  }

  if (noWebsite && hasSocial) {
    score += 20;
    reasons.push("Active on social media without a website");
  }

  if (!noWebsite && lead.websiteScore !== null && lead.websiteScore !== undefined) {
    if (lead.websiteScore < 30) {
      score += 25;
      reasons.push("Very poor website quality");
    } else if (lead.websiteScore < 50) {
      score += 15;
      reasons.push("Below average website");
    } else if (lead.websiteScore < 70) {
      score += 8;
      reasons.push("Decent website with room for improvement");
    }
  }

  if (hasEmail) {
    score += 10;
    reasons.push("Email available");
  }

  if (hasPhone) {
    score += 5;
    reasons.push("Phone available");
  }

  if (hasContactName) {
    score += 5;
    reasons.push("Contact name known");
  }

  if (!noWebsite && lead.websiteIssues && lead.websiteIssues.length >= 3) {
    score += 5;
    reasons.push(`${lead.websiteIssues.length} website issues found`);
  }

  score = Math.min(score, 100);

  let label: LeadScore["label"];
  if (score >= 60) label = "Hot";
  else if (score >= 40) label = "Warm";
  else if (score >= 20) label = "Cool";
  else label = "Cold";

  return { score, label, reasons };
}

export function getScoreColor(label: LeadScore["label"]): string {
  switch (label) {
    case "Hot": return "text-chart-5";
    case "Warm": return "text-chart-4";
    case "Cool": return "text-chart-3";
    case "Cold": return "text-muted-foreground";
  }
}

export function getScoreBgColor(label: LeadScore["label"]): string {
  switch (label) {
    case "Hot": return "bg-chart-5/10";
    case "Warm": return "bg-chart-4/10";
    case "Cool": return "bg-chart-3/10";
    case "Cold": return "bg-muted";
  }
}
