import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Cloud } from "lucide-react";
import { WeatherWidget } from "@/components/weather-widget";

interface DashboardWeatherSheetProps {
  /** For landlord: city from first property */
  city?: string;
  /** For landlord: first property id; for tenant: active contract property id */
  propertyId?: string;
  /** Trigger label */
  triggerLabel?: string;
}

export function DashboardWeatherSheet({
  city,
  propertyId,
  triggerLabel = "Local weather",
}: DashboardWeatherSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Cloud className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Weather at your property</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <WeatherWidget city={city} propertyId={propertyId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
