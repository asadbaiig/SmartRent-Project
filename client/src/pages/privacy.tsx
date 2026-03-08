import { StaticPageLayout } from "@/components/static-page-layout";

export default function PrivacyPolicy() {
  return (
    <StaticPageLayout title="Privacy Policy">
      <p>Last updated: 2025. SmartRent respects your privacy and protects your personal data.</p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Information we collect</h2>
      <p>
        We collect information you provide when registering (name, email, phone), property details when you list, and usage data to improve the platform.
      </p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">How we use it</h2>
      <p>
        Your data is used to run the rental platform, process contracts and payments, verify identities, and communicate with you. We do not sell your data to third parties.
      </p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Contact</h2>
      <p>
        For privacy requests or questions, contact us at{" "}
        <a href="mailto:support@smartrent.pk" className="text-primary-600 dark:text-primary-400 hover:underline">
          support@smartrent.pk
        </a>
        .
      </p>
    </StaticPageLayout>
  );
}
