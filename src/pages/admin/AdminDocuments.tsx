import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, FileText, CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const DOCUMENT_LABELS: Record<string, string> = {
  aadhaar: "Aadhaar Card",
  pan: "PAN Card",
  bank_statement: "Bank Statement",
};

const AdminDocuments = () => {
  const [search, setSearch] = useState("");
  const [rejectDoc, setRejectDoc] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: docs, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_uploads")
        .select("*, orders!document_uploads_order_id_fkey(order_number, product:products(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for user names
      const userIds = [...new Set((data || []).map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      return (data || []).map((d: any) => ({
        ...d,
        profile: profileMap[d.user_id] || null,
      }));
    },
  });

  const handleApprove = async (docId: string) => {
    setProcessing(docId);
    try {
      const { error } = await supabase
        .from("document_uploads")
        .update({ status: "approved", rejection_reason: null })
        .eq("id", docId);
      if (error) throw error;
      toast.success("Document approved");
      refetch();
    } catch {
      toast.error("Failed to approve");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDoc) return;
    setProcessing(rejectDoc.id);
    try {
      const { error } = await supabase
        .from("document_uploads")
        .update({ status: "rejected", rejection_reason: rejectReason.trim() || "Rejected by admin" })
        .eq("id", rejectDoc.id);
      if (error) throw error;
      toast.success("Document rejected");
      setRejectDoc(null);
      setRejectReason("");
      refetch();
    } catch {
      toast.error("Failed to reject");
    } finally {
      setProcessing(null);
    }
  };

  const filtered = (docs || []).filter((d: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.profile?.full_name?.toLowerCase().includes(s) ||
      d.profile?.email?.toLowerCase().includes(s) ||
      d.orders?.order_number?.toLowerCase().includes(s) ||
      d.document_type?.toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Customer Documents</h1>
            <p className="text-muted-foreground">Review and manage all customer KYC document uploads</p>
          </div>
          <Input
            placeholder="Search by name, email, order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No documents found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{doc.profile?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{doc.profile?.email || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{doc.orders?.order_number || "—"}</TableCell>
                      <TableCell className="text-sm">{doc.orders?.product?.name || "—"}</TableCell>
                      <TableCell className="text-sm">{DOCUMENT_LABELS[doc.document_type] || doc.document_type}</TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{doc.file_name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            doc.status === "approved" ? "default" :
                            doc.status === "rejected" ? "destructive" : "secondary"
                          }
                          className="capitalize"
                        >
                          {doc.status}
                        </Badge>
                        {doc.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">{doc.rejection_reason}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.file_url, "_blank")}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {doc.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                disabled={processing === doc.id}
                                onClick={() => handleApprove(doc.id)}
                              >
                                {processing === doc.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setRejectDoc(doc)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={!!rejectDoc} onOpenChange={() => { setRejectDoc(null); setRejectReason(""); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Document</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Rejecting <strong>{DOCUMENT_LABELS[rejectDoc?.document_type] || ""}</strong> for order <strong>{rejectDoc?.orders?.order_number}</strong>.
              </p>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this document rejected?"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRejectDoc(null); setRejectReason(""); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={processing === rejectDoc?.id}>
                {processing === rejectDoc?.id ? "Rejecting..." : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminDocuments;
