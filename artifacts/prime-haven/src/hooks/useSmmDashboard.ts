import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SmmCampaign {
    id: string;
    smm_user_id?: string;
    campaign_name: string;
    client_name: string | null;
    contract_id: string | null;
    platforms: string[];
    goal: string | null;
    start_date: string | null;
    end_date: string | null;
    posts_planned?: number | null;
    posts_posted?: number | null;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface SmmPost {
    id: string;
    campaign_id: string;
    platform: string;
    post_type: string;
    caption: string | null;
    media_url: string | null;
    scheduled_at: string | null;
    posted_at: string | null;
    status: string;
    engagement_data: Record<string, number>;
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    reach?: number;
    platform_post_id?: string | null;
    notes: string | null;
    created_at: string;
}

export interface SmmAnalytics {
    id: string;
    campaign_id: string;
    platform: string;
    week_start: string;
    followers_gained: number;
    total_reach: number;
    total_impressions: number;
    total_engagement: number;
    total_posts: number;
    top_post_url: string | null;
}

export interface SmmConnection {
    id: string;
    user_id: string;
    platform: string;
    account_id: string | null;
    account_name: string | null;
    followers_count: number;
    connected_at: string;
    last_synced_at: string | null;
}

export interface SmmStats {
    activeCampaigns: number;
    postsThisMonth: number;
    totalReach: number;
    followersGained: number;
    avgEngagementRate: number;
    pendingSubmissions: number;
}

export interface SmmLiveEvent {
    id: string;
    label: string;
    at: number;
}

export const useSmmDashboard = () => {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<SmmCampaign[]>([]);
    const [posts, setPosts] = useState<SmmPost[]>([]);
    const [analytics, setAnalytics] = useState<SmmAnalytics[]>([]);
    const [connections, setConnections] = useState<SmmConnection[]>([]);
    const [profile, setProfile] = useState<{ full_name: string | null; email_verified: boolean | null } | null>(null);
    const [contracts, setContracts] = useState<{ id: string; title: string; category: string; status: string }[]>([]);
    const [submissions, setSubmissions] = useState<{ id: string; project_name: string; status: string | null; created_at: string; points_awarded: number | null }[]>([]);
    const [loading, setLoading] = useState(true);
    const [realtimeConnected, setRealtimeConnected] = useState(false);
    const [liveEvents, setLiveEvents] = useState<SmmLiveEvent[]>([]);
    const campaignIdsRef = useRef<Set<string>>(new Set());

    const pushLive = useCallback((label: string) => {
        const ev = { id: Math.random().toString(36).slice(2), label, at: Date.now() };
        setLiveEvents(prev => [ev, ...prev].slice(0, 25));
    }, []);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [profileRes, campaignsRes, postsRes, analyticsRes, connectionsRes, contractsRes, submissionsRes] = await Promise.all([
                supabase.from('profiles').select('full_name, email_verified').eq('id', user.id).maybeSingle(),
                (supabase as any).from('smm_campaigns').select('*').eq('smm_user_id', user.id).order('created_at', { ascending: false }),
                (supabase as any).from('smm_campaign_posts').select('*').order('created_at', { ascending: false }),
                (supabase as any).from('smm_analytics').select('*').order('week_start', { ascending: false }),
                (supabase as any).from('smm_platform_connections').select('*').eq('user_id', user.id),
                supabase.from('job_contracts').select('id, title, category, status').eq('category', 'social-media').in('status', ['active', 'in_progress']).order('created_at', { ascending: false }),
                supabase.from('submissions').select('id, project_name, status, created_at, points_awarded').eq('designer_id', user.id).order('created_at', { ascending: false }),
            ]);
            if (profileRes.data) setProfile(profileRes.data);
            const campaignList: SmmCampaign[] = campaignsRes.data || [];
            setCampaigns(campaignList);
            campaignIdsRef.current = new Set(campaignList.map(c => c.id));
            const postList: SmmPost[] = (postsRes.data || []).filter((p: SmmPost) => campaignIdsRef.current.has(p.campaign_id));
            setPosts(postList);
            const analyticsList: SmmAnalytics[] = (analyticsRes.data || []).filter((a: SmmAnalytics) => campaignIdsRef.current.has(a.campaign_id));
            setAnalytics(analyticsList);
            setConnections(connectionsRes.data || []);
            setContracts(contractsRes.data || []);
            setSubmissions(submissionsRes.data || []);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    // Realtime
    useEffect(() => {
        if (!user) return;
        const channel = (supabase as any)
            .channel(`smm-user-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'smm_campaign_posts' }, (payload: any) => {
                const row = payload.new || payload.old;
                if (!row || !campaignIdsRef.current.has(row.campaign_id)) return;
                if (payload.eventType === 'INSERT') {
                    setPosts(p => [payload.new, ...p]);
                    pushLive(`📝 New ${payload.new.platform} ${payload.new.status} post`);
                } else if (payload.eventType === 'UPDATE') {
                    setPosts(p => p.map(x => x.id === payload.new.id ? { ...x, ...payload.new } : x));
                    if (payload.old?.status !== payload.new.status) {
                        const emoji = payload.new.status === 'posted' ? '✅' : payload.new.status === 'scheduled' ? '⏰' : '✏️';
                        pushLive(`${emoji} ${payload.new.platform} post → ${payload.new.status}`);
                    }
                } else if (payload.eventType === 'DELETE') {
                    setPosts(p => p.filter(x => x.id !== payload.old.id));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'smm_analytics' }, (payload: any) => {
                const row = payload.new || payload.old;
                if (!row || !campaignIdsRef.current.has(row.campaign_id)) return;
                if (payload.eventType === 'INSERT') setAnalytics(a => [payload.new, ...a]);
                else if (payload.eventType === 'UPDATE') setAnalytics(a => a.map(x => x.id === payload.new.id ? payload.new : x));
                else if (payload.eventType === 'DELETE') setAnalytics(a => a.filter(x => x.id !== payload.old.id));
                pushLive(`📊 Analytics updated`);
            })
            .subscribe((status: string) => {
                setRealtimeConnected(status === 'SUBSCRIBED');
            });
        return () => { (supabase as any).removeChannel(channel); };
    }, [user, pushLive]);

    // Derived stats
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const postsThisMonth = posts.filter(p => p.status === 'posted' && p.posted_at && new Date(p.posted_at) >= monthStart).length;
    const totalReach = analytics.reduce((s, a) => s + (a.total_reach || 0), 0);
    const followersGained = analytics.reduce((s, a) => s + (a.followers_gained || 0), 0);
    const totalEng = analytics.reduce((s, a) => s + (a.total_engagement || 0), 0);
    const avgEngagementRate = totalReach > 0 ? (totalEng / totalReach) * 100 : 0;
    const stats: SmmStats = {
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        postsThisMonth,
        totalReach,
        followersGained,
        avgEngagementRate,
        pendingSubmissions: submissions.filter(s => s.status === 'pending').length,
    };

    // Mutations
    const createCampaign = async (data: Partial<SmmCampaign>) => {
        if (!user) return null;
        const { data: created, error } = await (supabase as any).from('smm_campaigns').insert({ ...data, smm_user_id: user.id }).select().single();
        if (error) throw error;
        setCampaigns(prev => [created, ...prev]);
        campaignIdsRef.current.add(created.id);
        return created;
    };
    const updateCampaign = async (id: string, data: Partial<SmmCampaign>) => {
        const { error } = await (supabase as any).from('smm_campaigns').update(data).eq('id', id);
        if (error) throw error;
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    };
    const deleteCampaign = async (id: string) => {
        const { error } = await (supabase as any).from('smm_campaigns').delete().eq('id', id);
        if (error) throw error;
        setCampaigns(prev => prev.filter(c => c.id !== id));
        setPosts(prev => prev.filter(p => p.campaign_id !== id));
        campaignIdsRef.current.delete(id);
    };
    const createPost = async (data: Partial<SmmPost>) => {
        const { data: created, error } = await (supabase as any).from('smm_campaign_posts').insert(data).select().single();
        if (error) throw error;
        setPosts(prev => [created, ...prev]);
        return created;
    };
    const updatePost = async (id: string, data: Partial<SmmPost>) => {
        const { error } = await (supabase as any).from('smm_campaign_posts').update(data).eq('id', id);
        if (error) throw error;
        setPosts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    };
    const deletePost = async (id: string) => {
        const { error } = await (supabase as any).from('smm_campaign_posts').delete().eq('id', id);
        if (error) throw error;
        setPosts(prev => prev.filter(p => p.id !== id));
    };
    const logAnalytics = async (data: Partial<SmmAnalytics>) => {
        const { data: created, error } = await (supabase as any).from('smm_analytics').upsert(data, { onConflict: 'campaign_id,platform,week_start' }).select().single();
        if (error) throw error;
        setAnalytics(prev => {
            const exists = prev.findIndex(a => a.id === created.id);
            return exists >= 0 ? prev.map(a => a.id === created.id ? created : a) : [created, ...prev];
        });
    };
    const connectPlatform = async (platform: string, accountName: string) => {
        if (!user) return;
        const { data, error } = await (supabase as any).from('smm_platform_connections').upsert({
            user_id: user.id, platform, account_name: accountName, connected_at: new Date().toISOString(),
        }, { onConflict: 'user_id,platform' }).select().single();
        if (error) throw error;
        setConnections(prev => {
            const i = prev.findIndex(c => c.platform === platform);
            return i >= 0 ? prev.map(c => c.id === data.id ? data : c) : [...prev, data];
        });
    };
    const disconnectPlatform = async (platform: string) => {
        if (!user) return;
        const { error } = await (supabase as any).from('smm_platform_connections').delete().eq('user_id', user.id).eq('platform', platform);
        if (error) throw error;
        setConnections(prev => prev.filter(c => c.platform !== platform));
    };
    const uploadMedia = async (file: File): Promise<string> => {
        if (!user) throw new Error('Not signed in');
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('smm-media').upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data } = await supabase.storage.from('smm-media').createSignedUrl(path, 60 * 60 * 24 * 7);
        return data?.signedUrl || '';
    };

    return {
        loading, profile, campaigns, posts, analytics, connections, stats, contracts, submissions,
        realtimeConnected, liveEvents,
        createCampaign, updateCampaign, deleteCampaign,
        createPost, updatePost, deletePost,
        logAnalytics, connectPlatform, disconnectPlatform, uploadMedia,
        refresh: load,
    };
};
