import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Gavel, 
  Plus, 
  Search, 
  Filter,
  MessageSquare,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Building2,
  FileCheck,
  Send,
  ChevronDown
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'awaiting_response': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'closed': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'open': return <AlertCircle className="h-4 w-4" />;
    case 'in_progress': return <Clock className="h-4 w-4" />;
    case 'awaiting_response': return <Clock className="h-4 w-4" />;
    case 'resolved': return <CheckCircle className="h-4 w-4" />;
    case 'closed': return <CheckCircle className="h-4 w-4" />;
    case 'rejected': return <X className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

export default function Disputes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [isNewDisputeOpen, setIsNewDisputeOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [messageAttachments, setMessageAttachments] = useState<File[]>([]);

  // Fetch disputes
  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['/api/disputes', statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append('status', statusFilter);
      }
      const response = await fetch(`/api/disputes?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch disputes');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch selected dispute details
  const { data: disputeDetails } = useQuery({
    queryKey: ['/api/disputes', selectedDispute],
    queryFn: async () => {
      if (!selectedDispute) return null;
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/disputes/${selectedDispute}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch dispute');
      return response.json();
    },
    enabled: !!selectedDispute && !!user,
    refetchInterval: 5000, // Poll for new messages
  });

  // Fetch contracts for new dispute form
  const { data: contracts = [] } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/contracts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user && isNewDisputeOpen,
  });

  // Filtered and sorted disputes
  const filteredDisputes = disputes
    .filter((dispute: any) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          dispute.id.toLowerCase().includes(query) ||
          dispute.title.toLowerCase().includes(query) ||
          (dispute.contractId && dispute.contractId.toLowerCase().includes(query))
        );
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "latest") {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      } else {
        return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
      }
    });

  // Create dispute mutation
  const createDisputeMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Add text fields
      Object.keys(data).forEach(key => {
        if (key !== 'evidenceFiles') {
          formData.append(key, data[key]);
        }
      });

      // Add evidence files
      if (data.evidenceFiles) {
        for (const file of data.evidenceFiles) {
          formData.append('files', file);
        }
      }

      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create dispute');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Dispute Created",
        description: `Your dispute (ID: ${data.id.substring(0, 8)}...) has been submitted successfully. An admin will review it within 48 hours.`,
      });
      setIsNewDisputeOpen(false);
      setSelectedDispute(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/disputes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create dispute",
        variant: "destructive",
      });
    },
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async ({ disputeId, message, files }: { disputeId: string; message: string; files: File[] }) => {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('message', message);
      files.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await fetch(`/api/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      setMessageAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['/api/disputes', selectedDispute] });
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Update dispute mutation (for admin actions)
  const updateDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, updates }: { disputeId: string; updates: any }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/disputes/${disputeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update dispute');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/disputes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/disputes', selectedDispute] });
      toast({
        title: "Dispute Updated",
        description: "The dispute has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update dispute",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!selectedDispute || !newMessage.trim()) return;
    addMessageMutation.mutate({
      disputeId: selectedDispute,
      message: newMessage,
      files: messageAttachments,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > 10) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 10MB`,
            variant: "destructive",
          });
          return false;
        }
        return true;
      });
      setMessageAttachments([...messageAttachments, ...validFiles]);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please login to view disputes</p>
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Gavel className="h-8 w-8" />
                Disputes
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage and track your disputes
              </p>
            </div>
            <Dialog open={isNewDisputeOpen} onOpenChange={setIsNewDisputeOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Dispute
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Dispute</DialogTitle>
                  <DialogDescription>
                    File a dispute related to a contract or property
                  </DialogDescription>
                </DialogHeader>
                <NewDisputeForm
                  contracts={contracts}
                  onSubmit={(data) => {
                    createDisputeMutation.mutate(data);
                  }}
                  isLoading={createDisputeMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 mt-6">
            {['all', 'open', 'in_progress', 'awaiting_response', 'resolved', 'closed', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Dispute List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search and Sort */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by ID, title, contract..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Dispute List */}
            <div className="space-y-3">
              {isLoading ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-gray-500">Loading disputes...</div>
                  </CardContent>
                </Card>
              ) : filteredDisputes.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Gavel className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">No disputes found</p>
                      <Button onClick={() => setIsNewDisputeOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Dispute
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredDisputes.map((dispute: any) => (
                  <motion.div
                    key={dispute.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedDispute === dispute.id ? 'ring-2 ring-primary-500' : ''
                      }`}
                      onClick={() => setSelectedDispute(dispute.id)}
                    >
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                                {dispute.title}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                ID: {dispute.id.substring(0, 8)}...
                              </p>
                            </div>
                            <Badge className={getStatusColor(dispute.status)}>
                              {getStatusIcon(dispute.status)}
                              <span className="ml-1 hidden sm:inline">
                                {dispute.status.replace('_', ' ')}
                              </span>
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(dispute.updatedAt || dispute.createdAt).toLocaleDateString()}
                          </div>
                          {dispute.messages && dispute.messages.length > 0 && (
                            <div className="flex items-center text-xs text-gray-500">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {dispute.messages.length} message{dispute.messages.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Right Column - Dispute Detail */}
          <div className="lg:col-span-2">
            {selectedDispute && disputeDetails ? (
              <DisputeDetail
                dispute={disputeDetails}
                user={user}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                messageAttachments={messageAttachments}
                setMessageAttachments={setMessageAttachments}
                onSendMessage={handleSendMessage}
                onFileSelect={handleFileSelect}
                onUpdateDispute={(updates) => updateDisputeMutation.mutate({ disputeId: selectedDispute, updates })}
                isLoadingMessage={addMessageMutation.isPending}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Gavel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Select a dispute to view details
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// New Dispute Form Component
function NewDisputeForm({ contracts, onSubmit, isLoading }: any) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    contractId: '',
    propertyId: '',
    description: '',
    evidenceFiles: [] as File[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.contractId || !formData.description) {
      return;
    }
    onSubmit(formData);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > 10) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 10MB`,
            variant: "destructive",
          });
          return false;
        }
        if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
          toast({
            title: "Invalid File Type",
            description: `${file.name} is not a valid file type. Please use JPG, PNG, or PDF.`,
            variant: "destructive",
          });
          return false;
        }
        return true;
      });
      setFormData({ ...formData, evidenceFiles: [...formData.evidenceFiles, ...validFiles] });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="payment">Payment Issue</SelectItem>
            <SelectItem value="property">Property Issue</SelectItem>
            <SelectItem value="contract">Contract Dispute</SelectItem>
            <SelectItem value="maintenance">Maintenance Request</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="contractId">Related Contract *</Label>
        <Select value={formData.contractId} onValueChange={(value) => setFormData({ ...formData, contractId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select contract" />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((contract: any) => (
              <SelectItem key={contract.id} value={contract.id}>
                Contract #{contract.id.substring(0, 8)} - {new Date(contract.startDate).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={5}
          required
          placeholder="Describe the issue in detail..."
        />
      </div>
      <div>
        <Label htmlFor="evidence">Evidence (JPG, PNG, PDF - Max 10MB each)</Label>
        <Input
          id="evidence"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/jpg,application/pdf"
          onChange={handleFileSelect}
        />
        {formData.evidenceFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {formData.evidenceFiles.map((file, idx) => (
              <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {file.name}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      evidenceFiles: formData.evidenceFiles.filter((_, i) => i !== idx)
                    });
                  }}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Upload supporting documents, photos, or screenshots to help resolve this dispute.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Submitting...' : 'Submit Dispute'}
        </Button>
      </div>
    </form>
  );
}

// Dispute Detail Component
function DisputeDetail({ dispute, user, newMessage, setNewMessage, messageAttachments, setMessageAttachments, onSendMessage, onFileSelect, onUpdateDispute, isLoadingMessage }: any) {
  const { toast } = useToast();
  const [isAdminActionOpen, setIsAdminActionOpen] = useState(false);
  const [adminAction, setAdminAction] = useState({ status: '', resolution: '', assignedAdmin: '' });

  const canReply = user.role === 'admin' || dispute.raisedBy === user.id || dispute.againstUser === user.id;
  const isAdmin = user.role === 'admin';
  const isOwner = dispute.raisedBy === user.id;

  const handleResolve = () => {
    if (!adminAction.status || !adminAction.resolution) {
      toast({
        title: "Error",
        description: "Please select status and provide resolution",
        variant: "destructive",
      });
      return;
    }
    onUpdateDispute({
      status: adminAction.status,
      resolution: adminAction.resolution,
      ...(adminAction.assignedAdmin && { assignedAdmin: adminAction.assignedAdmin }),
    });
    setIsAdminActionOpen(false);
  };

  const handleCloseDispute = () => {
    onUpdateDispute({ status: 'closed' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle>{dispute.title}</CardTitle>
                <Badge className={getStatusColor(dispute.status)}>
                  {getStatusIcon(dispute.status)}
                  <span className="ml-1">{dispute.status.replace('_', ' ')}</span>
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created: {new Date(dispute.createdAt).toLocaleDateString()}
                </div>
                {dispute.contractId && (
                  <Link href={`/contracts`} className="flex items-center gap-1 hover:text-primary-600">
                    <FileText className="h-4 w-4" />
                    Contract: {dispute.contractId.substring(0, 8)}...
                  </Link>
                )}
                {dispute.propertyId && (
                  <Link href={`/properties/${dispute.propertyId}`} className="flex items-center gap-1 hover:text-primary-600">
                    <Building2 className="h-4 w-4" />
                    Property
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Description</Label>
              <p className="text-gray-700 dark:text-gray-300 mt-1">{dispute.description}</p>
            </div>
            {dispute.category && (
              <div>
                <Label className="text-sm font-semibold">Category</Label>
                <Badge variant="outline" className="mt-1">{dispute.category}</Badge>
              </div>
            )}
            {dispute.resolution && (
              <div>
                <Label className="text-sm font-semibold">Resolution</Label>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{dispute.resolution}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Evidence Gallery */}
      {dispute.evidence && dispute.evidence.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {dispute.evidence.map((item: any, idx: number) => (
                <div key={idx} className="relative group">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    {item.mimeType?.startsWith('image/') ? (
                      <img
                        src={item.filePath}
                        alt={item.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => window.open(item.filePath, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = item.filePath;
                        link.download = item.fileName;
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{item.fileName}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline / Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Initial message from creator */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">Dispute Created</span>
                  <Badge variant="outline" className="text-xs">{dispute.status}</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{dispute.description}</p>
                <p className="text-xs text-gray-500">{new Date(dispute.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Messages */}
            {dispute.messages && dispute.messages.map((message: any, idx: number) => (
              <div key={idx} className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{message.senderName}</span>
                    <Badge variant="outline" className="text-xs">{message.senderRole}</Badge>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{message.message}</p>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {message.attachments.map((att: any, attIdx: number) => (
                        <Button
                          key={attIdx}
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(att.filePath, '_blank')}
                        >
                          <Paperclip className="h-3 w-3 mr-1" />
                          {att.fileName}
                        </Button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">{new Date(message.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Box */}
          {canReply && (dispute.status === 'open' || dispute.status === 'in_progress' || dispute.status === 'awaiting_response') && (
            <div className="mt-6 pt-6 border-t">
              <Label>Add Message</Label>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows={3}
                className="mt-2"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={onFileSelect}
                    className="hidden"
                    id="message-attachments"
                  />
                  <Label htmlFor="message-attachments" asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Paperclip className="h-4 w-4 mr-1" />
                      Attach
                    </Button>
                  </Label>
                  {messageAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {messageAttachments.map((file: File, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {file.name}
                          <button
                            onClick={() => setMessageAttachments(messageAttachments.filter((_, i) => i !== idx))}
                            className="ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={onSendMessage} disabled={!newMessage.trim() || isLoadingMessage}>
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Actions */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AlertDialog open={isAdminActionOpen} onOpenChange={setIsAdminActionOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Resolve Dispute
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Resolve Dispute</AlertDialogTitle>
                    <AlertDialogDescription>
                      Select the outcome and provide resolution details
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Status</Label>
                      <Select value={adminAction.status} onValueChange={(value) => setAdminAction({ ...adminAction, status: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Resolution</Label>
                      <Textarea
                        value={adminAction.resolution}
                        onChange={(e) => setAdminAction({ ...adminAction, resolution: e.target.value })}
                        placeholder="Enter resolution details..."
                        rows={4}
                      />
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResolve}>Resolve</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => onUpdateDispute({ status: 'in_progress' })}
              >
                Mark as In Progress
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Actions */}
      {isOwner && (dispute.status === 'open' || dispute.status === 'in_progress') && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Request to Close
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close Dispute</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to close this dispute? This action can be undone by an admin.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCloseDispute}>Close Dispute</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

