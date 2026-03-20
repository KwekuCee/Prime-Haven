import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Send, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import RichTextEditor from './RichTextEditor';
import { Textarea } from '@/components/ui/textarea';

interface AffiliateLink {
  title: string;
  url: string;
  description?: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  category: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  is_sponsored: boolean;
  sponsor_name: string | null;
  affiliate_links: AffiliateLink[];
}

const categories = [
  { value: 'news', label: 'Company News' },
  { value: 'opportunities', label: 'Employment Opportunities' },
  { value: 'updates', label: 'Platform Updates' },
  { value: 'general', label: 'General' },
];

const ManageBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [category, setCategory] = useState('news');
  const [isPublished, setIsPublished] = useState(false);
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorName, setSponsorName] = useState('');
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [uploading, setUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    setPosts((data || []).map(d => ({
      ...d,
      affiliate_links: Array.isArray(d.affiliate_links) ? (d.affiliate_links as unknown as AffiliateLink[]) : [],
    })));
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const openEditor = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt);
      setContent(post.content);
      setCoverPreview(post.cover_image_url || '');
      setCoverFile(null);
      setCategory(post.category);
      setIsPublished(post.is_published);
    } else {
      setEditingPost(null);
      setTitle('');
      setSlug('');
      setExcerpt('');
      setContent('');
      setCoverPreview('');
      setCoverFile(null);
      setCategory('news');
      setIsPublished(false);
    }
    setIsEditorOpen(true);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const uploadCoverImage = async (): Promise<string | null> => {
    if (!coverFile) return coverPreview || null;

    const ext = coverFile.name.split('.').pop();
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('blog-images')
      .upload(path, coverFile, { contentType: coverFile.type });

    if (error) throw new Error(`Cover upload failed: ${error.message}`);

    const { data } = supabase.storage.from('blog-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!title.trim() || !excerpt.trim() || !content.trim()) {
      toast({ title: 'Missing fields', description: 'Title, excerpt, and content are required.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const coverUrl = await uploadCoverImage();
      const finalSlug = slug.trim() || generateSlug(title);
      const postData = {
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt.trim(),
        content: content.trim(),
        cover_image_url: coverUrl,
        category,
        is_published: isPublished,
        published_at: isPublished ? (editingPost?.published_at || new Date().toISOString()) : null,
      };

      if (editingPost) {
        const { error } = await supabase.from('blog_posts').update(postData).eq('id', editingPost.id);
        if (error) throw error;
        toast({ title: 'Post updated' });
      } else {
        const { error } = await supabase.from('blog_posts').insert(postData);
        if (error) throw error;
        toast({ title: 'Post created' });
      }
      setIsEditorOpen(false);
      fetchPosts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Post deleted' });
      fetchPosts();
    }
  };

  const togglePublish = async (post: BlogPost) => {
    const newPublished = !post.is_published;
    const { error } = await supabase
      .from('blog_posts')
      .update({
        is_published: newPublished,
        published_at: newPublished ? (post.published_at || new Date().toISOString()) : post.published_at,
      })
      .eq('id', post.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: newPublished ? 'Published' : 'Unpublished' });
      fetchPosts();
    }
  };

  const sendNewsletter = async (post: BlogPost) => {
    if (!post.is_published) {
      toast({ title: 'Publish first', description: 'Post must be published before sending newsletter.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-blog-newsletter', {
        body: { postId: post.id },
      });
      if (error) throw error;
      toast({ title: 'Newsletter sent!', description: 'Blog post has been emailed to all subscribers.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send newsletter', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-bold">Blog Posts ({posts.length})</CardTitle>
          <Button onClick={() => openEditor()} className="glow-primary">
            <Plus className="w-4 h-4 mr-2" /> New Post
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No blog posts yet. Create your first one!</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map(post => (
                  <TableRow key={post.id}>
                    <TableCell className="font-semibold max-w-[250px] truncate">{post.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{post.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.is_published ? 'default' : 'secondary'}>
                        {post.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(post.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => togglePublish(post)} title={post.is_published ? 'Unpublish' : 'Publish'}>
                        {post.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditor(post)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => sendNewsletter(post)} disabled={sending} title="Send to subscribers">
                        <Send className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete post?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(post.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit Post' : 'New Blog Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold">Title</Label>
              <Input value={title} onChange={e => { setTitle(e.target.value); if (!editingPost) setSlug(generateSlug(e.target.value)); }} placeholder="Post title" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Slug</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="post-url-slug" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Cover Image</Label>
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" onClick={() => coverInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Image
                </Button>
                {coverPreview && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => { setCoverFile(null); setCoverPreview(''); }}>
                    Remove
                  </Button>
                )}
              </div>
              {coverPreview && (
                <img src={coverPreview} alt="Cover preview" className="mt-2 rounded-lg max-h-48 object-cover" />
              )}
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Excerpt</Label>
              <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Brief summary..." className="min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Content</Label>
              <RichTextEditor content={content} onChange={setContent} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <Label className="font-semibold">Publish immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={uploading} className="glow-primary">
              {uploading ? 'Saving...' : editingPost ? 'Update' : 'Create'} {!uploading && 'Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManageBlog;
