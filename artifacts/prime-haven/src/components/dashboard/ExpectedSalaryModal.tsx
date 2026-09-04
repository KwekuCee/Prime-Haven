import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface ExpectedSalaryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    submissions: any[];
    formatCurrency: (val: number) => string;
}

const ExpectedSalaryModal = ({ open, onOpenChange, submissions, formatCurrency }: ExpectedSalaryModalProps) => {
    const { unpaidItems, total } = useMemo(() => {
        if (!submissions) return { unpaidItems: [], total: 0 };
        // Assuming unpaid means it hasn't been explicitly marked as paid 
        // AND it has been approved. If 'paid' doesn't exist, we fallback to just ph_approved items 
        // that have points attached. (we simulate points * mapping if needed).
        const items = submissions.filter(s => s.ph_approved && !s.paid);

        // In your system, salary is points * 0.5 roughly, or maybe 1 pt = $1 or GHS 5.
        // Let's assume standard mapping: points_awarded * 0.5 salary.
        const mapped = items.map(i => ({
            ...i,
            mapped_salary: (i.points_awarded || 0) * 0.5 // Adjust conversion rate as per system settings if needed
        }));

        const totalCalculated = mapped.reduce((acc, curr) => acc + curr.mapped_salary, 0);

        return { unpaidItems: mapped, total: totalCalculated };
    }, [submissions]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] border-primary/20 bg-background/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-heading font-bold text-foreground">Expected Salary Breakdown</DialogTitle>
                    <DialogDescription>
                        A transparent breakdown of your pending payouts based on your approved submissions.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {unpaidItems.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground italic text-sm">
                            No unpaid approved submissions found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Project / Submission</TableHead>
                                    <TableHead className="text-right">Points</TableHead>
                                    <TableHead className="text-right">Est. Salary</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {unpaidItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-xs">{format(new Date(item.created_at), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell className="font-medium text-xs">{item.project_name}</TableCell>
                                        <TableCell className="text-right text-xs text-primary font-bold">{item.points_awarded}</TableCell>
                                        <TableCell className="text-right text-xs text-emerald-500 font-bold">{formatCurrency(item.mapped_salary)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <div className="mt-6 flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Pending</p>
                        <p className="text-xs text-muted-foreground">Will be processed in the next payout cycle</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black font-heading tracking-tight text-emerald-500">{formatCurrency(total)}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ExpectedSalaryModal;
