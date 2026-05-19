import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Home, Upload, X, MapPin, DollarSign, Building, Bot, ImageIcon, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "commercial", label: "Commercial" },
  { value: "office", label: "Office" },
];

const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
  "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala"
];

const COMMON_AMENITIES = [
  "WiFi", "Parking", "Security", "Generator", "Elevator",
  "Garden", "Gym", "Pool", "AC", "Heating"
];

export default function ListProperty() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    area: "",
    propertyType: "",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    monthlyRent: "",
    securityDeposit: "",
    amenities: [] as string[],
    latitude: "",
    longitude: "",
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + images.length > 10) {
      toast({
        title: "Too many images",
        description: "You can upload a maximum of 10 images",
        variant: "destructive",
      });
      return;
    }

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const getAiPriceSuggestion = async () => {
    if (!formData.city || !formData.propertyType || !formData.sqft) {
      toast({
        title: "Missing Information",
        description: "Please fill in City, Property Type, and Square Feet for AI price suggestion",
        variant: "destructive",
      });
      return;
    }

    setAiLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/price-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          city: formData.city,
          propertyType: formData.propertyType,
          sqft: parseFloat(formData.sqft),
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI suggestion');
      
      const data = await response.json();
      updateField('monthlyRent', data.suggestedPrice.toString());
      
      toast({
        title: "AI Suggestion Applied",
        description: `Suggested monthly rent: ₨${data.suggestedPrice.toLocaleString()}`,
      });
    } catch (error: any) {
      toast({
        title: "AI Suggestion Failed",
        description: error.message || "Could not get price suggestion",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to list a property",
        variant: "destructive",
      });
      return;
    }

    if (user.role !== 'landlord' && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only landlords can list properties",
        variant: "destructive",
      });
      return;
    }

    if (images.length === 0) {
      toast({
        title: "Images Required",
        description: "Please upload at least one image of the property",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Upload images first
      const imageUrls: string[] = [];
      for (const image of images) {
        const imageFormData = new FormData();
        imageFormData.append('file', image);
        imageFormData.append('type', 'property_image');

        const uploadResponse = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: imageFormData,
        });

        if (!uploadResponse.ok) throw new Error('Failed to upload image');
        
        const uploadData = await uploadResponse.json();
        imageUrls.push(uploadData.url);
      }

      // Create property with images
      const propertyData = {
        title: formData.title,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        area: formData.area,
        propertyType: formData.propertyType,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        sqft: formData.sqft ? parseInt(formData.sqft) : null,
        monthlyRent: formData.monthlyRent,
        securityDeposit: formData.securityDeposit || null,
        amenities: formData.amenities,
        images: imageUrls,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(propertyData),
      });

      if (!response.ok) throw new Error('Failed to create property');
      
      const property = await response.json();

      toast({
        title: "Property submitted for review",
        description: "An admin will approve it before it appears publicly.",
      });

      setLocation('/dashboard');
    } catch (error: any) {
      toast({
        title: "Failed to List Property",
        description: error.message || "An error occurred while listing the property",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'landlord' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only landlords can list properties</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full mb-4">
            <Home className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            List Your Property
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Fill in the details below to list your property on SmartRent
          </p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Building className="h-5 w-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Basic Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label htmlFor="title">Property Title *</Label>
                    <Input
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="e.g., Modern 3 Bedroom Apartment in DHA"
                      className="mt-1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Describe your property, its features, and nearby amenities..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Property Type *</Label>
                    <Select value={formData.propertyType} onValueChange={(value) => updateField('propertyType', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>City *</Label>
                    <Select value={formData.city} onValueChange={(value) => updateField('city', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {CITIES.map(city => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="area">Area/Neighborhood *</Label>
                    <Input
                      id="area"
                      required
                      value={formData.area}
                      onChange={(e) => updateField('area', e.target.value)}
                      placeholder="e.g., DHA Phase 5"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Full Address *</Label>
                    <Input
                      id="address"
                      required
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      placeholder="Street address"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Home className="h-5 w-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Property Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      min="0"
                      value={formData.bedrooms}
                      onChange={(e) => updateField('bedrooms', e.target.value)}
                      placeholder="e.g., 3"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      min="0"
                      value={formData.bathrooms}
                      onChange={(e) => updateField('bathrooms', e.target.value)}
                      placeholder="e.g., 2"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sqft">Square Feet</Label>
                    <Input
                      id="sqft"
                      type="number"
                      min="0"
                      value={formData.sqft}
                      onChange={(e) => updateField('sqft', e.target.value)}
                      placeholder="e.g., 1200"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <DollarSign className="h-5 w-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Pricing
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="monthlyRent">Monthly Rent (PKR) *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={getAiPriceSuggestion}
                        disabled={aiLoading}
                        className="h-7 text-xs"
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Getting...
                          </>
                        ) : (
                          <>
                            <Bot className="h-3 w-3 mr-1" />
                            AI Suggest
                          </>
                        )}
                      </Button>
                    </div>
                    <Input
                      id="monthlyRent"
                      required
                      type="number"
                      min="0"
                      value={formData.monthlyRent}
                      onChange={(e) => updateField('monthlyRent', e.target.value)}
                      placeholder="e.g., 50000"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="securityDeposit">Security Deposit (PKR)</Label>
                    <Input
                      id="securityDeposit"
                      type="number"
                      min="0"
                      value={formData.securityDeposit}
                      onChange={(e) => updateField('securityDeposit', e.target.value)}
                      placeholder="e.g., 100000"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Home className="h-5 w-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Amenities
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {COMMON_AMENITIES.map(amenity => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={`amenity-${amenity}`}
                        checked={formData.amenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <Label
                        htmlFor={`amenity-${amenity}`}
                        className="text-sm cursor-pointer"
                      >
                        {amenity}
                      </Label>
                    </div>
                  ))}
                </div>

                {formData.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {formData.amenities.map(amenity => (
                      <Badge key={amenity} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Coordinates (Optional) */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Location Coordinates (Optional)
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => updateField('latitude', e.target.value)}
                      placeholder="e.g., 24.8607"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => updateField('longitude', e.target.value)}
                      placeholder="e.g., 67.0011"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <ImageIcon className="h-5 w-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Property Images * (Max 10)
                  </h2>
                </div>

                <div>
                  <Label htmlFor="images" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, JPEG up to 5MB each
                      </p>
                    </div>
                    <Input
                      id="images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </Label>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="min-w-[150px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Listing Property...
                    </>
                  ) : (
                    <>
                      <Home className="mr-2 h-4 w-4" />
                      List Property
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
