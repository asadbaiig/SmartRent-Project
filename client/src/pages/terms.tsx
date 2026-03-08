import { StaticPageLayout } from "@/components/static-page-layout";

export default function TermsOfService() {
  return (
    <StaticPageLayout title="Terms of Service">
      <p>Last updated: 2025. By using SmartRent you agree to these terms.</p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Use of the platform</h2>
      <p>
        You must provide accurate information, use the platform only for lawful rental purposes, and comply with applicable laws. You are responsible for your account and any listings or contracts you create.
      </p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Contracts and payments</h2>
      <p>
        Rental agreements and payments are between landlords and tenants. SmartRent facilitates the process and provides tools (including smart contracts) but is not a party to your rental agreement.
      </p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Contact</h2>
      <p>
        Questions about these terms? Email{" "}
        <a href="mailto:support@smartrent.pk" className="text-primary-600 dark:text-primary-400 hover:underline">
          support@smartrent.pk
        </a>
        .
      </p>
    </StaticPageLayout>
  );
}
