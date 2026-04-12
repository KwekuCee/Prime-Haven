import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Calendar, Tag, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string;
  published_at: string;
}

const categoryColors: Record<string, string> = {
  news: 'bg-primary/20 text-primary',
  opportunities: 'bg-emerald-500/20 text-emerald-400',
  updates: 'bg-blue-500/20 text-blue-400',
  general: 'bg-muted text-muted-foreground',
};

const BlogSection = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const { toast } = useToast();

  const nextPost = () => {
    setCurrentIndex((prev) => (prev + 1) % posts.length);
  };

  const prevPost = () => {
    setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length);
  };

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, category, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(3);
      if (data) setPosts(data);
    };
    fetchPosts();
  }, []);

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
          toast({ title: 'Already subscribed!', description: 'This email is already on our list.' });
        } else throw error;
      } else {
        toast({ title: 'Subscribed!', description: 'You\'ll receive our latest blog posts via email.' });
        setEmail('');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubscribing(false);
    }
  };

  if (posts.length === 0) return null;

  return (
    <section id="blog" className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary font-semibold">
            Blog & News
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Latest from <span className="text-gradient">Prime Haven</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Stay updated with our latest news, opportunities, and insights from the creative industry.
          </p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto mb-16 z-10">

          {/* Glassmorphic Carousel Track Container */}
          <div className="relative overflow-hidden rounded-[2rem] glass border border-primary/20 bg-card/30 backdrop-blur-xl p-6 sm:p-10 shadow-none hover:shadow-[0_0_20px_hsl(var(--primary)/10)] transition-shadow duration-500">

            {/* The Arrows */}
            {posts.length > 1 && (
              <>
                <div className="absolute top-1/2 -translate-y-1/2 left-2 sm:left-4 z-20">
                  <Button variant="ghost" size="icon" onClick={prevPost} className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md border border-primary/20 hover:bg-primary/20 hover:text-primary transition-all">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>

                <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-4 z-20">
                  <Button variant="ghost" size="icon" onClick={nextPost} className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md border border-primary/20 hover:bg-primary/20 hover:text-primary transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </>
            )}

            {/* Slider track */}
            <div className="overflow-hidden px-8 sm:px-12">
              <motion.div
                className="flex"
                animate={{ x: `-${currentIndex * 100}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                {posts.map((post) => (
                  <div key={post.id} className="w-full shrink-0 px-2">
                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-center">

                      {/* Compact Thumbnail */}
                      <div className="w-full sm:w-1/2 aspect-video rounded-2xl overflow-hidden glass border border-primary/20 relative group">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Tag className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Compact Typography */}
                      <div className="w-full sm:w-1/2 flex flex-col justify-center text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] tracking-wider">{post.category}</Badge>
                          <span className="text-xs font-medium text-muted-foreground"><Calendar className="w-3 h-3 inline mr-1" />{format(new Date(post.published_at), 'MMM d, yy')}</span>
                        </div>
                        <Link to={`/blog/${post.slug}`} className="cursor-pointer group">
                          <h4 className="text-xl sm:text-2xl font-heading font-bold mb-3 group-hover:text-primary transition-colors leading-snug line-clamp-2">{post.title}</h4>
                        </Link>
                        <p className="text-muted-foreground leading-relaxed text-sm line-clamp-3 mb-6">
                          {post.excerpt}
                        </p>
                        <Link to={`/blog/${post.slug}`}>
                          <Button size="sm" variant="primary" className="rounded-full shadow-[0_0_15px_hsl(var(--primary)/30)] px-6">
                            Read <ArrowRight className="w-4 h-4 ml-1.5" />
                          </Button>
                        </Link>
                      </div>

                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Newsletter + View All */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="flex-1 space-y-2">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              Subscribe to our Newsletter
            </h3>
            <p className="text-muted-foreground">
              Get the latest posts, opportunities, and updates delivered straight to your inbox.
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full sm:min-w-[250px]"
            />
            <Button type="submit" variant="default" disabled={subscribing} className="glow-primary shrink-0">
              {subscribing ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        </motion.div>

        <div className="text-center mt-10">
          <Link to="/blog">
            <Button variant="outline" size="lg" className="font-semibold">
              View All Posts <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
