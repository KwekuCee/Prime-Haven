import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Tag, Mail } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const { toast } = useToast();

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

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Link to={`/blog/${post.slug}`}>
                <Card className="group glass glass-hover h-full overflow-hidden cursor-pointer">
                  {post.cover_image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className={categoryColors[post.category] || categoryColors.general}>
                        <Tag className="w-3 h-3 mr-1" />
                        {post.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(post.published_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center text-primary text-sm font-semibold pt-2">
                      Read more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
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
          <form onSubmit={handleSubscribe} className="flex gap-3 w-full md:w-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-w-[250px]"
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
