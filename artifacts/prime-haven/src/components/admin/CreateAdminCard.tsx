import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CreateAdminCard = () => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('seed-admin', {
      body: { name: name.trim(), email: email.trim().toLowerCase(), password },
    });
    setBusy(false);
    if (error || !data?.success) {
      const msg = data?.error === 'access_denied' ? 'Only a Masteradmin can create admin accounts.' : data?.error || 'Could not create the admin account.';
      toast({ title: 'Not created', description: msg, variant: 'destructive' });
      return;
    }
    toast({ title: 'Admin ready', description: `${email} can now sign in as an admin.` });
    setName(''); setEmail(''); setPassword('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-primary" /> Create admin account</CardTitle>
        <CardDescription>Masteradmins only. Password needs 12+ characters with upper and lower case, a number and a symbol.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5"><Label htmlFor="adm-name">Name</Label><Input id="adm-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="adm-email">Email</Label><Input id="adm-email" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="adm-pass">Password</Label><Input id="adm-pass" type="password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
          <Button type="submit" disabled={busy} className="sm:col-span-3 sm:w-fit">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create admin'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateAdminCard;
