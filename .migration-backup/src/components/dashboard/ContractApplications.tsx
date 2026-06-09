import { useState, useEffect } from 'react';
import { Briefcase, Clock, CheckCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Contract {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: string | null;
  deadline: string | null;
  status: string;
  client_name: string | null;
  created_at: string;
}

interface ContractApplicationsProps {
  userId: string;
  professionalTitle: string | null;
}

const ContractApplications = ({ userId, professionalTitle }: ContractApplicationsProps) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadContracts();
    const stored = localStorage.getItem(`contract_apps_${userId}`);
    if (stored) setAppliedIds(new Set(JSON.parse(stored)));
  }, [userId]);

  const loadContracts = async () => {
    const { data } = await supabase
      .from('job_contracts')
      .select('*')
      .in('status', ['active', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);
    setContracts(data || []);
  };

  const applyToContract = async (contractId: string, contractTitle: string) => {
    try {
      // Notify via edge function
      await supabase.functions.invoke('notify-designer', {
        body: {
          designerId: userId,
          projectName: contractTitle,
          notificationType: 'contract_application',
        },
      });

      const newApplied = new Set(appliedIds);
      newApplied.add(contractId);
      setAppliedIds(newApplied);
      localStorage.setItem(`contract_apps_${userId}`, JSON.stringify([...newApplied]));

      toast({ title: 'Application Sent!', description: `You've applied for "${contractTitle}". Admin has been notified.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to apply. Try again.', variant: 'destructive' });
    }
  };

  const getTimeRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff < 0) return 'Overdue';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Due today';
    return `${days}d left`;
  };

  if (contracts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <h2 className="text-sm font-heading font-bold">Available Contracts</h2>
          <p className="text-[10px] text-muted-foreground">Apply to claim work</p>
        </div>
      </div>

      <div className="space-y-2">
        {contracts.slice(0, 5).map(contract => {
          const applied = appliedIds.has(contract.id);
          const timeLeft = getTimeRemaining(contract.deadline);

          return (
            <div key={contract.id} className={`p-3 rounded-xl border transition-colors ${applied ? 'border-primary/20 bg-primary/5' : 'border-border/40 hover:border-border/60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{contract.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{contract.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{contract.category}</Badge>
                    {contract.budget && <span className="text-[10px] font-medium text-emerald-500">{contract.budget}</span>}
                    {timeLeft && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{timeLeft}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={applied ? 'outline' : 'default'}
                  className="h-7 text-[10px] shrink-0"
                  disabled={applied}
                  onClick={() => applyToContract(contract.id, contract.title)}
                >
                  {applied ? (
                    <><CheckCircle className="w-3 h-3 mr-1" />Applied</>
                  ) : (
                    <><Send className="w-3 h-3 mr-1" />Apply</>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContractApplications;
