import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Bot, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIPredictionResult {
  suggestedPrice: number;
  priceRangeMin: number;
  priceRangeMax: number;
  confidence: string;
  description: string;
  currency: string;
}

interface AIPricePredictorModalProps {
  onApplyFilters?: (filters: {
    city: string;
    propertyType: string;
    minRent: string;
    maxRent: string;
    bedrooms: string;
    bathrooms?: string;
    sqft?: string;
  }) => void;
}

export function AIPricePredictorModal({ onApplyFilters }: AIPricePredictorModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIPredictionResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    city: "",
    propertyType: "",
    bedrooms: "2",
    bathrooms: "1",
    sqft: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePredict = async () => {
    // Validation
    if (!formData.city || !formData.propertyType || !formData.sqft) {
      toast({
        title: "Missing Information",
        description: "Please fill in City, Property Type, and Square Feet",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/price-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: formData.city,
          propertyType: formData.propertyType,
          sqft: parseFloat(formData.sqft),
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get prediction");
      }

      const data = await response.json();
      setResult(data);
      setShowResult(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not get AI prediction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setShowResult(false);
    setResult(null);
    setFormData({
      city: "",
      propertyType: "",
      bedrooms: "2",
      bathrooms: "1",
      sqft: "",
    });
  };

  return (
    <>
      {/* Main Button - professional slate/indigo style */}
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium shadow-sm"
        size="lg"
        data-testid="button-ai-price-predictor"
      >
        <Bot className="h-4 w-4 mr-2 text-slate-600 dark:text-slate-400" />
        <span>AI Price Analyzer</span>
      </Button>

      {/* Modal Dialog */}
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) handleClose();
      }}>
        <DialogContent className="max-w-2xl border-slate-200 dark:border-slate-700 shadow-xl">
          {!showResult ? (
            <>
              {/* Input Form */}
              <DialogHeader className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Bot className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </span>
                  AI Price Analyzer
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
                  Enter property details for a data-driven monthly rent estimate.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-5">
                {/* City Selection */}
                <div>
                  <Label htmlFor="city" className="text-sm font-medium mb-2 block">
                    City *
                  </Label>
                  <Select value={formData.city} onValueChange={(value) => handleInputChange("city", value)}>
                    <SelectTrigger id="city">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Karachi">Karachi</SelectItem>
                      <SelectItem value="Lahore">Lahore</SelectItem>
                      <SelectItem value="Islamabad">Islamabad</SelectItem>
                      <SelectItem value="Faisalabad">Faisalabad</SelectItem>
                      <SelectItem value="Rawalpindi">Rawalpindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Type Selection */}
                <div>
                  <Label htmlFor="propertyType" className="text-sm font-medium mb-2 block">
                    Property Type *
                  </Label>
                  <Select value={formData.propertyType} onValueChange={(value) => handleInputChange("propertyType", value)}>
                    <SelectTrigger id="propertyType">
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="House">House</SelectItem>
                      <SelectItem value="Flat">Flat/Apartment</SelectItem>
                      <SelectItem value="Upper Portion">Upper Portion</SelectItem>
                      <SelectItem value="Lower Portion">Lower Portion</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                      <SelectItem value="Room">Room</SelectItem>
                      <SelectItem value="Farm House">Farm House</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Square Feet */}
                <div>
                  <Label htmlFor="sqft" className="text-sm font-medium mb-2 block">
                    Area (Square Feet) *
                  </Label>
                  <Input
                    id="sqft"
                    type="number"
                    placeholder="e.g., 1200"
                    value={formData.sqft}
                    onChange={(e) => handleInputChange("sqft", e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Bedrooms and Bathrooms Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bedrooms" className="text-sm font-medium mb-2 block">
                      Bedrooms
                    </Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      placeholder="2"
                      value={formData.bedrooms}
                      onChange={(e) => handleInputChange("bedrooms", e.target.value)}
                      min="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms" className="text-sm font-medium mb-2 block">
                      Bathrooms
                    </Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      placeholder="1"
                      value={formData.bathrooms}
                      onChange={(e) => handleInputChange("bathrooms", e.target.value)}
                      min="0"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Required Fields Notice */}
                <Alert className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <AlertCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <AlertDescription className="text-slate-600 dark:text-slate-400 text-sm">
                    City, Property Type, and Square Feet are required for accurate predictions.
                  </AlertDescription>
                </Alert>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="border-slate-300 dark:border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePredict}
                  disabled={loading}
                  className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Get Price Estimate
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Result Display */}
              <DialogHeader className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  Price Estimate
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
                  {result?.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-5">
                {/* Main Price Display */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 text-center">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Suggested Monthly Rent
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    ₨{result?.suggestedPrice.toLocaleString()}
                  </p>
                </div>

                {/* Price Range */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Recommended Range</p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium mb-1">Min</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        ₨{result?.priceRangeMin.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium mb-1">Max</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        ₨{result?.priceRangeMax.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-emerald-500 dark:bg-emerald-600 rounded-full"
                        style={{
                          left: "0%",
                          width: `${((result?.suggestedPrice || 0) - (result?.priceRangeMin || 0)) / Math.max((result?.priceRangeMax || 1) - (result?.priceRangeMin || 0), 1) * 100}%`
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-200 border-2 border-emerald-600 rounded-full shadow"
                        style={{
                          left: `${((result?.suggestedPrice || 0) - (result?.priceRangeMin || 0)) / Math.max((result?.priceRangeMax || 1) - (result?.priceRangeMin || 0), 1) * 100}%`,
                          transform: "translate(-50%, -50%)"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Confidence */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <Bot className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      Confidence: <span className="font-semibold text-slate-900 dark:text-white">{result?.confidence}</span>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                      {result?.confidence === "High" && "Based on complete property information"}
                      {result?.confidence === "Medium" && "Based on partial property information"}
                      {result?.confidence === "Low" && "Limited information provided"}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    onClick={() => setShowResult(false)}
                    className="border-slate-300 dark:border-slate-600"
                  >
                    Modify inputs
                  </Button>
                  {onApplyFilters && (
                    <Button
                      onClick={() => {
                        onApplyFilters({
                          city: formData.city,
                          propertyType: formData.propertyType,
                          minRent: Math.floor(result?.priceRangeMin || 0).toString(),
                          maxRent: Math.ceil(result?.priceRangeMax || 0).toString(),
                          bedrooms: formData.bedrooms,
                          bathrooms: formData.bathrooms,
                          sqft: formData.sqft,
                        });
                        handleClose();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white"
                    >
                      View matching properties
                    </Button>
                  )}
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="border-slate-300 dark:border-slate-600"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
