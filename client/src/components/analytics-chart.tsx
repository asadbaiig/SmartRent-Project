import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const createEmptyData = () => {
  const now = new Date();

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return {
      month: date.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
      properties: 0,
      contracts: 0,
      visitors: 0,
      payments: 0,
      savedProperties: 0,
    };
  });
};

const emptyChartData = createEmptyData();

type AnalyticsPoint = {
  month: string;
  revenue: number;
  properties: number;
  contracts: number;
  visitors: number;
  payments: number;
  savedProperties: number;
};

const fetchAnalyticsData = async (): Promise<AnalyticsPoint[]> => {
  const token = localStorage.getItem("token");
  const response = await fetch("/api/dashboard/analytics", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to fetch analytics");
  return response.json();
};

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  properties: {
    label: "Properties",
    color: "hsl(var(--chart-2))",
  },
  contracts: {
    label: "Contracts",
    color: "hsl(var(--chart-3))",
  },
  visitors: {
    label: "Visitors",
    color: "hsl(var(--chart-4))",
  },
  payments: {
    label: "Payment History",
    color: "hsl(var(--chart-3))",
  },
  savedProperties: {
    label: "Saved Properties",
    color: "hsl(var(--chart-5))",
  },
};

type ChartType = "revenue" | "properties" | "contracts" | "visitors" | "payments" | "savedProperties";

interface AnalyticsChartProps {
  type?: ChartType;
  chartStyle?: "line" | "area" | "bar";
}

export function AnalyticsChart({ 
  type = "revenue", 
  chartStyle = "area" 
}: AnalyticsChartProps) {
  const { data: analyticsData } = useQuery({
    queryKey: ["/api/dashboard/analytics"],
    queryFn: fetchAnalyticsData,
  });
  const [isVisible, setIsVisible] = useState(false);
  const data = analyticsData?.length ? analyticsData : emptyChartData;

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const formatValue = (value: number) => {
    if (type === "revenue" || type === "payments") {
      return `₨${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  const renderChart = () => {
    const config = chartConfig[type];
    
    if (chartStyle === "line") {
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            className="text-xs"
            tick={{ fill: "currentColor" }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: "currentColor" }}
            tickFormatter={formatValue}
          />
          <ChartTooltip 
            content={<ChartTooltipContent />}
            formatter={(value: number) => formatValue(value)}
          />
          <Line
            type="monotone"
            dataKey={type}
            stroke={config.color}
            strokeWidth={3}
            dot={{ fill: config.color, r: 4 }}
            activeDot={{ r: 6 }}
            animationDuration={1500}
            animationBegin={0}
          />
        </LineChart>
      );
    }

    if (chartStyle === "bar") {
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            className="text-xs"
            tick={{ fill: "currentColor" }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: "currentColor" }}
            tickFormatter={formatValue}
          />
          <ChartTooltip 
            content={<ChartTooltipContent />}
            formatter={(value: number) => formatValue(value)}
          />
          <Bar
            dataKey={type}
            fill={config.color}
            radius={[8, 8, 0, 0]}
            animationDuration={1500}
            animationBegin={0}
          />
        </BarChart>
      );
    }

    // Default: Area chart
    return (
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
            <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="month" 
          className="text-xs"
          tick={{ fill: "currentColor" }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: "currentColor" }}
          tickFormatter={formatValue}
        />
        <ChartTooltip 
          content={<ChartTooltipContent />}
          formatter={(value: number) => formatValue(value)}
        />
        <Area
          type="monotone"
          dataKey={type}
          stroke={config.color}
          strokeWidth={3}
          fill={`url(#gradient-${type})`}
          animationDuration={1500}
          animationBegin={0}
        />
      </AreaChart>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{chartConfig[type].label} Analytics</span>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <span className="text-sm font-normal text-muted-foreground">
                Last 12 Months
              </span>
            </motion.div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="w-full h-[300px]">
            <ChartContainer 
              config={chartConfig} 
              className="h-full w-full [&>div]:!aspect-auto"
            >
              {renderChart()}
            </ChartContainer>
          </div>
          {/* Chart Description */}
          <div className="mt-4 text-sm text-muted-foreground">
            {type === "revenue" && (
              <p>Monthly revenue trends showing income flow and peak earning periods.</p>
            )}
            {type === "properties" && (
              <p>Number of properties listed each month for inventory tracking.</p>
            )}
            {type === "contracts" && (
              <p>Number of contracts signed each month to track business growth.</p>
            )}
            {type === "visitors" && (
              <p>Website visitor traffic over the past 12 months.</p>
            )}
            {type === "payments" && (
              <p>Monthly rent payment history tracking your rental expenses over time.</p>
            )}
            {type === "savedProperties" && (
              <p>Number of properties saved to favorites each month for easy access.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Multi-metric chart component
export function MultiMetricChart() {
  const { data: analyticsData } = useQuery({
    queryKey: ["/api/dashboard/analytics"],
    queryFn: fetchAnalyticsData,
  });
  const data = analyticsData?.length ? analyticsData : emptyChartData;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <AreaChart data={data}>
                <defs>
                  <linearGradient id="gradient-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="gradient-properties" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="gradient-contracts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: "currentColor" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="1"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#gradient-revenue)"
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="properties"
                  stackId="2"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#gradient-properties)"
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="contracts"
                  stackId="3"
                  stroke="hsl(var(--chart-3))"
                  fill="url(#gradient-contracts)"
                  animationDuration={1500}
                />
              </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
