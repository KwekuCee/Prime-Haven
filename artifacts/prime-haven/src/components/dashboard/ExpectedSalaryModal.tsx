import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useMemo } from 'react';

export interface JobEarning {
    id: string;
    project_id: string | null;
    submission_id: string | null;
    job_price: number | null;
    share_percent: number | null;
    amount: number | null;
    status: string | null;
    created_at: string;
    project_title?: string | null;
}

interface ExpectedSalaryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    earnings: JobEarning[];
    sharePercent: number;
    formatCurrency: (val: number) => string;
}

const ExpectedSalaryModal = ({ open, onOpenChange, earnings, sharePercent, formatCurrency }: ExpectedSalaryModalProps) => {
    const { available, pending } = useMemo(() => {
        const sum = (rows: JobEarning[]) => rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
        return {
            available: sum(earnings.filter((e) => e.status === 'earned' || e.status === 'available')),
            pending: sum(earnings.filter((e) => e.status === 'pending')),
        };
    }, [earnings]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[620px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-heading font-bold">Your earnings</DialogTitle>
                    <DialogDescription>
                        You keep {sharePercent}% of every job you complete. The money moves from pending to
                        available the moment your client approves the work.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {earnings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Nothing here yet. Claim a job from the marketplace to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Job</TableHead>
                                    <TableHead className="text-right">Job value</TableHead>
                                    <TableHead className="text-right">Your {sharePercent}%</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {earnings.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-xs">{format(new Date(item.created_at), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell className="font-medium text-xs">{item.project_title || 'Project'}</TableCell>
                                        <TableCell className="text-right text-xs">{formatCurrency(Number(item.job_price || 0))}</TableCell>
                                        <TableCell className="text-right text-xs font-bold text-emerald-600">{formatCurrency(Number(item.amount || 0))}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className="text-[10px]">
                                                {item.status === 'pending' ? 'Awaiting client approval' : 'Available'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Available to withdraw</p>
                        <p className="text-xl font-black font-heading text-emerald-600">{formatCurrency(available)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Pending client approval</p>
                        <p className="text-xl font-black font-heading text-amber-600">{formatCurrency(pending)}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ExpectedSalaryModal;
