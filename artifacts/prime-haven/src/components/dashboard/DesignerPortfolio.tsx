import { useState, useEffect } from 'react';
import { Image as ImageIcon, ExternalLink, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { fetchPortfolioMedia, previewUrl } from '@/lib/portfolioMedia';

interface ApprovedWork {
  id: string;
  project_name: string;
  service_type: string;
  points_awarded: number | null;
  created_at: string;
  files_urls: string[] | null;
  design_link: string | null;
  status: string | null;
}

interface DesignerPortfolioProps {
  userId: string;
}

const SERVICE_LABELS: Record<string, string> = {
  logo: 'Logo Design', branding: 'Brand Identity', uiux: 'UI/UX Design',
  web: 'Web Design', print: 'Print Design', flyer: 'Flyer Design',
};

const PUBLIC_STATUSES = ['approved', 'ph_approved', 'client_accepted'];

const DesignerPortfolio = ({ userId }: DesignerPortfolioProps) => {
  const [works, setWorks] = useState<ApprovedWork[]>([]);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, project_name, service_type, points_awarded, created_at, files_urls, design_link, status')
        .eq('designer_id', userId)
        .in('status', PUBLIC_STATUSES)
        .order('created_at', { ascending: false })
        .limit(60);
      if (!active) return;
      setWorks((data || []) as ApprovedWork[]);
      const resolved = await fetchPortfolioMedia(userId);
      if (active) setMedia(resolved);
    };

    load();
    return () => { active = false; };
  }, [userId]);

  if (works.length === 0) return null;

  const visible = showAll ? works : works.slice(0, 6);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-heading font-bold">My Portfolio</h2>
            <p className="text-[10px] text-muted-foreground">{works.length} submitted works published</p>
          </div>
        </div>
        <Link to={`/designer/${userId}`}>
          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 opacity-60 hover:opacity-100">
            View Public Profile <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visible.map(work => {
          const img = previewUrl(work.files_urls, media);
          return (
            <div key={work.id} className="group rounded-xl border border-border/40 bg-muted/20 overflow-hidden hover:border-primary/30 transition-all">
              <div className="aspect-square bg-muted/30 relative overflow-hidden flex items-center justify-center">
                {img ? (
                  <img
                    src={img}
                    alt={work.project_name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="p-2">
                <p className="text-[11px] font-medium truncate">{work.project_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{SERVICE_LABELS[work.service_type] || work.service_type}</Badge>
                  <span className="text-[9px] text-primary font-bold">+{work.points_awarded ?? 0}</span>
                </div>
                {work.design_link && (
                  <a href={work.design_link} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[9px] text-primary font-bold">
                    <Link2 className="w-2.5 h-2.5" /> Live design
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {works.length > 6 && (
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider" onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Show less' : `Show all ${works.length} works`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DesignerPortfolio;
