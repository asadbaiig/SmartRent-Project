import { StaticPageLayout } from "@/components/static-page-layout";

export default function CookiePolicy() {
  return (
    <StaticPageLayout title="Cookie Policy">
      <p>Last updated: 2025. This page explains how SmartRent uses cookies and similar technologies.</p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">What we use</h2>
      <p>
        We use essential cookies to keep you signed in and to remember your preferences. We may use analytics cookies to understand how the site is used and improve it.
      </p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Your choices</h2>
      <p>
        You can control or delete cookies through your browser settings. Disabling essential cookies may affect your ability to use some features.
      </p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Contact</h2>
      <p>
        For questions about cookies, contact{" "}
        <a href="mailto:support@smartrent.pk" className="text-primary-600 dark:text-primary-400 hover:underline">
          support@smartrent.pk
        </a>
        .
      </p>
    </StaticPageLayout>
  );
}
