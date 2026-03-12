import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";

const DOCUMENT_TYPES = [
  { id: "aadhaar", label: "Aadhaar Card" },
  { id: "pan", label: "PAN Card" },
  { id: "bank_statement", label: "6-Month Bank Statement" },
];

const statusIcons: Record<string, any> = {
  pending: <Clock className="w-4 h-4 text-yellow-600" />,
  approved: <CheckCircle className="w-4 h-4 text-green-600" />,
  rejected: <XCircle className="w-4 h-4 text-red-600" />,
};

const AccountDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [uploading, setUploading] = useState<string | null>(null);

  // Fetch user's orders
  const { data: orders } = useQuery({
    queryKey: ["my-orders-for-docs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch documents for selected order
  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: ["order-documents", selectedOrder],
    enabled: !!selectedOrder,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_uploads")
        .select("*")
        .eq("order_id", selectedOrder);
      return data || [];
    },
  });

  const uploadedTypes = new Set((docs || []).map((d: any) => d.document_type));
  const progress = Math.round((uploadedTypes.size / DOCUMENT_TYPES.length) * 100);

  const handleUpload = async (docType: string, file: File) => {
    if (!user || !selectedOrder) return;
    setUploading(docType);

    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${selectedOrder}/${docType}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-documents")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("customer-documents")
        .getPublicUrl(path);

      // Check if document already exists
      const existing = (docs || []).find((d: any) => d.document_type === docType);
      if (existing) {
        const { error } = await supabase
          .from("document_uploads")
          .update({
            file_url: urlData.publicUrl,
            file_name: file.name,
            status: "pending",
            rejection_reason: null,
          })
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("document_uploads")
          .insert({
            user_id: user.id,
            order_id: selectedOrder,
            document_type: docType,
            file_url: urlData.publicUrl,
            file_name: file.name,
          });
        if (error) throw error;
      }

      toast.success(`${DOCUMENT_TYPES.find(d => d.id === docType)?.label} uploaded`);
      queryClient.invalidateQueries({ queryKey: ["order-documents", selectedOrder] });
      queryClient.invalidateQueries({ queryKey: ["my-order-documents"] });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Document Upload</h1>
      <p className="text-muted-foreground">
        Upload mandatory documents (Aadhaar, PAN, 6-month Bank Statement) for your orders.
      </p>

      {/* Order Selector */}
      <div className="space-y-2 max-w-sm">
        <Label>Select Order</Label>
        <Select value={selectedOrder} onValueChange={setSelectedOrder}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an order" />
          </SelectTrigger>
          <SelectContent>
            {(orders || []).map((o: any) => (
              <SelectItem key={o.id} value={o.id}>
                {o.order_number} ({o.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedOrder && (
        <div className="space-y-6">
          {/* Progress */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Upload Progress</span>
                <span className="text-sm font-bold">{progress}% Complete</span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {uploadedTypes.size === 0
                  ? "NO DOCUMENTS WERE SUBMITTED FOR THIS ORDER."
                  : `${uploadedTypes.size}/${DOCUMENT_TYPES.length} documents submitted`}
              </p>
            </CardContent>
          </Card>

          {/* Document Cards */}
          {docsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {DOCUMENT_TYPES.map((docType) => {
                const doc = (docs || []).find((d: any) => d.document_type === docType.id);
                return (
                  <Card key={docType.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {docType.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {doc ? (
                        <>
                          <div className="flex items-center gap-2">
                            {statusIcons[(doc as any).status]}
                            <Badge variant={
                              (doc as any).status === "approved" ? "default" :
                              (doc as any).status === "rejected" ? "destructive" : "secondary"
                            }>
                              {(doc as any).status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{(doc as any).file_name}</p>
                          {(doc as any).rejection_reason && (
                            <p className="text-xs text-destructive">Reason: {(doc as any).rejection_reason}</p>
                          )}
                          {/* Re-upload if rejected */}
                          {(doc as any).status === "rejected" && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleUpload(docType.id, f);
                                }}
                              />
                              <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                                <span>
                                  {uploading === docType.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                  Re-upload
                                </span>
                              </Button>
                            </label>
                          )}
                        </>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(docType.id, f);
                            }}
                          />
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors">
                            {uploading === docType.id ? (
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                            ) : (
                              <>
                                <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                                <p className="text-xs text-muted-foreground">Click to upload</p>
                                <p className="text-xs text-muted-foreground">PDF, JPG, PNG</p>
                              </>
                            )}
                          </div>
                        </label>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountDocuments;
