import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, CheckCircle, Clock, XCircle, Loader2, Eye, Package } from "lucide-react";

const DOCUMENT_TYPES = [
  { id: "aadhaar", label: "Aadhaar Card" },
  { id: "pan", label: "PAN Card" },
  { id: "bank_statement", label: "6-Month Bank Statement" },
];

const statusConfig: Record<string, { icon: React.ReactNode; variant: "default" | "secondary" | "destructive" }> = {
  pending: { icon: <Clock className="w-4 h-4" />, variant: "secondary" },
  approved: { icon: <CheckCircle className="w-4 h-4" />, variant: "default" },
  rejected: { icon: <XCircle className="w-4 h-4" />, variant: "destructive" },
};

const OrderDocuments = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);

  // Fetch order with product info
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order-for-docs", orderId],
    enabled: !!user && !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, product:products(id, name, images, brand)")
        .eq("id", orderId!)
        .eq("customer_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch documents for this order
  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: ["order-documents", orderId],
    enabled: !!user && !!orderId,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_uploads")
        .select("*")
        .eq("order_id", orderId!)
        .eq("user_id", user!.id);
      return data || [];
    },
  });

  const getDocForType = (docType: string) => {
    return (docs || []).find((d: any) => d.document_type === docType) || null;
  };

  const handleUpload = async (docType: string, file: File) => {
    if (!user || !orderId) return;
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${orderId}/${docType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("customer-documents")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("customer-documents")
        .getPublicUrl(path);

      const existing = getDocForType(docType);

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
            order_id: orderId,
            document_type: docType,
            file_url: urlData.publicUrl,
            file_name: file.name,
          });
        if (error) throw error;
      }

      toast.success(`${DOCUMENT_TYPES.find((d) => d.id === docType)?.label} uploaded successfully`);
      queryClient.invalidateQueries({ queryKey: ["order-documents", orderId] });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const isLoading = orderLoading || docsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <Package className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Order not found</h2>
            <Link to="/my-account?tab=orders"><Button>Back to Orders</Button></Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const uploadedCount = DOCUMENT_TYPES.filter((dt) => getDocForType(dt.id)).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            to="/my-account?tab=orders"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Orders
          </Link>

          <div className="space-y-6">
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Documents for {order.order_number}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Upload required documents to complete order verification. {uploadedCount}/{DOCUMENT_TYPES.length} submitted.
                </p>
              </div>
              <Badge variant="secondary" className="self-start">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>

            {/* Product Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {(order as any).product?.name || "Product"}
                  {(order as any).product?.brand && (
                    <span className="text-sm font-normal text-muted-foreground">— {(order as any).product.brand}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {DOCUMENT_TYPES.map((docType) => {
                    const doc = getDocForType(docType.id);
                    const status = doc ? (doc as any).status : null;
                    const config = status ? statusConfig[status] : null;

                    return (
                      <div
                        key={docType.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{docType.label}</p>
                            {doc && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {(doc as any).file_name}
                              </p>
                            )}
                            {doc && (doc as any).rejection_reason && (
                              <p className="text-xs text-destructive mt-1">
                                Reason: {(doc as any).rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Status Badge */}
                          {config ? (
                            <Badge variant={config.variant} className="gap-1 capitalize">
                              {config.icon}
                              {status}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              Not uploaded
                            </Badge>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            {doc && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => window.open((doc as any).file_url, "_blank")}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </Button>
                            )}

                            {/* Upload / Re-upload */}
                            {(!doc || status === "rejected") && (
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
                                <Button variant="default" size="sm" className="gap-1 pointer-events-none" tabIndex={-1}>
                                  {uploading === docType.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Upload className="w-3.5 h-3.5" />
                                  )}
                                  {doc ? "Re-upload" : "Upload"}
                                </Button>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderDocuments;
