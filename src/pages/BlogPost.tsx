import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Tag, ArrowLeft, Mail, Heart, ExternalLink, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';

interface AffiliateLink {
  title: string;
  url: string;
  description?: string;
}

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  category: string;
  published_at: string;
  is_sponsored: boolean;
  sponsor_name: string | null;
  affiliate_links: AffiliateLink[];
}

const categoryColors: Record<string, string> = {
  news: 'bg-primary/20 text-primary',
  opportunities: 'bg-emerald-500/20 text-emerald-400',
  updates: 'bg-blue-500/20 text-blue-400',
  general: 'bg-muted text-muted-foreground',
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      if (data) {
        setPost({
          ...data,
          affiliate_links: Array.isArray(data.affiliate_links) ? (data.affiliate_links as unknown as AffiliateLink[]) : [],
        });
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: email.trim().toLowerCase() });
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already subscribed!' });
        } else throw error;
      } else {
        toast({ title: 'Subscribed!', description: 'You\'ll receive our latest posts.' });
        setEmail('');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-6">
          <div className="max-w-3xl mx-auto animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-64 bg-muted rounded" />
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold mb-4">Post not found</h1>
          <Link to="/blog">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <article className="container mx-auto px-6 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/blog" className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 font-semibold">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
            </Link>

            {/* Sponsored badge */}
            {post.is_sponsored && (
              <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 w-fit">
                <Megaphone className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-500">
                  Sponsored{post.sponsor_name ? ` by ${post.sponsor_name}` : ''}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <Badge className={categoryColors[post.category] || categoryColors.general}>
                <Tag className="w-3 h-3 mr-1" />
                {post.category}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(post.published_at), 'MMMM d, yyyy')}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold mb-6">{post.title}</h1>

            {post.cover_image_url && (
              <div className="rounded-xl overflow-hidden mb-8">
                <img src={post.cover_image_url} alt={post.title} className="w-full object-cover max-h-[500px]" />
              </div>
            )}

            <div
              className="prose prose-invert prose-orange max-w-none [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_a]:text-primary [&_strong]:text-foreground [&_img]:rounded-lg [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />

            {/* Affiliate Links */}
            {post.affiliate_links.length > 0 && (
              <div className="mt-12 p-6 rounded-2xl glass border border-border">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Recommended Products & Tools
                </h3>
                <div className="grid gap-3">
                  {post.affiliate_links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors">{link.title}</p>
                        {link.description && (
                          <p className="text-sm text-muted-foreground">{link.description}</p>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </a>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  * Some links may be affiliate links. We may earn a small commission at no extra cost to you.
                </p>
              </div>
            )}
          </motion.div>

          {/* Support CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8 mt-10 text-center space-y-4"
          >
            <Heart className="w-8 h-8 text-[#FFDD00] mx-auto" />
            <h3 className="text-xl font-bold">Support our work</h3>
            <p className="text-muted-foreground">If you find our content helpful, consider buying us a coffee!</p>
            <a
              href="https://buymeacoffee.com/primehaven"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FFDD00] text-black font-semibold hover:bg-[#FFDD00]/90 transition-colors"
            >
              <Heart className="w-4 h-4 fill-current" />
              Buy us a Coffee
            </a>
          </motion.div>

          {/* Subscribe CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8 mt-6 text-center space-y-4"
          >
            <Mail className="w-8 h-8 text-primary mx-auto" />
            <h3 className="text-xl font-bold">Enjoyed this post?</h3>
            <p className="text-muted-foreground">Subscribe to get notified when we publish new content.</p>
            <form onSubmit={handleSubscribe} className="flex gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={subscribing} className="glow-primary shrink-0">
                {subscribing ? '...' : 'Subscribe'}
              </Button>
            </form>
          </motion.div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
