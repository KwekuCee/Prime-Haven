import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SmmCampaign {
    id: string;
    campaign_name: string;
    client_name: string | null;
    contract_id: string | null;
    platforms: string[];
    goal: string | null;
    start_date: string | null;
    end_date: string | null;
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

export interface SmmStats {
    activeCampaigns: number;
    totalPosts: number;
    totalReach: number;
    pendingSubmissions: number;
}

export const useSmmDashboard = () => {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<SmmCampaign[]>([]);
    const [posts, setPosts] = useState<SmmPost[]>([]);
    const [analytics, setAnalytics] = useState<SmmAnalytics[]>([]);
    const [stats, setStats] = useState<SmmStats>({ activeCampaigns: 0, totalPosts: 0, totalReach: 0, pendingSubmissions: 0 });
    const [profile, setProfile] = useState<{ full_name: string; email_verified: boolean } | null>(null);
    const [contracts, setContracts] = useState<{ id: string; title: string; category: string; status: string }[]>([]);
    const [submissions, setSubmissions] = useState<{ id: string; project_name: string; status: string; created_at: string; points_awarded: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [profileRes, campaignsRes, postsRes, analyticsRes, contractsRes, submissionsRes] = await Promise.all([
                supabase.from('profiles').select('full_name, email_verified').eq('id', user.id).maybeSingle(),
                (supabase as any).from('smm_campaigns').select('*').eq('smm_user_id', user.id).order('created_at', { ascending: false }),
                (supabase as any).from('smm_campaign_posts').select('*').order('created_at', { ascending: false }),
                (supabase as any).from('smm_analytics').select('*').order('week_start', { ascending: false }),
                supabase.from('job_contracts').select('id, title, category, status').eq('category', 'social-media').in('status', ['active', 'in_progress']).order('created_at', { ascending: false }),
                supabase.from('submissions').select('id, project_name, status, created_at, points_awarded').eq('designer_id', user.id).order('created_at', { ascending: false }),
            ]);
            if (profileRes.data) setProfile(profileRes.data);
            const campaignList: SmmCampaign[] = campaignsRes.data || [];
            setCampaigns(campaignList);
            const postList: SmmPost[] = postsRes.data || [];
            setPosts(postList);
            setAnalytics(analyticsRes.data || []);
            setContracts(contractsRes.data || []);
            setSubmissions(submissionsRes.data || []);
            const campaignIds = new Set(campaignList.map(c => c.id));
            const myPosts = postList.filter(p => campaignIds.has(p.campaign_id));
            const myAnalytics: SmmAnalytics[] = (analyticsRes.data || []).filter((a: SmmAnalytics) => campaignIds.has(a.campaign_id));
            setStats({
                activeCampaigns: campaignList.filter(c => c.status === 'active').length,
                totalPosts: myPosts.filter(p => p.status === 'posted').length,
                totalReach: myAnalytics.reduce((sum, a) => sum + (a.total_reach || 0), 0),
                pendingSubmissions: (submissionsRes.data || []).filter((s: any) => s.status === 'pending').length,
            });
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const createCampaign = async (data: Partial<SmmCampaign>) => {
        if (!user) return null;
        const { data: created, error } = await (supabase as any).from('smm_campaigns').insert({ ...data, smm_user_id: user.id }).select().single();
        if (error) throw error;
        setCampaigns(prev => [created, ...prev]);
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

    const logAnalytics = async (data: Partial<SmmAnalytics>) => {
        const { data: created, error } = await (supabase as any).from('smm_analytics').upsert(data, { onConflict: 'campaign_id,platform,week_start' }).select().single();
        if (error) throw error;
        setAnalytics(prev => {
            const exists = prev.findIndex(a => a.id === created.id);
            return exists >= 0 ? prev.map(a => a.id === created.id ? created : a) : [created, ...prev];
        });
    };

    return { loading, profile, campaigns, posts, analytics, stats, contracts, submissions, createCampaign, updateCampaign, deleteCampaign, createPost, updatePost, logAnalytics, refresh: load };
};
