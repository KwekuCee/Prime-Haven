import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Calendar, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { checkRateLimit } from '@/lib/rateLimit';
import { useToast } from '@/hooks/use-toast';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
}

const CATEGORIES = ['all', 'Engineering', 'Opportunities', 'News', 'Design'];

const PostImage = ({ post, className }: { post: BlogPost; className: string }) => (
  <div className={`relative overflow-hidden bg-ink-soft ${className}`}>
    {post.cover_image_url ? (
      <img
        src={post.cover_image_url}
        alt={post.title}
        loading="lazy"
        width={960}
        height={600}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
    ) : (
      <div className="flex h-full w-full items-end bg-ink-soft p-6">
        <span className="font-heading text-5xl font-extrabold text-on-ink/10">PH</span>
      </div>
    )}
  </div>
);

const BlogSection = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const reduceMotion = useReducedMotion();
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
        setPosts(data ?? []);
      } catch {
        setPosts([]);
      }
    };
    void fetchPosts();
  }, []);

  const filteredPosts = posts.filter((post) => activeCategory === 'all' || post.category.toLowerCase() === activeCategory.toLowerCase());
  const featuredPost = filteredPosts[0] ?? posts[0];
  const gridPosts = filteredPosts.slice(1, 4);

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    try {
      const limit = await checkRateLimit('newsletter_subscribe', email);
      if (!limit.allowed) {
        toast({ title: 'Slow down', description: limit.message, variant: 'destructive' });
        return;
      }
      const { error } = await supabase.from('newsletter_subscribers').insert({ email: email.trim().toLowerCase() });
      if (error?.code === '23505') {
        toast({ title: 'Already subscribed', description: 'This email is already on our list.' });
      } else if (error) {
        throw error;
      } else {
        toast({ title: 'Subscribed', description: "You'll receive our latest dispatches." });
        setEmail('');
      }
    } catch (error) {
      toast({ title: 'Unable to subscribe', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubscribing(false);
    }
  };

  if (!posts.length || !featuredPost) return null;

  return (
    <section id="blog" className="border-y border-on-ink/10 bg-ink py-24 text-on-ink sm:py-32">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="grid gap-8 border-b border-on-ink/15 pb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-primary">08 / Field notes</p>
            <h2 className="max-w-3xl font-heading text-5xl font-extrabold leading-[0.98] sm:text-7xl">
              Ideas worth <span className="display-italic text-primary">passing on.</span>
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-relaxed text-on-ink/60 sm:text-base lg:col-span-5 lg:justify-self-end">
            Practical thinking on engineering, product design, African creative economies, and better client collaboration.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-on-ink/10 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filter insights">
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              type="button"
              size="sm"
              variant={activeCategory === category ? 'default' : 'ghost'}
              onClick={() => setActiveCategory(category)}
              className={activeCategory === category ? 'shrink-0 rounded-full' : 'shrink-0 rounded-full text-on-ink/55 hover:bg-on-ink/10 hover:text-on-ink'}
            >
              {category === 'all' ? 'All stories' : category}
            </Button>
          ))}
        </div>

        <motion.article
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: reduceMotion ? 0 : 0.65 }}
          className="group grid border-b border-on-ink/15 py-8 lg:grid-cols-12 lg:py-12"
        >
          <PostImage post={featuredPost} className="aspect-[16/10] lg:col-span-7 lg:aspect-[16/9]" />
          <div className="flex flex-col justify-between pt-7 lg:col-span-5 lg:pl-12 lg:pt-0">
            <div>
              <div className="flex items-center gap-3 text-xs text-on-ink/45">
                <span className="font-bold uppercase text-primary">{featuredPost.category}</span>
                <span aria-hidden="true">/</span>
                <span>{featuredPost.published_at ? format(new Date(featuredPost.published_at), 'MMM d, yyyy') : 'Recent'}</span>
              </div>
              <Link to={`/blog/${featuredPost.slug}`}>
                <h3 className="mt-5 font-heading text-3xl font-extrabold leading-[1.04] transition-colors group-hover:text-primary sm:text-5xl">{featuredPost.title}</h3>
              </Link>
              <p className="mt-5 line-clamp-4 text-sm leading-relaxed text-on-ink/60 sm:text-base">{featuredPost.excerpt}</p>
            </div>
            <Link to={`/blog/${featuredPost.slug}`} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary">
              Read the story <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.article>

        {gridPosts.length > 0 && (
          <div className="grid border-b border-on-ink/15 md:grid-cols-3">
            {gridPosts.map((post, index) => (
              <article key={post.id} className={`group py-8 md:px-7 ${index > 0 ? 'border-t border-on-ink/10 md:border-l md:border-t-0' : ''}`}>
                <PostImage post={post} className="aspect-[16/10]" />
                <div className="mt-5 flex items-center gap-2 text-xs text-on-ink/45">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : 'Recent'}
                </div>
                <Link to={`/blog/${post.slug}`}>
                  <h3 className="mt-3 font-heading text-xl font-bold leading-snug transition-colors group-hover:text-primary">{post.title}</h3>
                </Link>
              </article>
            ))}
          </div>
        )}

        <div className="grid gap-8 border-b border-on-ink/15 py-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Mail className="h-4 w-4" /> Prime Haven Dispatch</div>
            <h3 className="mt-3 font-heading text-2xl font-bold sm:text-3xl">Useful thinking, sent occasionally.</h3>
            <p className="mt-2 text-sm text-on-ink/55">New articles, opportunities, and practical notes. No noise.</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex flex-col gap-3 sm:flex-row lg:col-span-6 lg:justify-end">
            <Input
              type="email"
              aria-label="Email address for insights newsletter"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="h-12 w-full rounded-full border-on-ink/15 bg-on-ink/[0.06] px-5 text-on-ink placeholder:text-on-ink/40 sm:max-w-sm"
            />
            <Button type="submit" disabled={subscribing} className="h-12 rounded-full px-7">
              {subscribing ? 'Subscribing…' : 'Subscribe'}
            </Button>
          </form>
        </div>

        <div className="pt-8 text-right">
          <Button asChild variant="ghost" className="rounded-full text-on-ink hover:bg-on-ink/10 hover:text-on-ink">
            <Link to="/blog">Explore all insights <ArrowRight className="ml-2 h-4 w-4 text-primary" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;