import { ReactNode } from "react";
import { Link } from "wouter";

interface StaticPageLayoutProps {
  title: string;
  children: ReactNode;
}

export function StaticPageLayout({ title, children }: StaticPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">{title}</h1>
        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-sm leading-relaxed space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
