import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gavel, AlertCircle, CheckCircle2, XCircle, Clock, Eye, MessageSquare, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface Dispute {
    id: string;
    project_name: string;
    designer_name: string;
    client_name: string;
    rejection_reason: string;
    created_at: string;
    status: string;
    points: number;
}

const DisputeMediator = ({
    submissions,
    onResolve
}: {
    submissions: any[],
    onResolve: (id: string, action: 'approve' | 'reject' | 'correction') => void
}) => {
    const disputes = submissions.filter(s => s.status === 'client_rejected').map(s => ({
        id: s.id,
        project_name: s.project_name,
        designer_name: s.designer_name,
        client_name: 'Client', // Placeholder if not directly attached
        rejection_reason: s.rejection_reason || 'No reason provided by client.',
        created_at: s.updated_at || s.created_at,
        status: s.status,
        points: s.points_awarded || 0
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-heading font-bold flex items-center gap-2">
                        Dispute Mediator
                        <Badge variant="destructive" className="animate-pulse">{disputes.length}</Badge>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Review cases where clients have rejected designer submissions</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {disputes.length > 0 ? (
                        disputes.map((d) => (
                            <Card key={d.id} className="bg-card/40 border-border/40 overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="p-4 sm:p-6 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-base">{d.project_name}</h3>
                                                    <Badge variant="outline" className="text-[10px]">CASE #{d.id.slice(0, 8)}</Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-3">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(d.created_at), 'MMM d, HH:mm')}</span>
                                                </div>
                                            </div>
                                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">PENDING MEDIATION</Badge>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-border/40">
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Designer</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                                                        {d.designer_name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-medium">{d.designer_name}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Client Context</p>
                                                <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                                    <span>Client Rejected Submission</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Rejection Statement</p>
                                            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-xs leading-relaxed italic">
                                                "{d.rejection_reason}"
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => { }}>
                                                <Eye className="w-3.5 h-3.5" /> View Submission
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => { }}>
                                                <MessageSquare className="w-3.5 h-3.5" /> Talk to Designer
                                            </Button>
                                            <div className="flex-1" />
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" className="text-xs text-amber-500 hover:bg-amber-500/10" onClick={() => onResolve(d.id, 'correction')}>
                                                    Require Correction
                                                </Button>
                                                <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onResolve(d.id, 'approve')}>
                                                    Overrule: Approve
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="py-20 text-center space-y-4 bg-card/20 rounded-3xl border border-dashed border-border/40">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500/30 mx-auto" />
                            <div className="space-y-1">
                                <p className="font-heading font-bold text-lg">No Active Disputes</p>
                                <p className="text-xs text-muted-foreground">All rejections have been handled or are waiting for corrections.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Gavel className="w-4 h-4 text-primary" />
                                Mediation Guidelines
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                                <li><strong>Overrule:</strong> Use this if the client's rejection is unfair or violates platform terms.</li>
                                <li><strong>Correction:</strong> Default action. Asks the designer to fix issues based on client feedback.</li>
                                <li><strong>Final Rejection:</strong> If the work is subpar and unrecoverable, reject it finally to close the case.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/40 border-border/40">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Mediation History</CardTitle>
                            <CardDescription className="text-[10px]">Last 5 resolved cases</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-[10px] text-center py-6 text-muted-foreground italic">
                                History log integration pending...
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DisputeMediator;
