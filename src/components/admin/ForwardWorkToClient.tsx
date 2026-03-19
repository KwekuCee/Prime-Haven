import { useState, useEffect, useMemo } from 'react';
import { 
  Send, Loader2, Mail, User, Phone, FileCheck, Paperclip, 
  CheckCircle, Image as ImageIcon, ExternalLink, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ClientOption {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
}

interface AcceptedSubmission {
  id: string;
  project_name: string;
  service_type: string;
  files_urls: string[];
  design_link: string | null;
  client_ref: string | null;
  created_at: string;
  designer_name: string;
}

const SERVICE_LABELS: Record<string, string> = {
  logo: 'Logo Design', flyer: 'Flyer Design', banner: 'Banner Design',
  poster: 'Poster Design', social: 'Social Media', branding: 'Brand Identity',
  uiux: 'UI/UX Design', web: 'Web Development', packaging: 'Packaging',
};

const ForwardWorkToClient = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [submissions, setSubmissions] = useState<AcceptedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form state
  const [selectedClientKey, setSelectedClientKey] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [reviewLink, setReviewLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load clients from clients table
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, email, whatsapp')
        .order('name');

      setClients((clientsData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email || '',
        whatsapp: c.whatsapp || '',
      })));

      // Load accepted/approved submissions
      const { data: subs, error: subsError } = await supabase
        .from('submissions')
        .select('id, project_name, service_type, files_urls, design_link, client_ref, created_at, designer_id')
        .or('status.eq.ph_approved,status.eq.approved,client_accepted.eq.true')
        .order('created_at', { ascending: false });

      if (subsError) {
        console.error('Submissions query error:', subsError);
      }

      if (subs && subs.length > 0) {
        // Fetch designer names separately
        const designerIds = [...new Set(subs.map((s: any) => s.designer_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', designerIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

        setSubmissions(subs.map((s: any) => ({
          ...s,
          designer_name: profileMap.get(s.designer_id) || 'Unknown Designer',
        })));
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (key: string) => {
    setSelectedClientKey(key);
    const client = clients.find(c => c.id === key);
    setSelectedClient(client || null);
    setSelectedSubmissionIds([]);

    if (client) {
      setSearchQuery(client.name);
    }
  };

  // Filter submissions by client name match
  const filteredSubmissions = useMemo(() => {
    if (!selectedClient) return submissions;
    const clientName = selectedClient.name.toLowerCase();
    // Show submissions matching the client ref or all if no exact match
    const matched = submissions.filter(s =>
      s.client_ref?.toLowerCase().includes(clientName) ||
      s.project_name.toLowerCase().includes(clientName)
    );
    return matched.length > 0 ? matched : submissions;
  }, [submissions, selectedClient]);

  const toggleSubmission = (id: string) => {
    setSelectedSubmissionIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getSignedUrls = async (filePaths: string[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const path of filePaths) {
      try {
        const { data } = await supabase.functions.invoke('get-signed-url', {
          body: { bucket: 'submissions', path },
        });
        if (data?.url) urls.push(data.url);
      } catch {
        // Try public URL as fallback
        const { data: pubData } = supabase.storage.from('submissions').getPublicUrl(path);
        if (pubData?.publicUrl) urls.push(pubData.publicUrl);
      }
    }
    return urls;
  };

  const handleSend = async () => {
    if (!selectedClient?.email) {
      toast({ title: 'No email', description: 'Selected client has no email address.', variant: 'destructive' });
      return;
    }
    if (selectedSubmissionIds.length === 0) {
      toast({ title: 'No work selected', description: 'Please select at least one submission to forward.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const selectedSubs = submissions.filter(s => selectedSubmissionIds.includes(s.id));
      
      // Build file links for all selected submissions
      const allFileLinks: string[] = [];
      const designLinks: string[] = [];
      
      for (const sub of selectedSubs) {
        if (sub.files_urls && sub.files_urls.length > 0) {
          const urls = await getSignedUrls(sub.files_urls);
          allFileLinks.push(...urls);
        }
        if (sub.design_link) {
          designLinks.push(sub.design_link);
        }
      }

      // Build the email body
      const projectList = selectedSubs.map(s => 
        `• ${s.project_name} (${SERVICE_LABELS[s.service_type] || s.service_type}) — by ${s.designer_name}`
      ).join('\n');

      const fileSection = allFileLinks.length > 0
        ? `\n\n📎 Attached Design Files:\n${allFileLinks.map((url, i) => `   ${i + 1}. ${url}`).join('\n')}`
        : '';

      const linkSection = designLinks.length > 0
        ? `\n\n🔗 Design Links:\n${designLinks.map((url, i) => `   ${i + 1}. ${url}`).join('\n')}`
        : '';

      const reviewSection = reviewLink
        ? `\n\n🔍 Review Link:\n   ${reviewLink}`
        : '';

      const defaultMessage = `We're excited to share the completed work for your project! Our team has put great care into crafting designs that align with your vision.`;

      const fullBody = `${customMessage || defaultMessage}

📋 Completed Work:
${projectList}${fileSection}${linkSection}${reviewSection}

We'd love to hear your feedback. Please take a moment to review the work and let us know if everything meets your expectations or if you'd like any adjustments.

Thank you for choosing Prime Haven! ✨`;

      const subject = `Your Design Work is Ready — ${selectedSubs.map(s => s.project_name).join(', ')}`;

      const { error } = await supabase.functions.invoke('send-client-email', {
        body: {
          to: selectedClient.email,
          subject,
          body: fullBody,
          clientName: selectedClient.name,
        },
      });

      if (error) throw error;

      toast({ title: '✅ Email Sent!', description: `Work forwarded to ${selectedClient.name} at ${selectedClient.email}` });
      
      // Reset form
      setSelectedSubmissionIds([]);
      setCustomMessage('');
      setReviewLink('');
    } catch (error: any) {
      console.error('Send error:', error);
      toast({ title: 'Failed to send', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Selection */}
      <Card className="border-border/60 bg-card/40 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Select Client
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedClientKey} onValueChange={handleClientSelect}>
            <SelectTrigger className="bg-muted/20 border-border/40">
              <SelectValue placeholder="Choose a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => {
                const key = c.email?.toLowerCase() || c.name.toLowerCase();
                return (
                  <SelectItem key={key} value={key}>
                    {c.name} {c.email ? `— ${c.email}` : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {selectedClient && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/10 border border-border/30">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Name</p>
                  <p className="text-xs font-medium">{selectedClient.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Email</p>
                  <p className="text-xs font-medium">{selectedClient.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground">WhatsApp</p>
                  <p className="text-xs font-medium">{selectedClient.whatsapp || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accepted Submissions for Client */}
      {selectedClient && (
        <Card className="border-border/60 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-heading flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" />
                Accepted Submissions
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {selectedSubmissionIds.length} selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <FileCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No accepted submissions found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => toggleSubmission(sub.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedSubmissionIds.includes(sub.id)
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/40 bg-muted/5 hover:bg-muted/10'
                    }`}
                  >
                    <Checkbox
                      checked={selectedSubmissionIds.includes(sub.id)}
                      onCheckedChange={() => toggleSubmission(sub.id)}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium truncate">{sub.project_name}</p>
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          {SERVICE_LABELS[sub.service_type] || sub.service_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>by {sub.designer_name}</span>
                        {sub.client_ref && <span>• Client: {sub.client_ref}</span>}
                        <span>• {format(new Date(sub.created_at), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sub.files_urls && sub.files_urls.length > 0 && (
                        <Badge variant="secondary" className="text-[9px] gap-1">
                          <ImageIcon className="w-3 h-3" />{sub.files_urls.length}
                        </Badge>
                      )}
                      {sub.design_link && (
                        <Badge variant="secondary" className="text-[9px] gap-1">
                          <ExternalLink className="w-3 h-3" />Link
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message & Send */}
      {selectedClient && selectedSubmissionIds.length > 0 && (
        <Card className="border-border/60 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Compose Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Custom Message (Optional)</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal touch... Leave empty for the default message."
                rows={3}
                className="mt-1.5 text-xs bg-muted/20 border-border/40 resize-none"
              />
            </div>
            <div>
              <Label className="text-xs">Review Link (Optional)</Label>
              <Input
                value={reviewLink}
                onChange={(e) => setReviewLink(e.target.value)}
                placeholder="https://drive.google.com/... or any review platform"
                className="mt-1.5 h-9 text-xs bg-muted/20 border-border/40"
              />
            </div>

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-[10px] text-muted-foreground mb-1">Email Preview</p>
              <p className="text-xs"><strong>To:</strong> {selectedClient.name} &lt;{selectedClient.email}&gt;</p>
              <p className="text-xs"><strong>Subject:</strong> Your Design Work is Ready — {submissions.filter(s => selectedSubmissionIds.includes(s.id)).map(s => s.project_name).join(', ')}</p>
              <p className="text-xs mt-1"><strong>Attachments:</strong> {selectedSubmissionIds.length} submission(s) with files & links</p>
            </div>

            <Button
              onClick={handleSend}
              disabled={sending || !selectedClient.email}
              className="w-full text-xs"
            >
              {sending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending...</>
              ) : (
                <><Send className="w-3.5 h-3.5 mr-1.5" />Forward Work to {selectedClient.name}</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ForwardWorkToClient;
