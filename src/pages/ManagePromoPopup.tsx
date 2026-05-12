import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2, Upload, Download } from "lucide-react";
import { TechStackLoader } from "@/components/ui/TechStackLoader";
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';

interface Promo {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  collect_email: boolean;
  background_color: string | null;
  accent_color: string | null;
  is_active: boolean;
  expiry_date: string | null;
  created_at: string;
}

interface Signup {
  id: string;
  email: string;
  popup_id: string | null;
  captured_at: string;
}

const empty = {
  id: "",
  title: "",
  description: "",
  image_url: "",
  cta_label: "",
  cta_url: "",
  collect_email: false,
  background_color: "#0a0a0a",
  accent_color: "#fe4c18",
  is_active: false,
  expiry_date: "",
};

const ManagePromoPopup = () => {
  const { checking, isAdmin } = useAdminGuard();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [now, setNow] = useState(Date.now());

  const getLocalDatetime = (timestamp: string | null) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatTimeLeft = (expiryDate: string | null) => {
    if (!expiryDate) return "No deadline";
    const diff = new Date(expiryDate).getTime() - now;
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return `${parts.join(" ")} left`;
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const runningPromos = promos.filter((p) => p.is_active && (!p.expiry_date || new Date(p.expiry_date).getTime() > now));

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: pData }, { data: sData }] = await Promise.all([
      supabase.from("promo_popups").select("*").order("created_at", { ascending: false }),
      supabase.from("promo_email_signups").select("*").order("captured_at", { ascending: false }).limit(500),
    ]);
    setPromos((pData as Promo[]) || []);
    setSignups((sData as Signup[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const editPromo = (p: Promo) => {
    setForm({
      id: p.id,
      title: p.title,
      description: p.description || "",
      image_url: p.image_url || "",
      cta_label: p.cta_label || "",
      cta_url: p.cta_url || "",
      collect_email: p.collect_email,
      background_color: p.background_color || "#0a0a0a",
      accent_color: p.accent_color || "#fe4c18",
      is_active: p.is_active,
      expiry_date: getLocalDatetime(p.expiry_date),
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `promo/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // If activating, deactivate others first
      if (form.is_active) {
        await supabase.from("promo_popups").update({ is_active: false }).neq("id", form.id || "00000000-0000-0000-0000-000000000000");
      }

      const payload = {
        title: form.title,
        description: form.description || null,
        image_url: form.image_url || null,
        cta_label: form.cta_label || null,
        cta_url: form.cta_url || null,
        collect_email: form.collect_email,
        background_color: form.background_color,
        accent_color: form.accent_color,
        is_active: form.is_active,
        expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
      };

      if (form.id) {
        const { error } = await supabase.from("promo_popups").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promo_popups").insert(payload);
        if (error) throw error;
      }
      toast({ title: "Saved" });
      setForm(empty);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this promo?")) return;
    const { error } = await supabase.from("promo_popups").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    fetchAll();
  };

  const toggleActive = async (p: Promo) => {
    if (!p.is_active) {
      await supabase.from("promo_popups").update({ is_active: false }).neq("id", p.id);
    }
    await supabase.from("promo_popups").update({ is_active: !p.is_active }).eq("id", p.id);
    fetchAll();
  };

  const exportCSV = () => {
    const rows = [["Email", "Captured At", "Popup ID"], ...signups.map(s => [s.email, s.captured_at, s.popup_id || ""])];
    const csv = rows.map(r => r.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promo-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (checking || !isAdmin) return <TechStackLoader />;

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Promo Popups</h1>
        </div>

        <Tabs defaultValue="manage">
          <TabsList>
            <TabsTrigger value="manage">Manage</TabsTrigger>
            <TabsTrigger value="signups">Email Signups ({signups.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <Card>
                <CardHeader>
                  <CardTitle>{form.id ? "Edit Promo" : "New Promo"}</CardTitle>
                  <CardDescription>Configure the popup that appears on the homepage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Image (optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        disabled={uploading}
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    {form.image_url && (
                      <img src={form.image_url} alt="preview" className="mt-2 h-24 rounded object-cover" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>CTA Label</Label>
                      <Input
                        value={form.cta_label}
                        onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
                        placeholder="Learn More"
                      />
                    </div>
                    <div>
                      <Label>CTA URL</Label>
                      <Input
                        value={form.cta_url}
                        onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Expiry deadline</Label>
                    <Input
                      type="datetime-local"
                      value={form.expiry_date}
                      onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Background</Label>
                      <Input
                        type="color"
                        value={form.background_color}
                        onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Accent</Label>
                      <Input
                        type="color"
                        value={form.accent_color}
                        onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md border">
                    <div>
                      <p className="font-medium">Collect emails</p>
                      <p className="text-xs text-muted-foreground">Show an email subscribe field</p>
                    </div>
                    <Switch
                      checked={form.collect_email}
                      onCheckedChange={(v) => setForm({ ...form, collect_email: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md border">
                    <div>
                      <p className="font-medium">Active</p>
                      <p className="text-xs text-muted-foreground">Show this promo on the homepage</p>
                    </div>
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={save} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {form.id ? "Update" : "Create"}
                    </Button>
                    {form.id && (
                      <Button variant="outline" onClick={() => setForm(empty)}>Cancel</Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Live preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>How it will appear to visitors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="rounded-xl overflow-hidden shadow-2xl"
                    style={{ background: form.background_color, color: "#fff" }}
                  >
                    {form.image_url && (
                      <img src={form.image_url} alt="" className="w-full h-40 object-cover" />
                    )}
                    <div className="p-5 space-y-3">
                      <h3 className="text-xl font-bold" style={{ color: form.accent_color }}>
                        {form.title || "Your title here"}
                      </h3>
                      {form.description && <p className="text-sm text-white/80 whitespace-pre-line">{form.description}</p>}
                      {form.collect_email && (
                        <>
                          <Input disabled placeholder="Your email" className="bg-white/10 border-white/20 text-white placeholder:text-white/50" />
                          <Button disabled className="w-full" style={{ background: form.accent_color }}>Subscribe</Button>
                        </>
                      )}
                      {form.cta_label && (
                        <Button disabled className="w-full" style={{ background: form.collect_email ? "transparent" : form.accent_color, border: `1px solid ${form.accent_color}` }}>
                          {form.cta_label}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Existing promos */}
            <Card>
              <CardHeader>
                <CardTitle>Running Promos</CardTitle>
                <CardDescription>Active promos with time left until deadline.</CardDescription>
              </CardHeader>
              <CardContent>
                {runningPromos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No active promos running right now.</p>
                ) : (
                  <div className="grid gap-3">
                    {runningPromos.map((p) => (
                      <div key={p.id} className="rounded-xl border border-border/50 bg-background/80 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold">{p.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{p.expiry_date ? new Date(p.expiry_date).toLocaleString() : "No deadline"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatTimeLeft(p.expiry_date)}</p>
                            <p className="text-xs text-muted-foreground">{p.collect_email ? "Captures email" : "No email capture"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Promos</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : promos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No promos yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Email Capture</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Time Left</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promos.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.title}</TableCell>
                          <TableCell>
                            <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                          </TableCell>
                          <TableCell>{p.collect_email ? "Yes" : "No"}</TableCell>
                          <TableCell>{p.expiry_date ? new Date(p.expiry_date).toLocaleString() : "No deadline"}</TableCell>
                          <TableCell>{formatTimeLeft(p.expiry_date)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => editPromo(p)}>Edit</Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(p.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signups" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Captured Emails</CardTitle>
                  <CardDescription>Visitors who subscribed via promo popups</CardDescription>
                </div>
                <Button onClick={exportCSV} disabled={signups.length === 0}>
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {signups.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No signups yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Captured</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signups.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.email}</TableCell>
                          <TableCell>{new Date(s.captured_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default ManagePromoPopup;
