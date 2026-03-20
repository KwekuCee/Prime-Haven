ALTER TABLE public.blog_posts 
ADD COLUMN is_sponsored boolean NOT NULL DEFAULT false,
ADD COLUMN sponsor_name text DEFAULT NULL,
ADD COLUMN affiliate_links jsonb DEFAULT '[]'::jsonb;