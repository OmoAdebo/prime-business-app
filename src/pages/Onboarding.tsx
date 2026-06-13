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
import { ArrowRight, ArrowLeft, CheckCircle2, Rocket, Sparkles } from 'lucide-react';
import { BUSINESS_CATEGORIES, INDUSTRY_CONFIG, type BusinessCategory } from '@/lib/industry-config';
import { NIGERIA_STATES, getLgasForState } from '@/lib/nigeria-lgas';

export default function Onboarding() {
  const { user, profile, roles, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isBusinessOwner = roles.includes('business_owner');
  const totalSteps = isBusinessOwner ? 4 : 2;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // form state
  const [companyName, setCompanyName] = useState('');
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

  // Reset LGA whenever state changes
  useEffect(() => { setLga(''); }, [state]);

  const lgas = getLgasForState(state);

  const next = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const finish = async () => {
    if (!user) return;
    if (isBusinessOwner && !businessCategory) {
      toast.error('Industry / Sector is required to tailor your dashboard');
      setStep(2);
      return;
    }
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
        const payload: any = {
          company_name: companyName,
          industry: businessCategory || null,
          business_category: businessCategory || null,
          business_subcategory: businessSubcategory || null,
          cac_number: cacNumber || null,
          tin_number: tinNumber || null,
          business_address: businessAddress || null,
          state: state || null,
          lga: lga || null,
        };
        if (existing?.id) {
          await supabase.from('businesses').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('businesses').insert({ owner_id: user.id, ...payload });
        }
      }

      await refreshProfile();
      toast.success("You're all set! Your dashboard is tailored to your industry.");
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'Could not save onboarding');
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    if (!user) return;
    if (isBusinessOwner && !businessCategory) {
      toast.error('Please pick your Industry / Sector before skipping — it tailors your dashboard.');
      setStep(2);
      return;
    }
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
    await refreshProfile();
    navigate('/dashboard');
  };

  const progress = (step / totalSteps) * 100;
  const canContinueStep2 = !!companyName && !!businessCategory;

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
            {step === 1 && (<><CardTitle>Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</CardTitle><CardDescription>{isBusinessOwner ? "We'll tailor Prime to your industry in a few quick steps." : "Quick setup before you explore the platform."}</CardDescription></>)}
            {isBusinessOwner && step === 2 && (<><CardTitle>Business profile</CardTitle><CardDescription>This determines how your dashboard, terminology and quick actions look.</CardDescription></>)}
            {isBusinessOwner && step === 3 && (<><CardTitle>Business address</CardTitle><CardDescription>Where is your business located?</CardDescription></>)}
            {isBusinessOwner && step === 4 && (<><CardTitle>Almost done</CardTitle><CardDescription>Review and confirm.</CardDescription></>)}
            {!isBusinessOwner && step === 2 && (<><CardTitle>Contact info</CardTitle><CardDescription>Add a phone number so businesses can reach you.</CardDescription></>)}
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Personalize your dashboard for your industry</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {isBusinessOwner ? 'Set up your business profile' : 'Add your contact info'}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Get started in under 2 minutes</li>
              </ul>
            )}

            {isBusinessOwner && step === 2 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="company">Company name *</Label>
                  <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Industry / Sector *
                  </Label>
                  <Select
                    value={businessCategory}
                    onValueChange={(v) => { setBusinessCategory(v); setBusinessSubcategory(''); }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select your business focus" /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{c}</span>
                            <span className="text-xs text-muted-foreground">{INDUSTRY_CONFIG[c].hint}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Your entire dashboard — terminology (e.g. Patient vs Customer), units of measurement, KPIs, sidebar and quick actions — will adapt to this choice. <span className="text-foreground font-medium">This can't easily be changed later</span>, so pick carefully.
                  </p>
                </div>
                {businessCategory && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Subcategory</Label>
                    <Select value={businessSubcategory} onValueChange={setBusinessSubcategory}>
                      <SelectTrigger><SelectValue placeholder="Choose a subcategory (optional)" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_CONFIG[businessCategory as BusinessCategory].subcategories.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." /></div>
                <div className="space-y-2"><Label htmlFor="cac">CAC number</Label><Input id="cac" value={cacNumber} onChange={(e) => setCacNumber(e.target.value.toUpperCase())} placeholder="RC1234567" /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="tin">TIN number</Label><Input id="tin" value={tinNumber} onChange={(e) => setTinNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit TIN" /></div>
              </div>
            )}

            {isBusinessOwner && step === 3 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="addr">Business address</Label>
                  <Textarea id="addr" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} rows={2} placeholder="Street, city" />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {NIGERIA_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>LGA</Label>
                  <Select value={lga} onValueChange={setLga} disabled={!state}>
                    <SelectTrigger>
                      <SelectValue placeholder={state ? 'Select LGA' : 'Select a state first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {lgas.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {isBusinessOwner && step === 4 && (
              <div className="rounded-lg border p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Company:</span> <span className="font-medium">{companyName || '—'}</span></p>
                <p><span className="text-muted-foreground">Industry / Sector:</span> {businessCategory || '—'}{businessSubcategory ? ` / ${businessSubcategory}` : ''}</p>
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
                  <Button onClick={next} disabled={isBusinessOwner && step === 2 && !canContinueStep2}>
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
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
