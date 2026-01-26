import { useState, useEffect } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Gavel,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Eye,
  Download,
  Shield,
  AlertCircle,
  Filter,
  X,
  Building2,
  Calendar,
  Mail,
  Phone
} from "lucide-react";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'verified': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700';
  }
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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {isLoadingUser ? 'Loading...' : (userData?.fullName || userData?.name || `User ${doc.userId?.substring(0, 12)}...`)}
              </h3>
              <Badge className={getStatusColor(userData?.verificationStatus || 'pending')}>
                {userData?.verificationStatus || 'Pending'}
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
                Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
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
              Verify
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

export default function AdminPortal() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("documents");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [disputeFilter, setDisputeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [userEmail, setUserEmail] = useState("");

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
      const usersData = await response.json();
      console.log('[Admin Portal] Fetched users:', usersData.length, 'users');
      console.log('[Admin Portal] Sample user:', usersData[0]);
      return usersData;
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
      const docUser = users.find((u: any) =>
        u.id === selectedDocument.userId ||
        u._id === selectedDocument.userId ||
        u.uid === selectedDocument.userId
      );
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
      setSelectedDocument(null);
      setVerificationStatus("");
      setVerificationNotes("");
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

  // Filter documents
  const filteredDocuments = documents
    .filter((doc: any) => {
      if (documentFilter === "pending") {
        const user = users.find((u: any) =>
          u.id === doc.userId || u._id === doc.userId || u.uid === doc.userId
        );
        return user?.verificationStatus === 'pending' || !user?.verificationStatus;
      }
      if (documentFilter === "verified") {
        const user = users.find((u: any) =>
          u.id === doc.userId || u._id === doc.userId || u.uid === doc.userId
        );
        return user?.verificationStatus === 'verified';
      }
      if (documentFilter === "rejected") {
        const user = users.find((u: any) =>
          u.id === doc.userId || u._id === doc.userId || u.uid === doc.userId
        );
        return user?.verificationStatus === 'rejected';
      }
      return true;
    })
    .filter((doc: any) => {
      if (!searchQuery) return true;
      const user = users.find((u: any) =>
        u.id === doc.userId || u._id === doc.userId || u.uid === doc.userId
      );
      const query = searchQuery.toLowerCase();
      return (
        doc.type?.toLowerCase().includes(query) ||
        user?.fullName?.toLowerCase().includes(query) ||
        user?.name?.toLowerCase().includes(query) ||
        user?.email?.toLowerCase().includes(query) ||
        doc.fileName?.toLowerCase().includes(query)
      );
    });

  // Filter disputes
  const filteredDisputes = disputes
    .filter((dispute: any) => {
      if (disputeFilter !== "all") {
        return dispute.status === disputeFilter;
      }
      return true;
    })
    .filter((dispute: any) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        dispute.title?.toLowerCase().includes(query) ||
        dispute.id?.toLowerCase().includes(query) ||
        dispute.contractId?.toLowerCase().includes(query)
      );
    });

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Admin Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage document verifications and dispute resolutions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Documents & Verification
            </TabsTrigger>
            <TabsTrigger value="disputes">
              <Gavel className="mr-2 h-4 w-4" />
              Dispute Resolution
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
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
                </div>
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
                  const docUser = users.find((u: any) =>
                    u.id === doc.userId ||
                    u._id === doc.userId ||
                    u.uid === doc.userId
                  );

                  return (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      docUser={docUser}
                      onSelect={setSelectedDocument}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
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
                </div>
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
                  <Card key={dispute.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {dispute.title}
                            </h3>
                            <Badge className={getDisputeStatusColor(dispute.status)}>
                              {dispute.status.replace('_', ' ')}
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
                            <span>Created: {new Date(dispute.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
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
        </Tabs>
      </div>

      {/* Document Verification Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verify User Documents</DialogTitle>
            <DialogDescription>
              Review documents and update user verification status
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (() => {
            // Try multiple ways to find the user
            const docUser = users.find((u: any) =>
              u.id === selectedDocument.userId ||
              u._id === selectedDocument.userId ||
              u.uid === selectedDocument.userId
            );
            const userDocuments = documents.filter((d: any) => d.userId === selectedDocument.userId);

            // Initialize email when document is selected
            if (selectedDocument && !userEmail && docUser?.email) {
              setUserEmail(docUser.email);
            }

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
                        <Badge className={getStatusColor(docUser?.verificationStatus || 'pending')}>
                          {docUser?.verificationStatus || 'Pending'}
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
                        const fileUrl = doc.filePath?.startsWith('uploads/')
                          ? `/${doc.filePath}`
                          : doc.filePath?.startsWith('/')
                            ? doc.filePath
                            : `/uploads/${doc.filePath}`;
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
                                onClick={() => window.open(fileUrl, '_blank')}
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
                    <Label htmlFor="user-email">User Email *</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={userEmail || docUser?.email || ''}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Email address for the user being verified
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
                      onClick={() => {
                        setSelectedDocument(null);
                        setVerificationStatus("");
                        setVerificationNotes("");
                        setUserEmail("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyUser}
                      disabled={!verificationStatus || !userEmail || updateVerificationMutation.isPending}
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
                        src={item.filePath?.startsWith('uploads/')
                          ? `/${item.filePath}`
                          : item.filePath?.startsWith('/')
                            ? item.filePath
                            : `/uploads/${item.filePath}`}
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
                        const fileUrl = item.filePath?.startsWith('uploads/')
                          ? `/${item.filePath}`
                          : item.filePath?.startsWith('/')
                            ? item.filePath
                            : `/uploads/${item.filePath}`;
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

