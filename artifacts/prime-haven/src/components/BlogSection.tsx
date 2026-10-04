import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Tag, Mail, Clock, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { checkRateLimit } from '@/lib/rateLimit';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
  author_name?: string;
  read_time?: string;
}

const BlogSection = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data } = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, cover_image_url, category, published_at')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(6);

        if (data && data.length > 0) {
          const formatted = data.map((p) => ({
            ...p,
            author_name: 'Prime Haven Staff',
            read_time: '4 min read',
          }));
          setPosts(formatted);
        } else {
          setPosts([]);
        }
      } catch (err) {
        setPosts([]);
      }
    };
    fetchPosts();
  }, []);

  const categories = ['all', 'Engineering', 'Opportunities', 'News', 'Design'];

  const filteredPosts = posts.filter((post) => {
    if (activeCategory === 'all') return true;
    return post.category.toLowerCase() === activeCategory.toLowerCase();
  });

  const featuredPost = filteredPosts[0] || posts[0];
  const gridPosts = filteredPosts.slice(1);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    try {
      const limit = await checkRateLimit('newsletter_subscribe', email);
      if (!limit.allowed) {
        toast({ title: 'Slow down', description: limit.message, variant: 'destructive' });
        return;
      }
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: email.trim().toLowerCase() });
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already subscribed!', description: 'This email is already on our list.' });
        } else throw error;
      } else {
        toast({ title: 'Subscribed!', description: "You'll receive our latest blog posts and client dispatches." });
        setEmail('');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <section id="blog" className="py-24 relative overflow-hidden bg-[#07090e] text-white border-y border-white/10">
      {/* Background subtle radial ambient glows */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-3xl mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-bold uppercase tracking-wider text-primary mb-4">
            <Newspaper className="w-3.5 h-3.5" />
            Agency Dispatches &amp; Stories
          </div>
          <h2 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight text-white leading-[1.1]">
            Our <span className="display-italic text-primary">Insights</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
            Practical thinking on engineering, product design, African creative economies, and client collaboration.
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-10 pb-2 border-b border-white/[0.08]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-primary text-white shadow-[0_0_20px_hsla(13,100%,58%,0.4)]'
                  : 'bg-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.1]'
              }`}
            >
              {cat === 'all' ? 'All Stories' : cat}
            </button>
          ))}
          <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Updated weekly from Accra</span>
          </div>
        </div>

        {/* Featured Story (Lead Card) */}
        {featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-10 rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden backdrop-blur-xl group hover:border-white/20 transition-all duration-300"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              <div className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto overflow-hidden bg-black/40 min-h-[280px]">
                {featuredPost.cover_image_url ? (
                  <img
                    src={featuredPost.cover_image_url}
                    alt={featuredPost.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-zinc-900 flex items-center justify-center">
                    <Tag className="w-12 h-12 text-zinc-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-transparent to-transparent lg:hidden" />
              </div>

              <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mb-4">
                    <span className="px-2.5 py-1 rounded-md bg-primary/20 text-primary font-semibold text-[11px] tracking-wide">
                      {featuredPost.category}
                    </span>
                    <span>·</span>
                    <span>
                      {featuredPost.published_at ? format(new Date(featuredPost.published_at), 'MMMM d, yyyy') : 'Recently'}
                    </span>
                    <span>·</span>
                    <span>{featuredPost.read_time || '4 min read'}</span>
                  </div>

                  <Link to={`/blog/${featuredPost.slug}`}>
                    <h3 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-white group-hover:text-primary transition-colors leading-[1.2]">
                      {featuredPost.title}
                    </h3>
                  </Link>

                  <p className="mt-4 text-sm text-zinc-400 leading-relaxed line-clamp-3">
                    {featuredPost.excerpt}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-medium">
                    By {featuredPost.author_name || 'Prime Haven'}
                  </span>
                  <Link
                    to={`/blog/${featuredPost.slug}`}
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform"
                  >
                    Read Story <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Secondary Grid showing different blog & news stories */}
        {gridPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {gridPosts.map((post, idx) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                viewport={{ once: true }}
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/20 p-6 backdrop-blur-xl transition-all duration-300"
              >
                <div>
                  <div className="aspect-[16/10] rounded-xl overflow-hidden mb-5 bg-black/40 relative">
                    {post.cover_image_url ? (
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <Tag className="w-8 h-8 text-zinc-700" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-primary font-semibold text-[10px] tracking-wide border border-white/10">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-2.5">
                    <Calendar className="w-3 h-3 text-primary" />
                    <span>
                      {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : 'Recent'}
                    </span>
                    <span>·</span>
                    <span>{post.read_time || '4 min'}</span>
                  </div>

                  <Link to={`/blog/${post.slug}`}>
                    <h4 className="text-lg font-heading font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h4>
                  </Link>

                  <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">{post.author_name || 'Staff'}</span>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 group-hover:text-primary transition-colors"
                  >
                    Read <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {/* Newsletter Banner in Dark Glass */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] p-8 md:p-12 backdrop-blur-2xl flex flex-col lg:flex-row items-center justify-between gap-8"
        >
          <div className="max-w-xl space-y-2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <Mail className="w-4 h-4" />
              Direct to your inbox
            </div>
            <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
              Subscribe to Prime Haven Dispatches
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Curated essays on African digital infrastructure, open freelance contracts, and software trends. Zero spam.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Input
              type="email"
              aria-label="Email address for insights newsletter"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full sm:min-w-[280px] bg-black/50 border-white/15 text-white placeholder:text-zinc-500 rounded-full h-11 px-5 focus-visible:ring-primary"
            />
            <Button
              type="submit"
              disabled={subscribing}
              className="h-11 px-7 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-all shadow-[0_0_20px_hsla(13,100%,58%,0.3)] shrink-0"
            >
              {subscribing ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        </motion.div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link to="/blog">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full border-white/20 bg-white/[0.04] text-white hover:bg-white/[0.1] hover:border-white/40 font-semibold px-8"
            >
              Explore All News &amp; Articles <ArrowRight className="w-4 h-4 ml-2 text-primary" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
