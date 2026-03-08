import { StaticPageLayout } from "@/components/static-page-layout";

export default function TrustSafety() {
  return (
    <StaticPageLayout title="Trust & Safety">
      <p>
        SmartRent is committed to safe, transparent rentals. We verify identities, use smart contracts for agreements, and support secure payments.
      </p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Verification</h2>
      <p>
        Landlords and tenants can upload documents for verification. Verified accounts are marked on the platform to build trust.
      </p>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-2">Disputes</h2>
      <p>
        If you have an issue with a contract or payment, use the Disputes section from your dashboard. We aim to resolve issues fairly and quickly.
      </p>
    </StaticPageLayout>
  );
}
