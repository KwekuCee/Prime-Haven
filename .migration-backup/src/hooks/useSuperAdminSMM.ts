import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SmmManager {
  user_id: string;
  full_name: string | null;
  email: string | null;
  professional_title: string | null;
  is_active: boolean;
  last_sign_in: string | null;
}

export interface AdminCampaign {
  id: string;
  smm_user_id: string;
  campaign_name: string;
  client_name: string | null;
  platforms: string[];
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  posts_planned?: number | null;
  posts_posted?: number | null;
  created_at: string;
}

export interface AdminPost {
  id: string;
  campaign_id: string;
  platform: string;
  status: string;
  posted_at: string | null;
  caption: string | null;
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  created_at: string;
}

export interface AdminAnalytics {
  id: string;
  campaign_id: string;
  platform: string;
  week_start: string;
  total_reach: number;
  total_engagement: number;
  followers_gained: number;
  total_posts: number;
}

export interface AdminLiveEvent {
  id: string;
  text: string;
  at: number;
}

export interface SmmSubmission {
  id: string;
  designer_id: string;
  designer_name: string;
  project_name: string;
  status: string;
  points_awarded: number | null;
  created_at: string;
}

export const useSuperAdminSMM = () => {
  const [managers, setManagers] = useState<SmmManager[]>([]);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics[]>([]);
  const [submissions, setSubmissions] = useState<SmmSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<AdminLiveEvent[]>([]);
  const managersRef = useRef<Map<string, SmmManager>>(new Map());
  const campaignsRef = useRef<Map<string, AdminCampaign>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detailsRes, campaignsRes, postsRes, analyticsRes] = await Promise.all([
        (supabase as any).from('designer_details').select('user_id, professional_title').eq('professional_title', 'Social Media Manager'),
        (supabase as any).from('smm_campaigns').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('smm_campaign_posts').select('*').order('created_at', { ascending: false }).limit(2000),
        (supabase as any).from('smm_analytics').select('*').order('week_start', { ascending: false }).limit(2000),
      ]);

      const userIds = (detailsRes.data || []).map((d: any) => d.user_id);
      let profileMap: Record<string, { full_name: string | null; email: string | null; is_active: boolean }> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, is_active')
          .in('id', userIds);
        profileMap = (profiles || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
      }

      const mgrs: SmmManager[] = (detailsRes.data || []).map((d: any) => ({
        user_id: d.user_id,
        full_name: profileMap[d.user_id]?.full_name ?? null,
        email: profileMap[d.user_id]?.email ?? null,
        professional_title: d.professional_title,
        is_active: profileMap[d.user_id]?.is_active ?? false,
        last_sign_in: null,
      }));
      setManagers(mgrs);
      managersRef.current = new Map(mgrs.map(m => [m.user_id, m]));

      const camps: AdminCampaign[] = campaignsRes.data || [];
      setCampaigns(camps);
      campaignsRef.current = new Map(camps.map(c => [c.id, c]));

      setPosts(postsRes.data || []);
      setAnalytics(analyticsRes.data || []);

      // Submissions from SMM users only
      if (userIds.length) {
        const { data: subs } = await supabase
          .from('submissions')
          .select('id, designer_id, project_name, status, points_awarded, created_at')
          .in('designer_id', userIds)
          .order('created_at', { ascending: false })
          .limit(200);
        setSubmissions((subs || []).map((s: any) => ({
          ...s,
          designer_name: profileMap[s.designer_id]?.full_name || 'Unknown',
        })));
      } else {
        setSubmissions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = (supabase as any)
      .channel('admin-smm-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'smm_campaign_posts' }, (payload: any) => {
        const row = payload.new || payload.old;
        if (!row) return;
        if (payload.eventType === 'INSERT') setPosts(p => [payload.new, ...p].slice(0, 2000));
        else if (payload.eventType === 'UPDATE') setPosts(p => p.map(x => x.id === payload.new.id ? { ...x, ...payload.new } : x));
        else if (payload.eventType === 'DELETE') setPosts(p => p.filter(x => x.id !== payload.old.id));

        const campaign = campaignsRef.current.get(row.campaign_id);
        const manager = campaign ? managersRef.current.get(campaign.smm_user_id) : null;
        const who = manager?.full_name || 'Someone';
        const event = payload.eventType === 'INSERT' ? 'created' : payload.eventType === 'UPDATE' ? row.status : 'removed';
        setLiveEvents(prev => [{
          id: Math.random().toString(36).slice(2),
          text: `${who} · ${row.platform} post ${event} · ${campaign?.campaign_name || 'campaign'}`,
          at: Date.now(),
        }, ...prev].slice(0, 50));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'smm_campaigns' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setCampaigns(c => [payload.new, ...c]);
          campaignsRef.current.set(payload.new.id, payload.new);
        } else if (payload.eventType === 'UPDATE') {
          setCampaigns(c => c.map(x => x.id === payload.new.id ? payload.new : x));
          campaignsRef.current.set(payload.new.id, payload.new);
        } else if (payload.eventType === 'DELETE') {
          setCampaigns(c => c.filter(x => x.id !== payload.old.id));
          campaignsRef.current.delete(payload.old.id);
        }
      })
      .subscribe((status: string) => setRealtimeConnected(status === 'SUBSCRIBED'));
    return () => { (supabase as any).removeChannel(channel); };
  }, []);

  const approveSubmission = async (id: string, points: number) => {
    const { error } = await supabase.from('submissions').update({ status: 'approved', points_awarded: points }).eq('id', id);
    if (error) throw error;
    setSubmissions(p => p.map(s => s.id === id ? { ...s, status: 'approved', points_awarded: points } : s));
  };
  const rejectSubmission = async (id: string) => {
    const { error } = await supabase.from('submissions').update({ status: 'rejected' }).eq('id', id);
    if (error) throw error;
    setSubmissions(p => p.map(s => s.id === id ? { ...s, status: 'rejected' } : s));
  };

  return {
    loading, managers, campaigns, posts, analytics, submissions,
    realtimeConnected, liveEvents,
    approveSubmission, rejectSubmission, refresh: load,
  };
};
