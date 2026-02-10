import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TermsPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-8 pb-10 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-terms">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-terms-title">Terms of Service</h1>
        </div>

        <p className="text-sm text-muted-foreground">Last updated: February 7, 2026</p>

        <Card>
          <CardContent className="p-5 sm:p-8 space-y-6 text-sm leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-semibold">1. Agreement to Terms</h2>
              <p>
                By accessing or using FunnelFox ("the Service"), operated by MellowSites ("we", "us", or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
              </p>
              <p>
                The Service is available at funnelfox.org and any associated subdomains. By creating an account, you confirm that you are at least 18 years of age and have the legal capacity to enter into this agreement.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">2. Description of Service</h2>
              <p>
                FunnelFox is a lead generation and customer relationship management tool designed for web developers and digital service providers. The Service allows users to discover potential business clients, analyze their web presence, manage outreach through a sales pipeline, and send communications.
              </p>
              <p>
                We provide information about businesses gathered from publicly available sources. The accuracy, completeness, or reliability of this data is not guaranteed. Users are responsible for verifying information before taking action.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">3. User Accounts</h2>
              <p>
                To use the Service, you must create an account with a valid email address and password. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.
              </p>
              <p>
                You agree to provide accurate, current, and complete information during registration and to update your information as necessary. We reserve the right to suspend or terminate accounts that violate these Terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">4. Subscription Plans and Billing</h2>
              <p>
                FunnelFox offers a free tier and a paid Pro subscription plan. The Pro plan is billed monthly at the rate displayed on our pricing page (currently $30/month). All prices are in US dollars.
              </p>
              <p>
                Subscriptions automatically renew each billing cycle unless canceled. You may cancel your subscription at any time through the billing portal. Upon cancellation, you retain access to Pro features until the end of your current billing period. No partial refunds are provided for unused time within a billing cycle.
              </p>
              <p>
                We reserve the right to change subscription pricing with at least 30 days' notice. Price changes will take effect at the start of your next billing cycle after the notice period.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">5. Usage Limits</h2>
              <p>
                Each plan includes specific usage limits for leads and saved leads. Free plan users are limited to 25 leads per month and 25 saved leads. Pro plan users receive 300 leads per month and unlimited saved leads.
              </p>
              <p>
                Discovery counts reset on the first day of each calendar month. We reserve the right to modify usage limits with reasonable notice.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">6. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use the Service for any unlawful purpose or in violation of any applicable laws, including anti-spam laws (CAN-SPAM, GDPR, etc.)</li>
                <li>Send unsolicited bulk communications using data obtained through the Service</li>
                <li>Attempt to access, tamper with, or use non-public areas of the Service or its systems</li>
                <li>Scrape, harvest, or collect data from the Service through automated means beyond what the Service provides</li>
                <li>Impersonate another person or entity or misrepresent your affiliation</li>
                <li>Interfere with or disrupt the integrity or performance of the Service</li>
                <li>Share account credentials with third parties or create multiple free accounts to circumvent usage limits</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">7. Intellectual Property</h2>
              <p>
                The Service, including its design, features, code, and content (excluding user-generated data), is the property of MellowSites and is protected by copyright and other intellectual property laws.
              </p>
              <p>
                You retain ownership of any data, notes, and content you create within the Service. By using the Service, you grant us a limited license to process and store your data solely for the purpose of providing the Service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">8. Third-Party Services</h2>
              <p>
                The Service integrates with third-party services including Stripe for payment processing and Gmail for email communications. Your use of these integrations is subject to the respective terms of those services. We are not responsible for the actions or policies of third-party service providers.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">9. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p>
                We do not warrant that the Service will be uninterrupted, error-free, or secure, or that the business data provided will be accurate, complete, or current.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">10. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, MELLOWSITES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
              </p>
              <p>
                Our total liability for any claims arising from the Service shall not exceed the amount you paid us in the 12 months preceding the claim.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">11. Termination</h2>
              <p>
                We may suspend or terminate your account at our discretion if you violate these Terms. You may delete your account at any time by contacting us. Upon termination, your right to use the Service ceases immediately, and we may delete your data after a reasonable period.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">12. Changes to Terms</h2>
              <p>
                We may update these Terms from time to time. We will notify users of material changes via email or through the Service. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">13. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of Maryland, United States, without regard to conflict of law principles. Any disputes arising under these Terms shall be resolved in the courts of Maryland.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">14. Contact</h2>
              <p>
                For questions about these Terms, contact us at:
              </p>
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:contact@mellowsites.com" className="text-primary underline" data-testid="link-terms-email">
                  contact@mellowsites.com
                </a>
              </p>
              <p>
                <strong>Website:</strong>{" "}
                <a href="https://mellowsites.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  mellowsites.com
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
