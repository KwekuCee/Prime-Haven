import { useState, useEffect } from 'react';
import { Image, ExternalLink, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface ApprovedWork {
  id: string;
  project_name: string;
  service_type: string;
  points_awarded: number | null;
  created_at: string;
  files_urls: string[] | null;
  client_ref: string | null;
}

interface DesignerPortfolioProps {
  userId: string;
}

const SERVICE_LABELS: Record<string, string> = {
  logo: 'Logo Design', branding: 'Brand Identity', uiux: 'UI/UX Design',
  web: 'Web Design', print: 'Print Design', flyer: 'Flyer Design',
};

const DesignerPortfolio = ({ userId }: DesignerPortfolioProps) => {
  const [works, setWorks] = useState<ApprovedWork[]>([]);

  useEffect(() => {
    if (!userId) return;
    loadApprovedWork();
  }, [userId]);

  const loadApprovedWork = async () => {
    const { data } = await supabase
      .from('submissions')
      .select('id, project_name, service_type, points_awarded, created_at, files_urls, client_ref')
      .eq('designer_id', userId)
      .in('status', ['approved', 'ph_approved'])
      .order('created_at', { ascending: false })
      .limit(12);
    setWorks(data || []);
  };

  if (works.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Image className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <h2 className="text-sm font-heading font-bold">My Portfolio</h2>
            <p className="text-[10px] text-muted-foreground">{works.length} approved works</p>
          </div>
        </div>
        <Link to={`/designer/${userId}`}>
          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 opacity-60 hover:opacity-100">
            View Public Profile <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {works.slice(0, 6).map(work => (
          <div key={work.id} className="group rounded-xl border border-border/40 bg-muted/20 overflow-hidden hover:border-primary/20 transition-all">
            {work.files_urls?.[0] ? (
              <div className="aspect-square bg-muted/30 relative overflow-hidden">
                <img
                  src={work.files_urls[0]}
                  alt={work.project_name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-white text-[10px] font-medium truncate">{work.project_name}</span>
                </div>
              </div>
            ) : (
              <div className="aspect-square bg-muted/30 flex items-center justify-center">
                <Image className="w-6 h-6 text-muted-foreground/40" />
              </div>
            )}
            <div className="p-2">
              <p className="text-[11px] font-medium truncate">{work.project_name}</p>
              <div className="flex items-center justify-between mt-1">
                <Badge variant="outline" className="text-[9px] px-1 py-0">{SERVICE_LABELS[work.service_type] || work.service_type}</Badge>
                <span className="text-[9px] text-primary font-bold">+{work.points_awarded}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DesignerPortfolio;
