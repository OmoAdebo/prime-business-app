import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, CheckCircle2, Rocket } from 'lucide-react';

const NIGERIA_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta',
  'Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi',
  'Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
  'Taraba','Yobe','Zamfara',
];

import { BUSINESS_CATEGORIES, INDUSTRY_CONFIG } from '@/lib/industry-config';

export default function Onboarding() {
  const { user, profile, roles, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isBusinessOwner = roles.includes('business_owner');
  const totalSteps = isBusinessOwner ? 4 : 2;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // form state
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [businessCategory, setBusinessCategory] = useState<string>('');
  const [businessSubcategory, setBusinessSubcategory] = useState<string>('');
  const [cacNumber, setCacNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
    if (profile) {
      setCompanyName(profile.company_name || '');
      setPhone(profile.phone || '');
    }
  }, [user, profile, authLoading, navigate]);

  const next = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        company_name: companyName || null,
        phone: phone || null,
        onboarding_completed: true,
        onboarding_step: totalSteps,
      }).eq('id', user.id);

      if (isBusinessOwner && companyName) {
        const { data: existing } = await supabase.from('businesses').select('id').eq('owner_id', user.id).maybeSingle();
        if (existing?.id) {
          await supabase.from('businesses').update({
            company_name: companyName,
            industry: industry || null,
            cac_number: cacNumber || null,
            tin_number: tinNumber || null,
            business_address: businessAddress || null,
            state: state || null,
            lga: lga || null,
          }).eq('id', existing.id);
        } else {
          await supabase.from('businesses').insert({
            owner_id: user.id,
            company_name: companyName,
            industry: industry || null,
            cac_number: cacNumber || null,
            tin_number: tinNumber || null,
            business_address: businessAddress || null,
            state: state || null,
            lga: lga || null,
          });
        }
      }

      await refreshProfile();
      toast.success("You're all set! Welcome to Prime Business.");
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'Could not save onboarding');
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
    await refreshProfile();
    navigate('/dashboard');
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Rocket className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold font-display">Let's set up your account</h1>
          <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
          <Progress value={progress} className="h-1.5 max-w-md mx-auto" />
        </div>

        <Card>
          <CardHeader>
            {step === 1 && (<><CardTitle>Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</CardTitle><CardDescription>{isBusinessOwner ? "We'll help you set up your business profile in a few quick steps." : "Quick setup before you explore the platform."}</CardDescription></>)}
            {isBusinessOwner && step === 2 && (<><CardTitle>Business details</CardTitle><CardDescription>Tell us about your business.</CardDescription></>)}
            {isBusinessOwner && step === 3 && (<><CardTitle>Business address</CardTitle><CardDescription>Where is your business located?</CardDescription></>)}
            {isBusinessOwner && step === 4 && (<><CardTitle>Almost done</CardTitle><CardDescription>Review and confirm.</CardDescription></>)}
            {!isBusinessOwner && step === 2 && (<><CardTitle>Contact info</CardTitle><CardDescription>Add a phone number so businesses can reach you.</CardDescription></>)}
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Personalize your dashboard</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isBusinessOwner ? 'Set up your business profile' : 'Add your contact info'}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Get started in under 2 minutes</li>
              </ul>
            )}

            {isBusinessOwner && step === 2 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="company">Company name *</Label><Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." /></div>
                <div className="space-y-2"><Label htmlFor="cac">CAC number</Label><Input id="cac" value={cacNumber} onChange={(e) => setCacNumber(e.target.value)} placeholder="RC1234567" /></div>
                <div className="space-y-2"><Label htmlFor="tin">TIN number</Label><Input id="tin" value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} placeholder="10-digit TIN" /></div>
              </div>
            )}

            {isBusinessOwner && step === 3 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="addr">Business address</Label><Textarea id="addr" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} rows={2} /></div>
                <div className="space-y-2"><Label>State</Label>
                  <Select value={state} onValueChange={setState}><SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger><SelectContent>{NIGERIA_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2"><Label htmlFor="lga">LGA</Label><Input id="lga" value={lga} onChange={(e) => setLga(e.target.value)} /></div>
              </div>
            )}

            {isBusinessOwner && step === 4 && (
              <div className="rounded-lg border p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Company:</span> <span className="font-medium">{companyName || '—'}</span></p>
                <p><span className="text-muted-foreground">Industry:</span> {industry || '—'}</p>
                <p><span className="text-muted-foreground">CAC:</span> {cacNumber || '—'}</p>
                <p><span className="text-muted-foreground">TIN:</span> {tinNumber || '—'}</p>
                <p><span className="text-muted-foreground">Address:</span> {businessAddress || '—'}</p>
                <p><span className="text-muted-foreground">State / LGA:</span> {state || '—'} / {lga || '—'}</p>
              </div>
            )}

            {!isBusinessOwner && step === 2 && (
              <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." /></div>
            )}

            <div className="flex justify-between pt-4">
              <div>{step > 1 && <Button variant="ghost" onClick={prev}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>}</div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={skip} disabled={saving}>Skip for now</Button>
                {step < totalSteps ? (
                  <Button onClick={next} disabled={isBusinessOwner && step === 2 && !companyName}>Continue <ArrowRight className="h-4 w-4 ml-1" /></Button>
                ) : (
                  <Button onClick={finish} disabled={saving}>{saving ? 'Saving...' : 'Finish setup'}</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
