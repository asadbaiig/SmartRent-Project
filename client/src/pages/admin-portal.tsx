import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Gavel,
  FileText,
  Search,
  CheckCircle,
  Clock,
  User,
  Eye,
  Shield,
  X,
  Calendar,
  Mail,
  Users,
  Home,
  ClipboardList
} from "lucide-react";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatusLabel = (status: string | null | undefined) =>
  (status || "pending").replace(/_/g, " ");

const getUserForDocument = (users: any[], doc: any) =>
  users.find((u: any) => u.id === doc.userId || u._id === doc.userId || u.uid === doc.userId);

const getFileUrl = (filePath: string | null | undefined) => {
  if (!filePath) return "";
  const trimmed = filePath.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const normalized = trimmed.replace(/\\/g, "/").replace(/^\/+/, "");
  const uploadPath = normalized.startsWith("uploads/") ? normalized : `uploads/${normalized}`;
  return `/${uploadPath.split("/").map(encodeURIComponent).join("/")}`;
};

// Document Card Component with user data fetching
function DocumentCard({ doc, docUser, onSelect }: { doc: any; docUser: any; onSelect: (doc: any) => void }) {
  const [userData, setUserData] = useState<any>(docUser || null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  useEffect(() => {
    // If user not found in list, fetch from Firebase
    if (!docUser && doc.userId && !userData) {
      setIsLoadingUser(true);
      const fetchUserData = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/admin/users/${doc.userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const fetchedUserData = await response.json();
            setUserData(fetchedUserData);
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        } finally {
          setIsLoadingUser(false);
        }
      };
      fetchUserData();
    } else if (docUser) {
      setUserData(docUser);
    }
  }, [doc.userId, docUser, userData]);

  return (
    <Card className="rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {isLoadingUser ? 'Loading...' : (userData?.fullName || userData?.name || `User ${doc.userId?.substring(0, 12)}...`)}
              </h3>
              <Badge className={`${getStatusColor(userData?.verificationStatus || 'pending')} capitalize`}>
                {formatStatusLabel(userData?.verificationStatus)}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {userData?.email || 'N/A'}
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="capitalize">{doc.type || 'Document'}</span>
                {doc.fileName && <span className="text-gray-500">- {doc.fileName}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Uploaded: {formatDateTime(doc.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelect(doc)}
            >
              <Shield className="h-4 w-4 mr-1" />
              Review
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const getDisputeStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'closed': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getApprovalStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'pending_review': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700';
  }
};

function AdminStatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">{value}</p>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPortal() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("documents");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("pending_review");
  const [disputeFilter, setDisputeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [propertyApprovalStatus, setPropertyApprovalStatus] = useState("");
  const [propertyApprovalNotes, setPropertyApprovalNotes] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  const resetDocumentReview = () => {
    setSelectedDocument(null);
    setVerificationStatus("");
    setVerificationNotes("");
    setUserEmail("");
  };

  const resetPropertyReview = () => {
    setSelectedProperty(null);
    setPropertyApprovalStatus("");
    setPropertyApprovalNotes("");
  };

  const openDocumentReview = (doc: any) => {
    const docUser = getUserForDocument(users, doc);
    setSelectedDocument(doc);
    setVerificationStatus(docUser?.verificationStatus || "pending");
    setVerificationNotes(docUser?.verificationNotes || "");
    setUserEmail(docUser?.email || "");
  };

  const openPropertyReview = (property: any) => {
    setSelectedProperty(property);
    setPropertyApprovalStatus(property.approvalStatus || "pending_review");
    setPropertyApprovalNotes(property.approvalNotes || "");
  };

  // Fetch all documents (admin can see all) - hooks must be called before any returns
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/documents', 'admin'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
    enabled: !!user && user.role === 'admin',
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!user && user.role === 'admin',
  });

  const { data: adminProperties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['/api/admin/properties'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/properties?status=all', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch properties for review');
      return response.json();
    },
    enabled: !!user && user.role === 'admin',
  });

  const { data: auditLogs = [], isLoading: auditLogsLoading } = useQuery({
    queryKey: ['/api/admin/audit-logs'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/audit-logs?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
    enabled: !!user && user.role === 'admin',
  });

  // Fetch all disputes
  const { data: disputes = [], isLoading: disputesLoading } = useQuery({
    queryKey: ['/api/disputes', 'admin'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/disputes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch disputes');
      return response.json();
    },
    enabled: !!user && user.role === 'admin',
  });

  // Initialize email when document is selected (after users query)
  useEffect(() => {
    if (selectedDocument) {
      const docUser = getUserForDocument(users, selectedDocument);
      if (docUser?.email) {
        setUserEmail(docUser.email);
      } else {
        // Fetch user email if not in list
        const fetchUserEmail = async () => {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${selectedDocument.userId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            if (response.ok) {
              const userData = await response.json();
              setUserEmail(userData.email || '');
            }
          } catch (error) {
            console.error('Failed to fetch user email:', error);
          }
        };
        fetchUserEmail();
      }
    } else {
      setUserEmail("");
    }
  }, [selectedDocument, users]);

  // Update user verification mutation - must be before conditional returns
  const updateVerificationMutation = useMutation({
    mutationFn: async ({ userId, status, notes }: { userId: string; status: string; notes?: string }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}/verification`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, notes }),
      });
      if (!response.ok) throw new Error('Failed to update verification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      resetDocumentReview();
      toast({
        title: "Verification Updated",
        description: "User verification status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update verification",
        variant: "destructive",
      });
    },
  });

  // Update dispute mutation
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
      setSelectedDispute(null);
      toast({
        title: "Dispute Updated",
        description: "Dispute has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update dispute",
        variant: "destructive",
      });
    },
  });

  const updatePropertyApprovalMutation = useMutation({
    mutationFn: async ({ propertyId, status, notes }: { propertyId: string; status: string; notes?: string }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/properties/${propertyId}/approval`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, notes }),
      });
      if (!response.ok) throw new Error('Failed to update property approval');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      resetPropertyReview();
      toast({
        title: "Property Review Updated",
        description: "The property approval status has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property approval",
        variant: "destructive",
      });
    },
  });

  const adminStats = useMemo(() => {
    const pendingDocuments = documents.filter((doc: any) => {
      const docUser = getUserForDocument(users, doc);
      return docUser?.verificationStatus === "pending" || !docUser?.verificationStatus;
    }).length;
    const openDisputes = disputes.filter((dispute: any) =>
      ["open", "in_progress", "awaiting_response"].includes(dispute.status)
    ).length;

    return {
      pendingDocuments,
      pendingProperties: adminProperties.filter((property: any) =>
        (property.approvalStatus || "approved") === "pending_review"
      ).length,
      verifiedUsers: users.filter((u: any) => u.verificationStatus === "verified").length,
      openDisputes,
      totalUsers: users.length,
    };
  }, [adminProperties, documents, disputes, users]);

  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc: any) => {
        const docUser = getUserForDocument(users, doc);
        const status = docUser?.verificationStatus || "pending";
        return documentFilter === "all" || status === documentFilter;
      })
      .filter((doc: any) => {
        if (!searchQuery.trim()) return true;
        const docUser = getUserForDocument(users, doc);
        const query = searchQuery.toLowerCase();
        return (
          doc.type?.toLowerCase().includes(query) ||
          docUser?.fullName?.toLowerCase().includes(query) ||
          docUser?.name?.toLowerCase().includes(query) ||
          docUser?.email?.toLowerCase().includes(query) ||
          doc.fileName?.toLowerCase().includes(query)
        );
      });
  }, [documentFilter, documents, searchQuery, users]);

  const filteredDisputes = useMemo(() => {
    return disputes
      .filter((dispute: any) => disputeFilter === "all" || dispute.status === disputeFilter)
      .filter((dispute: any) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          dispute.title?.toLowerCase().includes(query) ||
          dispute.id?.toLowerCase().includes(query) ||
          dispute.contractId?.toLowerCase().includes(query) ||
          dispute.category?.toLowerCase().includes(query)
        );
      });
  }, [disputeFilter, disputes, searchQuery]);

  const filteredProperties = useMemo(() => {
    return adminProperties.filter((property: any) => {
      const status = property.approvalStatus || "approved";
      if (propertyFilter !== "all" && status !== propertyFilter) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        property.title?.toLowerCase().includes(query) ||
        property.city?.toLowerCase().includes(query) ||
        property.area?.toLowerCase().includes(query) ||
        property.propertyType?.toLowerCase().includes(query) ||
        property.landlordId?.toLowerCase().includes(query)
      );
    });
  }, [adminProperties, propertyFilter, searchQuery]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log: any) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        log.summary?.toLowerCase().includes(query) ||
        log.action?.toLowerCase().includes(query) ||
        log.entityType?.toLowerCase().includes(query) ||
        log.entityId?.toLowerCase().includes(query) ||
        log.actorId?.toLowerCase().includes(query)
      );
    });
  }, [auditLogs, searchQuery]);

  const handleVerifyUser = () => {
    if (!selectedDocument || !verificationStatus) {
      toast({
        title: "Error",
        description: "Please select a verification status",
        variant: "destructive",
      });
      return;
    }
    updateVerificationMutation.mutate({
      userId: selectedDocument.userId,
      status: verificationStatus,
      notes: verificationNotes,
    });
  };

  const handleResolveDispute = (disputeId: string, status: string, resolution: string) => {
    updateDisputeMutation.mutate({
      disputeId,
      updates: { status, resolution },
    });
  };

  const handlePropertyApproval = () => {
    if (!selectedProperty || !propertyApprovalStatus) {
      toast({
        title: "Error",
        description: "Please select an approval status",
        variant: "destructive",
      });
      return;
    }

    updatePropertyApprovalMutation.mutate({
      propertyId: selectedProperty.id,
      status: propertyApprovalStatus,
      notes: propertyApprovalNotes,
    });
  };

  // Check if user is admin - after all hooks
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Admin access required</p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Portal
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Review identity documents, track disputes, and keep platform trust moving.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
                queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
                queryClient.invalidateQueries({ queryKey: ['/api/disputes'] });
              }}
            >
              <Clock className="mr-2 h-4 w-4" />
              Refresh queues
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard label="Pending documents" value={adminStats.pendingDocuments} icon={Clock} tone="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200" />
          <AdminStatCard label="Pending properties" value={adminStats.pendingProperties} icon={Home} tone="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200" />
          <AdminStatCard label="Open disputes" value={adminStats.openDisputes} icon={Gavel} tone="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200" />
          <AdminStatCard label="Total users" value={adminStats.totalUsers} icon={Users} tone="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 rounded-lg">
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Documents
              {adminStats.pendingDocuments > 0 && (
                <Badge variant="secondary" className="ml-2">{adminStats.pendingDocuments}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="properties">
              <Home className="mr-2 h-4 w-4" />
              Properties
              {adminStats.pendingProperties > 0 && (
                <Badge variant="secondary" className="ml-2">{adminStats.pendingProperties}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="disputes">
              <Gavel className="mr-2 h-4 w-4" />
              Disputes
              {adminStats.openDisputes > 0 && (
                <Badge variant="secondary" className="ml-2">{adminStats.openDisputes}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit">
              <ClipboardList className="mr-2 h-4 w-4" />
              Audit
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            {/* Filters */}
            <Card className="rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by user name, email, document type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={documentFilter} onValueChange={setDocumentFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Documents</SelectItem>
                      <SelectItem value="pending">Pending Verification</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  {(searchQuery || documentFilter !== "all") && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearchQuery("");
                        setDocumentFilter("all");
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredDocuments.length} of {documents.length} uploaded documents.
                </p>
              </CardContent>
            </Card>

            {/* Documents List - Two Column Layout */}
            {(documentsLoading || usersLoading) ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">Loading documents and users...</div>
                </CardContent>
              </Card>
            ) : filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No documents found matching your criteria</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((doc: any) => {
                  const docUser = getUserForDocument(users, doc);

                  return (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      docUser={docUser}
                      onSelect={openDocumentReview}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-6">
            <Card className="rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by title, city, area, type, landlord..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  {(searchQuery || propertyFilter !== "pending_review") && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearchQuery("");
                        setPropertyFilter("pending_review");
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredProperties.length} of {adminProperties.length} properties in this queue.
                </p>
              </CardContent>
            </Card>

            {propertiesLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">Loading property review queue...</div>
                </CardContent>
              </Card>
            ) : filteredProperties.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No properties found in this queue</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredProperties.map((property: any) => (
                  <Card key={property.id} className="rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                              {property.title}
                            </h3>
                            <Badge className={`${getApprovalStatusColor(property.approvalStatus || 'approved')} capitalize`}>
                              {formatStatusLabel(property.approvalStatus || 'approved')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {property.description || "No description provided."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                            <span>{property.area}, {property.city}</span>
                            <span className="capitalize">{property.propertyType}</span>
                            <span>Rent: Rs {Number(property.monthlyRent || 0).toLocaleString()}</span>
                            <span>Submitted: {formatDateTime(property.createdAt)}</span>
                          </div>
                          {property.approvalNotes && (
                            <p className="mt-3 text-sm text-red-600 dark:text-red-300">
                              Notes: {property.approvalNotes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {property.approvalStatus === 'approved' && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/properties/${property.id}`}>
                                <Eye className="mr-1 h-4 w-4" />
                                View
                              </Link>
                            </Button>
                          )}
                          <Button size="sm" onClick={() => openPropertyReview(property)}>
                            <Shield className="mr-1 h-4 w-4" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="space-y-6">
            {/* Filters */}
            <Card className="rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search disputes by title, ID, contract..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={disputeFilter} onValueChange={setDisputeFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Disputes</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  {(searchQuery || disputeFilter !== "all") && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearchQuery("");
                        setDisputeFilter("all");
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredDisputes.length} of {disputes.length} disputes.
                </p>
              </CardContent>
            </Card>

            {/* Disputes List */}
            {disputesLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">Loading disputes...</div>
                </CardContent>
              </Card>
            ) : filteredDisputes.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Gavel className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No disputes found</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredDisputes.map((dispute: any) => (
                  <Card key={dispute.id} className="rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {dispute.title}
                            </h3>
                            <Badge className={`${getDisputeStatusColor(dispute.status)} capitalize`}>
                              {formatStatusLabel(dispute.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {dispute.description}
                          </p>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span>ID: {dispute.id.substring(0, 8)}...</span>
                            {dispute.contractId && (
                              <span>Contract: {dispute.contractId.substring(0, 8)}...</span>
                            )}
                            <span>Created: {formatDateTime(dispute.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 sm:justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDispute(dispute)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card className="rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search audit logs by action, actor, entity, or summary..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredAuditLogs.length} of {auditLogs.length} recent audit events.
                </p>
              </CardContent>
            </Card>

            {auditLogsLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">Loading audit logs...</div>
                </CardContent>
              </Card>
            ) : filteredAuditLogs.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAuditLogs.map((log: any) => (
                  <Card key={log.id} className="rounded-lg shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[11px]">{log.action}</Badge>
                            <span className="text-sm text-gray-500">{log.entityType}: {String(log.entityId).slice(0, 10)}...</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{log.summary}</p>
                          <p className="mt-1 text-xs text-gray-500">Actor: {log.actorId || "system"} ({log.actorRole || "unknown"})</p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Document Verification Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && resetDocumentReview()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verify User Documents</DialogTitle>
            <DialogDescription>
              Review documents and update user verification status
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (() => {
            // Try multiple ways to find the user
            const docUser = getUserForDocument(users, selectedDocument);
            const userDocuments = documents.filter((d: any) => d.userId === selectedDocument.userId);

            return (
              <div className="space-y-6">
                {/* User Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold">{docUser?.fullName || docUser?.name || `User ${selectedDocument.userId?.substring(0, 8)}...`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{docUser?.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{docUser?.role || 'N/A'}</Badge>
                        <Badge className={`${getStatusColor(docUser?.verificationStatus || 'pending')} capitalize`}>
                          {formatStatusLabel(docUser?.verificationStatus)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* All User Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userDocuments.map((doc: any) => {
                        const fileUrl = getFileUrl(doc.filePath);
                        const isImage = doc.mimeType?.startsWith('image/') ||
                          doc.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                        return (
                          <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-gray-500" />
                                <div>
                                  <p className="font-medium capitalize">{doc.type || 'Document'}</p>
                                  <p className="text-sm text-gray-500">{doc.fileName}</p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileUrl && window.open(fileUrl, '_blank', 'noopener,noreferrer')}
                                disabled={!fileUrl}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Open Full Size
                              </Button>
                            </div>
                            {isImage && (
                              <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                <img
                                  src={fileUrl}
                                  alt={doc.fileName}
                                  className="w-full max-h-64 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Verification Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user-email">User Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={userEmail || docUser?.email || ''}
                      placeholder="user@example.com"
                      readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Stored account email for the user being reviewed.
                    </p>
                  </div>
                  <div>
                    <Label>Verification Status *</Label>
                    <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder="Add any notes about the verification..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={resetDocumentReview}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyUser}
                      disabled={!verificationStatus || updateVerificationMutation.isPending}
                    >
                      {updateVerificationMutation.isPending ? 'Updating...' : 'Update Verification'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Property Review Dialog */}
      <Dialog open={!!selectedProperty} onOpenChange={(open) => !open && resetPropertyReview()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Property Listing</DialogTitle>
            <DialogDescription>
              Approve listings before they become visible in public search.
            </DialogDescription>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-6">
              <Card className="rounded-lg">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProperty.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {selectedProperty.area}, {selectedProperty.city}
                      </p>
                    </div>
                    <Badge className={`${getApprovalStatusColor(selectedProperty.approvalStatus || 'approved')} capitalize`}>
                      {formatStatusLabel(selectedProperty.approvalStatus || 'approved')}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-xs text-gray-500">Rent</Label>
                      <p className="font-semibold">Rs {Number(selectedProperty.monthlyRent || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Type</Label>
                      <p className="font-semibold capitalize">{selectedProperty.propertyType}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Bedrooms</Label>
                      <p className="font-semibold">{selectedProperty.bedrooms ?? "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Submitted</Label>
                      <p className="font-semibold">{formatDateTime(selectedProperty.createdAt)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label className="text-xs text-gray-500">Description</Label>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {selectedProperty.description || "No description provided."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div>
                  <Label>Approval Status *</Label>
                  <Select value={propertyApprovalStatus} onValueChange={setPropertyApprovalStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Review Notes</Label>
                  <Textarea
                    value={propertyApprovalNotes}
                    onChange={(e) => setPropertyApprovalNotes(e.target.value)}
                    placeholder="Add reason for rejection or internal review notes..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetPropertyReview}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePropertyApproval}
                    disabled={!propertyApprovalStatus || updatePropertyApprovalMutation.isPending}
                  >
                    {updatePropertyApprovalMutation.isPending ? 'Saving...' : 'Save Review'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>
              Review and resolve the dispute
            </DialogDescription>
          </DialogHeader>
          {selectedDispute && (
            <DisputeResolutionForm
              dispute={selectedDispute}
              onResolve={handleResolveDispute}
              onClose={() => setSelectedDispute(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Dispute Resolution Form Component
function DisputeResolutionForm({ dispute, onResolve, onClose }: any) {
  const [status, setStatus] = useState(dispute.status);
  const [resolution, setResolution] = useState(dispute.resolution || "");

  const handleSubmit = () => {
    if (!status || !resolution.trim()) {
      return;
    }
    onResolve(dispute.id, status, resolution);
  };

  return (
    <div className="space-y-6">
      {/* Dispute Info */}
      <Card>
        <CardHeader>
          <CardTitle>{dispute.title}</CardTitle>
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
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-sm font-semibold">Status</Label>
                <Badge className={getDisputeStatusColor(dispute.status)}>
                  {dispute.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-semibold">Created</Label>
                <p>{new Date(dispute.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence */}
      {dispute.evidence && dispute.evidence.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {dispute.evidence.map((item: any, idx: number) => (
                <div key={idx} className="relative group">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    {item.mimeType?.startsWith('image/') ? (
                      <img
                        src={getFileUrl(item.filePath)}
                        alt={item.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        const fileUrl = getFileUrl(item.filePath);
                        window.open(fileUrl, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolution Form */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resolution Details *</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Enter resolution details..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!status || !resolution.trim()}>
                Save Resolution
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
