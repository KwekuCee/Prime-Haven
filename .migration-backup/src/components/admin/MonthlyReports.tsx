import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MonthlyRecord {
  id: string;
  month: number;
  year: number;
  record_data: any;
  created_at: string;
}

export const MonthlyReports = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_records')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      setRecords((data as MonthlyRecord[]) || []);
    } catch (error: any) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1);
    return format(date, 'MMMM');
  };

  const downloadReport = async (record: MonthlyRecord) => {
    setDownloading(record.id);
    try {
      const data = record.record_data;
      const designers = data.designers || [];
      const submissions = data.submissions || [];
      const payments = data.payments || [];

      // Build CSV sections
      let csv = `PRIME HAVEN MONTHLY REPORT - ${getMonthName(record.month)} ${record.year}\n\n`;

      // Designers section
      csv += 'DESIGNERS\n';
      csv += 'Name,Email,Monthly Points,Total Points,Estimated Salary,Professional Title\n';
      designers.forEach((d: any) => {
        csv += `"${d.full_name || ''}","${d.email || ''}",${d.monthly_points || 0},${d.total_points || 0},${d.salary_estimated || 0},"${d.professional_title || ''}"\n`;
      });

      csv += '\nSUBMISSIONS\n';
      csv += 'Project,Designer,Service Type,Status,Points Awarded,Date\n';
      submissions.forEach((s: any) => {
        csv += `"${s.project_name || ''}","${s.designer_name || ''}","${s.service_type || ''}","${s.status || ''}",${s.points_awarded || 0},"${s.created_at || ''}"\n`;
      });

      csv += '\nPAYMENTS\n';
      csv += 'User,Amount,Type,Status,Transaction ID,Date\n';
      payments.forEach((p: any) => {
        csv += `"${p.user_name || ''}",${p.amount || 0},"${p.type || ''}","${p.status || ''}","${p.transaction_id || ''}","${p.created_at || ''}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `primehaven-report-${record.year}-${String(record.month).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({ title: 'Report Downloaded', description: `${getMonthName(record.month)} ${record.year} report downloaded.` });
    } catch (error: any) {
      toast({ title: 'Download Failed', description: error.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-bold">Monthly Reports</CardTitle>
        <CardDescription className="font-medium">
          Download monthly snapshots of all transactions, submissions, and salaries. Reports are auto-generated on the 29th.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {records.length > 0 ? (
          <div className="space-y-3">
            {records.map(record => (
              <div key={record.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{getMonthName(record.month)} {record.year}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      Generated {format(new Date(record.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-medium">
                    {(record.record_data?.designers || []).length} designers
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadReport(record)}
                    disabled={downloading === record.id}
                  >
                    {downloading === record.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    Download CSV
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No reports yet</p>
            <p className="text-sm mt-2">Monthly reports will appear here after the 29th of each month</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
