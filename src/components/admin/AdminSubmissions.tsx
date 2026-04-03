import { useState, useMemo, useEffect } from 'react';
import { 
  FileCheck, Search, Download, CheckCircle, XCircle, Eye, 
  Settings, Edit, Star, ThumbsUp, AlertTriangle, Trash2, ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface Submission {
  id: string;
  designer_id: string;
  project_name: string;
  service_type: string;
  status: string;
  points_awarded: number;
  created_at: string;
  updated_at: string;
  final_approval_date: string;
  designer_name: string;
  designer_email: string;
  client_ref: string;
  files_urls: string[];
  ph_approved: boolean;
  client_accepted: boolean;
  ph_approved_at: string | null;
  client_accepted_at: string | null;
  parent_submission_id?: string | null;
  rejection_reason?: string | null;
  design_link?: string | null;
}

interface AdminSubmissionsProps {
  submissions: Submission[];
  systemSettings: any;
  onPHApproval: (id: string) => void;
  onClientAcceptance: (id: string) => void;
  onReject: (submission: Submission) => void;
  onClientReject: (submission: Submission) => void;
  onCorrectionRequest: (submission: Submission) => void;
  onRevoke: (id: string) => void;
  onViewFiles: (submission: Submission) => void;
  onPreviewLink: (url: string) => void;
  onExport: () => void;
}

const ITEMS_PER_PAGE = 10;

const AdminSubmissions = ({
  submissions,
  systemSettings,
  onPHApproval,
  onClientAcceptance,
  onReject,
  onClientReject,
  onCorrectionRequest,
  onRevoke,
  onViewFiles,
  onPreviewLink,
  onExport,
}: AdminSubmissionsProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = submissions;
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'pending') result = result.filter(s => !s.ph_approved && s.status !== 'rejected');
      else if (selectedStatus === 'ph_approved') result = result.filter(s => s.ph_approved && !s.client_accepted);
      else if (selectedStatus === 'approved') result = result.filter(s => s.client_accepted);
      else result = result.filter(s => s.status === selectedStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.project_name.toLowerCase().includes(q) || s.designer_name.toLowerCase().includes(q) || s.service_type.toLowerCase().includes(q));
    }
    return result;
  }, [submissions, selectedStatus, searchQuery]);

  useEffect(() => { setPage(1); }, [selectedStatus, searchQuery]);

  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card/50">
        <div className="p-4 sm:p-5 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Submissions ({submissions.length})</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Review and manage designer work</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <Input placeholder="Search..." className="pl-8 h-8 text-sm w-full sm:w-44" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ph_approved">PH Approved</SelectItem>
                  <SelectItem value="approved">Client Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="correction_requested">Corrections</SelectItem>
                  <SelectItem value="client_rejected">Client Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onExport}>
                <Download className="w-3.5 h-3.5 mr-1" />Export
              </Button>
            </div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">Project</TableHead>
                    <TableHead className="text-xs font-semibold">Designer</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">PH</TableHead>
                    <TableHead className="text-xs font-semibold">Client</TableHead>
                    <TableHead className="text-xs font-semibold">Points</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((s) => (
                    <TableRow key={s.id} className="group">
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1.5">
                          {s.project_name}
                          {s.parent_submission_id && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/40 px-1 py-0">Fix</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{s.designer_name}</div>
                        <div className="text-[11px] text-muted-foreground">{s.designer_email}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] font-medium">{s.service_type}</Badge></TableCell>
                      <TableCell>
                        {s.ph_approved ? <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-medium"><CheckCircle className="w-3 h-3" />Yes</span>
                          : s.status === 'rejected' ? <span className="text-destructive text-xs font-medium">No</span>
                          : <span className="text-amber-500 text-xs font-medium">Pending</span>}
                      </TableCell>
                      <TableCell>
                        {s.client_accepted ? <span className="inline-flex items-center gap-1 text-primary text-xs font-medium"><Star className="w-3 h-3" />Yes</span>
                          : s.ph_approved ? <span className="text-blue-500 text-xs font-medium">Waiting</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell><span className="font-bold text-primary text-sm">{s.points_awarded || 0}</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'MMM d')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          {s.design_link && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onPreviewLink(s.design_link!)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {s.status !== 'rejected' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Settings className="w-3.5 h-3.5" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {s.files_urls?.length > 0 && (
                                  <DropdownMenuItem onClick={() => onViewFiles(s)} className="text-xs">
                                    <ImageIcon className="w-3.5 h-3.5 mr-2" />View Files ({s.files_urls.length})
                                  </DropdownMenuItem>
                                )}
                                {!s.ph_approved && !s.client_accepted && (
                                  <DropdownMenuItem onClick={() => onPHApproval(s.id)} className="text-xs text-emerald-500">
                                    <CheckCircle className="w-3.5 h-3.5 mr-2" />PH Approve (+{s.parent_submission_id ? 0 : (systemSettings.ph_approval_points?.value || 15)} pts)
                                  </DropdownMenuItem>
                                )}
                                {s.ph_approved && !s.client_accepted && s.status !== 'client_rejected' && (
                                  <DropdownMenuItem onClick={() => onClientAcceptance(s.id)} className="text-xs text-primary">
                                    <ThumbsUp className="w-3.5 h-3.5 mr-2" />Client Accept
                                  </DropdownMenuItem>
                                )}
                                {(s.status === 'client_rejected' || (s.ph_approved && !s.client_accepted) || s.status === 'correction_requested') && (
                                  <DropdownMenuItem onClick={() => onCorrectionRequest(s)} className="text-xs text-amber-500">
                                    <Edit className="w-3.5 h-3.5 mr-2" />Request Correction
                                  </DropdownMenuItem>
                                )}
                                {s.ph_approved && !s.client_accepted && s.status !== 'client_rejected' && (
                                  <DropdownMenuItem onClick={() => onClientReject(s)} className="text-xs text-destructive">
                                    <XCircle className="w-3.5 h-3.5 mr-2" />Client Reject
                                  </DropdownMenuItem>
                                )}
                                {!s.client_accepted && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onReject(s)} className="text-xs text-destructive">
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {(s.points_awarded || 0) > 0 && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onRevoke(s.id)} className="text-xs text-destructive font-semibold">
                                      <AlertTriangle className="w-3.5 h-3.5 mr-2" />Revoke (−{s.points_awarded} pts)
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border/30">
              {paged.map((s) => (
                <div key={s.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        {s.project_name}
                        {s.parent_submission_id && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/40 px-1 py-0">Fix</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.designer_name}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.design_link && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onPreviewLink(s.design_link!)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {s.status !== 'rejected' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Settings className="w-3.5 h-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {s.files_urls?.length > 0 && <DropdownMenuItem onClick={() => onViewFiles(s)} className="text-xs"><ImageIcon className="w-3.5 h-3.5 mr-2" />View Files</DropdownMenuItem>}
                            {!s.ph_approved && !s.client_accepted && <DropdownMenuItem onClick={() => onPHApproval(s.id)} className="text-xs text-emerald-500"><CheckCircle className="w-3.5 h-3.5 mr-2" />PH Approve</DropdownMenuItem>}
                            {s.ph_approved && !s.client_accepted && s.status !== 'client_rejected' && <DropdownMenuItem onClick={() => onClientAcceptance(s.id)} className="text-xs text-primary"><ThumbsUp className="w-3.5 h-3.5 mr-2" />Client Accept</DropdownMenuItem>}
                            {!s.client_accepted && <DropdownMenuItem onClick={() => onReject(s)} className="text-xs text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Reject</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{s.service_type}</Badge>
                    {s.ph_approved ? <span className="text-emerald-500 text-[10px] font-medium">✓ PH</span>
                      : s.status === 'rejected' ? <span className="text-destructive text-[10px] font-medium">Rejected</span>
                      : <span className="text-amber-500 text-[10px] font-medium">Pending</span>}
                    {s.client_accepted && <span className="text-primary text-[10px] font-medium">✓ Client</span>}
                    <span className="text-primary font-bold text-xs ml-auto">{s.points_awarded || 0} pts</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border/50">
                <p className="text-[11px] text-muted-foreground">
                  {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No submissions found</p>
            <p className="text-xs mt-1">Try changing your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSubmissions;
