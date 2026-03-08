import { StaticPageLayout } from "@/components/static-page-layout";

export default function HelpCenter() {
  return (
    <StaticPageLayout title="Help Center">
      <p>
        Find answers to common questions about listing properties, signing contracts, making payments, and using SmartRent.
      </p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Getting started</h2>
      <p>
        Create an account, verify your identity, and then you can list a property (landlords) or search and apply for rentals (tenants).
        Use the dashboard to manage contracts, payments, and documents.
      </p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Need more help?</h2>
      <p>
        <a href="mailto:support@smartrent.pk" className="text-primary-600 dark:text-primary-400 hover:underline">
          Contact us
        </a>{" "}
        at support@smartrent.pk or call +92 336 5547781.
      </p>
    </StaticPageLayout>
  );
}
