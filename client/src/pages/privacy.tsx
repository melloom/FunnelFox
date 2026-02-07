import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-privacy">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-privacy-title">Privacy Policy</h1>
        </div>

        <p className="text-sm text-muted-foreground">Last updated: February 7, 2026</p>

        <Card>
          <CardContent className="p-5 sm:p-8 space-y-6 text-sm leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-semibold">1. Introduction</h2>
              <p>
                MellowSites ("we", "us", or "our") operates FunnelFox, accessible at funnelfox.org. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our Service.
              </p>
              <p>
                By using FunnelFox, you agree to the collection and use of information as described in this policy.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">2. Information We Collect</h2>

              <h3 className="text-sm font-medium mt-3">2.1 Information You Provide</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account information:</strong> Email address, first name, last name, and password when you register</li>
                <li><strong>Billing information:</strong> Payment details processed through Stripe (we do not store credit card numbers directly)</li>
                <li><strong>Lead data:</strong> Business information, notes, and communications you create within the Service</li>
                <li><strong>Communications:</strong> Emails you send through the Gmail integration</li>
              </ul>

              <h3 className="text-sm font-medium mt-3">2.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Usage data:</strong> Pages visited, features used, discovery searches performed, and actions taken</li>
                <li><strong>Session data:</strong> Session identifiers for authentication purposes</li>
                <li><strong>Device information:</strong> Browser type, operating system, and screen resolution</li>
              </ul>

              <h3 className="text-sm font-medium mt-3">2.3 Information from Third Parties</h3>
              <p>
                We gather publicly available business information from sources including search engines, public directories, and business listings to provide the lead discovery feature. This data is publicly available and not collected from individuals' private accounts.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">3. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process payments and manage your subscription</li>
                <li>Authenticate your identity and secure your account</li>
                <li>Send transactional communications (account confirmations, billing notifications)</li>
                <li>Monitor usage to enforce plan limits and prevent abuse</li>
                <li>Analyze usage patterns to improve the Service</li>
                <li>Respond to support inquiries</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">4. Data Sharing and Disclosure</h2>
              <p>We do not sell your personal information. We may share information with:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Stripe:</strong> For payment processing. Stripe's privacy policy applies to payment data.</li>
                <li><strong>Google (Gmail):</strong> If you connect your Gmail account for email outreach. Google's privacy policy applies.</li>
                <li><strong>Hosting providers:</strong> Our infrastructure providers who process data on our behalf under data processing agreements.</li>
                <li><strong>Legal compliance:</strong> When required by law, court order, or governmental authority.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">5. Cookies and Tracking</h2>
              <p>
                FunnelFox uses the following types of cookies and similar technologies:
              </p>

              <h3 className="text-sm font-medium mt-3">5.1 Essential Cookies</h3>
              <p>
                These cookies are necessary for the Service to function. They include session cookies that keep you logged in and CSRF protection tokens. Without these cookies, the Service cannot operate properly. These cannot be disabled.
              </p>

              <h3 className="text-sm font-medium mt-3">5.2 Functional Cookies</h3>
              <p>
                We use functional cookies to remember your preferences, such as your selected theme (dark/light mode) and sidebar state. These improve your experience but are not strictly required.
              </p>

              <h3 className="text-sm font-medium mt-3">5.3 Third-Party Cookies</h3>
              <p>
                Stripe may set cookies for fraud prevention and payment processing purposes. These cookies are governed by Stripe's cookie policy.
              </p>

              <h3 className="text-sm font-medium mt-3">5.4 Managing Cookies</h3>
              <p>
                You can control cookies through your browser settings. Blocking essential cookies may prevent you from using the Service. Most browsers allow you to refuse or delete cookies, but doing so may affect functionality.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">6. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your data, including:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Passwords are hashed using bcrypt before storage</li>
                <li>All connections use HTTPS/TLS encryption</li>
                <li>Database access is restricted and encrypted</li>
                <li>Payment information is processed by Stripe (PCI DSS compliant) and never stored on our servers</li>
              </ul>
              <p>
                While we take reasonable precautions, no method of transmission or storage is 100% secure. We cannot guarantee absolute security of your data.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">7. Data Retention</h2>
              <p>
                We retain your account information and lead data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes (such as fraud prevention and billing records).
              </p>
              <p>
                Usage logs and aggregated analytics data may be retained in anonymized form for service improvement purposes.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">8. Your Rights</h2>
              <p>Depending on your jurisdiction, you may have the right to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate personal data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Data portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Objection:</strong> Object to our processing of your personal data</li>
                <li><strong>Restrict processing:</strong> Request restriction of processing in certain circumstances</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:contact@mellowsites.com" className="text-primary underline">
                  contact@mellowsites.com
                </a>
                . We will respond to requests within 30 days.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">9. Children's Privacy</h2>
              <p>
                The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we learn that we have collected data from a child, we will delete it promptly.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">10. International Data Transfers</h2>
              <p>
                Your data may be processed and stored in the United States. By using the Service, you consent to the transfer of your data to the United States, where data protection laws may differ from those in your jurisdiction.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify users of material changes via email or through the Service. The "Last updated" date at the top of this policy will reflect the most recent revision.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold">12. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or how we handle your data, contact us at:
              </p>
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:contact@mellowsites.com" className="text-primary underline" data-testid="link-privacy-email">
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
