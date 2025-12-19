import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, CloudSun, Droplets, Wind, Thermometer } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface WeatherWidgetProps {
  city?: string;
  propertyId?: string;
}

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  description: string;
}

// Map weather conditions to icons
const getWeatherIcon = (condition: string) => {
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return CloudRain;
  } else if (lowerCondition.includes('cloud')) {
    return CloudSun;
  } else if (lowerCondition.includes('clear') || lowerCondition.includes('sun')) {
    return Sun;
  } else {
    return Cloud;
  }
};

// Get weather advice for maintenance
const getMaintenanceAdvice = (condition: string, temperature: number): string => {
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('rain')) {
    return "Good time for indoor maintenance. Check for leaks and water damage.";
  } else if (temperature > 35) {
    return "Hot weather - check AC units and ensure proper ventilation.";
  } else if (temperature < 10) {
    return "Cold weather - check heating systems and prevent pipe freezing.";
  } else if (lowerCondition.includes('clear') || lowerCondition.includes('sun')) {
    return "Perfect weather for outdoor maintenance and inspections.";
  } else {
    return "Moderate conditions suitable for most maintenance tasks.";
  }
};

export function WeatherWidget({ city, propertyId }: WeatherWidgetProps) {
  const { user } = useAuth();

  // Fetch property location if propertyId is provided
  const { data: property } = useQuery({
    queryKey: ['/api/properties', propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/properties/${propertyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Determine city from property or prop
  const locationCity = city || property?.city || 'Karachi';

  // Fetch weather data
  const { data: weather, isLoading } = useQuery({
    queryKey: ['weather', locationCity],
    queryFn: async (): Promise<WeatherData> => {
      // Using OpenWeatherMap API (free tier)
      // Note: You'll need to add OPENWEATHER_API_KEY to your .env file
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY || 'demo';
      
      // For demo purposes, we'll use a mock API or you can set up OpenWeatherMap
      // Replace this with actual API call when you have an API key
      if (apiKey === 'demo') {
        // Mock weather data for demo
        return {
          temperature: 28,
          condition: 'Partly Cloudy',
          humidity: 65,
          windSpeed: 12,
          icon: 'partly-cloudy',
          description: 'Partly cloudy with light breeze'
        };
      }

      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locationCity)},PK&units=metric&appid=${apiKey}`
        );
        
        if (!response.ok) {
          throw new Error('Weather data unavailable');
        }
        
        const data = await response.json();
        return {
          temperature: Math.round(data.main.temp),
          condition: data.weather[0].main,
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind?.speed * 3.6 || 0), // Convert m/s to km/h
          icon: data.weather[0].icon,
          description: data.weather[0].description
        };
      } catch (error) {
        // Fallback to mock data on error
        return {
          temperature: 28,
          condition: 'Partly Cloudy',
          humidity: 65,
          windSpeed: 12,
          icon: 'partly-cloudy',
          description: 'Weather data unavailable'
        };
      }
    },
    enabled: !!locationCity,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 300000, // Consider data fresh for 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Weather</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return null;
  }

  const WeatherIcon = getWeatherIcon(weather.condition);
  const advice = getMaintenanceAdvice(weather.condition, weather.temperature);

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Weather - {locationCity}</span>
          <WeatherIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Weather Info */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {weather.temperature}°C
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300 capitalize">
              {weather.description}
            </div>
          </div>
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
            <WeatherIcon className="h-8 w-8 text-blue-600 dark:text-blue-300" />
          </div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-2">
            <Droplets className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            <div>
              <div className="text-xs text-blue-600 dark:text-blue-300">Humidity</div>
              <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {weather.humidity}%
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Wind className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            <div>
              <div className="text-xs text-blue-600 dark:text-blue-300">Wind</div>
              <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {weather.windSpeed} km/h
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Advice */}
        <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
          <div className="flex items-start space-x-2">
            <Thermometer className="h-4 w-4 text-blue-600 dark:text-blue-300 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                Maintenance Tip
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                {advice}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

