export const SITE_URL = 'https://primehaven.tech';

interface SeoProps {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  image?: string | null;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

/**
 * Per-route head metadata. React 19 hoists <title>, <meta> and <link>
 * rendered anywhere in the tree into <head>, so no helmet library is needed.
 */
const Seo = ({ title, description, path, type = 'website', image, jsonLd, noindex }: SeoProps) => {
  const url = `${SITE_URL}${path}`;
  const absoluteImage = image
    ? image.startsWith('http')
      ? image
      : `${SITE_URL}${image}`
    : null;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      {absoluteImage && <meta property="og:image" content={absoluteImage} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
};

export default Seo;
