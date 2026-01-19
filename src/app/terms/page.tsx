import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - OpenTrainer",
  description: "Terms of Service for OpenTrainer workout tracking application",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">OpenTrainer</span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="prose prose-neutral dark:prose-invert mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: January 19, 2026</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using OpenTrainer (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            OpenTrainer is a workout tracking application that allows users to log exercises, track progress,
            and receive AI-powered training insights. The Service includes both free and premium features.
          </p>

          <h2>3. User Accounts</h2>
          <h3>3.1 Registration</h3>
          <p>
            To use certain features, you must create an account. You agree to provide accurate, current, and
            complete information during registration and to update such information to keep it accurate.
          </p>

          <h3>3.2 Account Security</h3>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all
            activities that occur under your account. Please notify us immediately of any unauthorized use.
          </p>

          <h3>3.3 Account Termination</h3>
          <p>
            You may delete your account at any time through the Profile settings. We reserve the right to
            suspend or terminate accounts that violate these terms.
          </p>

          <h2>4. User Content</h2>
          <h3>4.1 Your Data</h3>
          <p>
            You retain ownership of all workout data, notes, and other content you create in OpenTrainer.
            By using the Service, you grant us a license to store, process, and display your content as
            necessary to provide the Service.
          </p>

          <h3>4.2 Data Export</h3>
          <p>
            You may export your workout data at any time in JSON format. We believe in data portability and
            will not hold your data hostage.
          </p>

          <h2>5. AI Features</h2>
          <h3>5.1 AI-Generated Content</h3>
          <p>
            Our AI features (Training Lab, Smart Swap, Routine Generation) provide suggestions based on your
            data. These are recommendations only and should not replace professional medical or fitness advice.
          </p>

          <h3>5.2 Limitations</h3>
          <p>
            AI-generated content may occasionally contain errors or inappropriate suggestions. Always use your
            own judgment and consult a healthcare provider before starting any new exercise program.
          </p>

          <h2>6. Health Disclaimer</h2>
          <p>
            <strong>OpenTrainer is not a medical service.</strong> The Service is intended for informational
            and tracking purposes only. We do not provide medical advice, diagnosis, or treatment.
          </p>
          <p>
            Before beginning any exercise program, consult with a qualified healthcare provider. If you
            experience pain, dizziness, or discomfort during exercise, stop immediately and seek medical attention.
          </p>

          <h2>7. Subscription and Payments</h2>
          <h3>7.1 Alpha Period</h3>
          <p>
            During our alpha period, all Pro features are available for free. This may change in the future,
            and we will provide notice before implementing any paid features.
          </p>

          <h3>7.2 Future Pricing</h3>
          <p>
            When we introduce paid subscriptions, pricing and billing terms will be clearly communicated.
            Alpha users may receive special pricing or grandfathered features.
          </p>

          <h2>8. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to the Service or its systems</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Upload malicious code or content</li>
            <li>Abuse our AI features or attempt to manipulate them</li>
            <li>Share your account credentials with others</li>
            <li>Scrape or harvest data from the Service</li>
          </ul>

          <h2>9. Intellectual Property</h2>
          <p>
            The OpenTrainer name, logo, and application design are our intellectual property. You may not
            copy, modify, or distribute our branding or code without permission.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, OpenTrainer and its affiliates shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages arising from your use of
            the Service.
          </p>
          <p>
            <strong>Exercise at your own risk.</strong> We are not responsible for any injuries or health
            issues that may result from following workout suggestions or using the Service.
          </p>

          <h2>11. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind, either express or implied. We do
            not guarantee that the Service will be uninterrupted, error-free, or completely secure.
          </p>

          <h2>12. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. We will notify users of material changes via email or
            in-app notification. Continued use of the Service after changes constitutes acceptance of the
            new terms.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the United States,
            without regard to conflict of law principles.
          </p>

          <h2>14. Contact</h2>
          <p>
            For questions about these Terms, please contact us at:{" "}
            <a href="mailto:support@opentrainer.app">support@opentrainer.app</a>
          </p>
        </article>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-8">
          <p className="text-sm text-muted-foreground">
            &copy; 2025 OpenTrainer
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground font-medium text-foreground">
              Terms
            </Link>
            <Link href="mailto:support@opentrainer.app" className="hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
