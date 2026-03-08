import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, MapPin, ArrowUpRight, HelpCircle } from "lucide-react";
import { Link } from "wouter";

export interface AreaStats {
  count: number;
  mean_rent: number;
  median_rent: number;
  min_rent: number;
  max_rent: number;
  currency: string;
  top_areas: { area: string; count: number; mean_rent: number }[];
  message: string | null;
}

interface MarketInsightsProps {
  city?: string;
  propertyType?: string;
  bedrooms?: string;
  className?: string;
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `₨${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₨${(n / 1_000).toFixed(0)}k`;
  return `₨${n.toLocaleString()}`;
}

function formatPropertyType(type: string): string {
  if (!type) return "rentals";
  const t = type.trim().toLowerCase();
  if (t === "apartment" || t === "flat") return "apartments";
  if (t === "house") return "houses";
  if (t === "commercial") return "commercial";
  if (t === "office") return "offices";
  return type;
}

export function MarketInsights({ city, propertyType, bedrooms, className = "" }: MarketInsightsProps) {
  const params = new URLSearchParams();
  if (city?.trim()) params.set("city", city.trim());
  if (propertyType?.trim()) params.set("propertyType", propertyType.trim());
  if (bedrooms?.trim()) params.set("bedrooms", bedrooms.trim());

  const { data, isLoading, error } = useQuery<AreaStats>({
    queryKey: ["/api/ai/area-stats", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/ai/area-stats?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load market insights");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2 pt-5 px-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-48 mt-1.5" />
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5">
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  if (data.count === 0 && data.message) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <BarChart3 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
            Market insights
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{data.message}</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
                <BarChart3 className="h-3.5 w-3.5" />
              </div>
              What's available in this area?
            </CardTitle>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Real prices from {data.count.toLocaleString()} listings
              {city?.trim() ? ` in ${city.trim()}` : " across all cities"}
            </p>
          </div>
          <Link
            href="/properties"
            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 shrink-0"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-5">
        {/* Price stats grid — simplified for users */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/60 px-3 py-3">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Average Price</p>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {formatPrice(data.mean_rent)}
            </p>
            <p className="text-[11px] text-blue-600 dark:text-blue-300 mt-1">typical rental rate</p>
          </div>
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 px-3 py-3">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Cheapest</p>
            <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
              {formatPrice(data.min_rent)}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-300 mt-1">lowest available</p>
          </div>
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/60 px-3 py-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Most Expensive</p>
            <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
              {formatPrice(data.max_rent)}
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-300 mt-1">highest available</p>
          </div>
        </div>

        {/* Quick insight */}
        <div className="flex items-start gap-2 rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/50 px-3 py-2.5">
          <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-900 dark:text-indigo-100">
            Prices here range from{" "}
            <span className="font-semibold">
              {formatPrice(data.min_rent)}
            </span>{" "}
            to{" "}
            <span className="font-semibold">
              {formatPrice(data.max_rent)}
            </span>
            . Most properties are around{" "}
            <span className="font-semibold">
              {formatPrice(data.mean_rent)}
            </span>
            .
          </p>
        </div>

        {/* Popular neighborhoods */}
        {data.top_areas && data.top_areas.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              Popular neighborhoods
            </p>
            <ul className="space-y-2">
              {data.top_areas.slice(0, 5).map((a, i) => (
                <li
                  key={a.area}
                  className="flex items-center justify-between gap-2 py-2 px-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate text-sm">{a.area}</span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {formatPrice(a.mean_rent)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {a.count} listings
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
