import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PageResult {
  url: string;
  state: string;
  verdict?: string;
  indexed: boolean;
  issue?: string | null;
  last_crawled?: string | null;
  google_canonical?: string | null;
  user_canonical?: string | null;
}

interface IndexReport {
  id: string;
  created_at: string;
  site_url: string;
  sitemap_url: string | null;
  total_urls: number;
  indexed_count: number;
  issue_count: number;
  pages: PageResult[];
  trigger: string;
}

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : '—';

const SeoIndexHealth = () => {
  const { toast } = useToast();
  const [report, setReport] = useState<IndexReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('seo_index_reports')
      .select('id, created_at, site_url, sitemap_url, total_urls, indexed_count, issue_count, pages, trigger')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast({ title: 'Could not load indexing report', description: error.message, variant: 'destructive' });
    } else {
      setReport((data as IndexReport) ?? null);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const runCheck = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('seo-index-check', {
      body: { force: true },
    });
    setRunning(false);

    if (error) {
      let details = error.message;
      try {
        details = await (error as any).context.text();
      } catch {
        /* keep the original message */
      }
      toast({ title: 'Indexing check failed', description: details, variant: 'destructive' });
      return;
    }
    if ((data as any)?.status === 'selection_required') {
      toast({
        title: 'Multiple Search Console properties',
        description: `Choose one: ${(data as any).candidates.join(', ')}`,
      });
      return;
    }
    toast({ title: 'Indexing check complete', description: 'The latest report has been refreshed.' });
    await fetchLatest();
  };

  const pages = report?.pages ?? [];
  const problems = pages.filter((p) => !p.indexed || p.issue);
  const healthy = pages.filter((p) => p.indexed && !p.issue);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Search indexing health
            </CardTitle>
            <CardDescription>
              Runs automatically every hour and records a fresh report whenever a new version of the
              site is published. Google Search Console is the source of truth.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLatest} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </Button>
            <Button size="sm" onClick={runCheck} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Run check now
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !report ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the latest report…
          </div>
        ) : !report ? (
          <p className="text-sm text-muted-foreground">
            No report yet. Run the check now, or wait for the next automatic run after your next publish.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Pages checked</p>
                <p className="text-2xl font-semibold">{report.total_urls}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Indexed by Google</p>
                <p className="text-2xl font-semibold text-emerald-600">{report.indexed_count}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Needs attention</p>
                <p className={`text-2xl font-semibold ${report.issue_count ? 'text-destructive' : ''}`}>
                  {report.issue_count}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {report.site_url} · sitemap {report.sitemap_url ?? '—'} · last run {formatDate(report.created_at)} (
              {report.trigger})
            </p>

            <Separator />

            {problems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Indexing / crawl problems ({problems.length})
                </p>
                {problems.map((p) => (
                  <div key={p.url} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs break-all hover:underline"
                      >
                        {p.url} <ExternalLink className="inline h-3 w-3" />
                      </a>
                      <Badge variant="destructive">{p.state}</Badge>
                    </div>
                    {p.issue && <p className="mt-1 text-xs text-muted-foreground">{p.issue}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last crawled: {formatDate(p.last_crawled)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {healthy.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Indexed pages ({healthy.length})
                </p>
                {healthy.map((p) => (
                  <div key={p.url} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono truncate">{p.url}</span>
                    <span className="text-muted-foreground shrink-0">{formatDate(p.last_crawled)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SeoIndexHealth;
