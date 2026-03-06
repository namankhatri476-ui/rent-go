import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LegalDoc {
  id: string;
  slug: string;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
}

const AdminLegal = () => {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedDocs, setEditedDocs] = useState<Record<string, { title: string; content: string }>>({});
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    const { data, error } = await supabase
      .from("legal_documents")
      .select("*")
      .order("created_at");
    if (error) {
      toast.error("Failed to load documents");
      return;
    }
    setDocs(data || []);
    setLoading(false);
  };

  const handleChange = (slug: string, field: "title" | "content", value: string) => {
    const doc = docs.find(d => d.slug === slug);
    if (!doc) return;
    setEditedDocs(prev => ({
      ...prev,
      [slug]: {
        title: field === "title" ? value : (prev[slug]?.title ?? doc.title),
        content: field === "content" ? value : (prev[slug]?.content ?? doc.content),
      }
    }));
  };

  const handleSave = async (doc: LegalDoc) => {
    const edited = editedDocs[doc.slug];
    if (!edited) return;

    setSaving(doc.slug);
    const { error } = await supabase
      .from("legal_documents")
      .update({
        title: edited.title,
        content: edited.content,
        version: doc.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success(`${edited.title} saved (v${doc.version + 1})`);
      setEditedDocs(prev => {
        const next = { ...prev };
        delete next[doc.slug];
        return next;
      });
      fetchDocs();
    }
    setSaving(null);
  };

  const renderPreview = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h2>;
      if (line.startsWith("## ")) return <h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(3)}</h3>;
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Legal Documents</h1>
          <p className="text-muted-foreground text-sm">
            Manage Terms & Conditions, Privacy Policy, and other legal pages. Changes auto-version.
          </p>
        </div>

        <Tabs defaultValue={docs[0]?.slug}>
          <TabsList className="flex-wrap h-auto gap-1">
            {docs.map(doc => (
              <TabsTrigger key={doc.slug} value={doc.slug} className="text-xs">
                {doc.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {docs.map(doc => {
            const edited = editedDocs[doc.slug];
            const currentTitle = edited?.title ?? doc.title;
            const currentContent = edited?.content ?? doc.content;
            const hasChanges = !!edited;

            return (
              <TabsContent key={doc.slug} value={doc.slug}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="w-5 h-5" />
                        {doc.title}
                        <span className="text-xs text-muted-foreground font-normal">v{doc.version}</span>
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewSlug(previewSlug === doc.slug ? null : doc.slug)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          disabled={!hasChanges || saving === doc.slug}
                          onClick={() => handleSave(doc)}
                        >
                          {saving === doc.slug ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={currentTitle}
                        onChange={e => handleChange(doc.slug, "title", e.target.value)}
                      />
                    </div>

                    {previewSlug === doc.slug ? (
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <ScrollArea className="h-[400px] border rounded-lg p-4 bg-muted/30">
                          {renderPreview(currentContent)}
                        </ScrollArea>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Content (Markdown-style)</Label>
                        <Textarea
                          value={currentContent}
                          onChange={e => handleChange(doc.slug, "content", e.target.value)}
                          rows={18}
                          className="font-mono text-sm"
                          placeholder="# Heading&#10;## Subheading&#10;Paragraph text..."
                        />
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Slug: <code className="bg-muted px-1 rounded">/legal/{doc.slug}</code> • 
                      Use # for headings and ## for subheadings
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminLegal;
