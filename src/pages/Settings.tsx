import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  User, Shield, Users, Mail, Phone, Building2, Loader2, UserPlus,
  Clock, CheckCircle, XCircle, Send, FileText, Palette, Upload,
  Eye, EyeOff, Check, X, Monitor, Smartphone, ShieldCheck,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppRole } from "@/contexts/AuthContext";

// ─── Profile Tab ───
function ProfileTab() {
  const { profile, user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    company_name: profile?.company_name || "",
    phone: profile?.phone || "",
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: form.full_name, company_name: form.company_name, phone: form.phone })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary" /> Profile Information
        </CardTitle>
        <CardDescription>Update your personal and business details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
            </Label>
            <Input id="email" value={user?.email || ""} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
            </Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name" className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Company Name
            </Label>
            <Input id="company_name" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Your company or business name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number
            </Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+234 800 000 0000" />
          </div>
        </div>
        <Separator />
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Security Tab ───
function SecurityTab() {
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async () => {
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Your password has been changed." });
      setPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Security
        </CardTitle>
        <CardDescription>Change your password to keep your account secure.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
        </div>
        <Button onClick={handleChangePassword} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Update Password
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Nigerian States & LGAs ───
const NIGERIAN_STATES_LGAS: Record<string, string[]> = {
  "Abia": ["Aba North","Aba South","Arochukwu","Bende","Ikwuano","Isiala Ngwa North","Isiala Ngwa South","Isuikwuato","Obi Ngwa","Ohafia","Osisioma","Ugwunagbo","Ukwa East","Ukwa West","Umuahia North","Umuahia South","Umu Nneochi"],
  "Adamawa": ["Demsa","Fufore","Ganye","Gayuk","Gombi","Grie","Hong","Jada","Lamurde","Madagali","Maiha","Mayo Belwa","Michika","Mubi North","Mubi South","Numan","Shelleng","Song","Toungo","Yola North","Yola South"],
  "Akwa Ibom": ["Abak","Eastern Obolo","Eket","Esit Eket","Essien Udim","Etim Ekpo","Etinan","Ibeno","Ibesikpo Asutan","Ibiono-Ibom","Ika","Ikono","Ikot Abasi","Ikot Ekpene","Ini","Itu","Mbo","Mkpat-Enin","Nsit-Atai","Nsit-Ibom","Nsit-Ubium","Obot Akara","Okobo","Onna","Oron","Oruk Anam","Udung-Uko","Ukanafun","Uruan","Urue-Offong/Oruko","Uyo"],
  "Anambra": ["Aguata","Anambra East","Anambra West","Anaocha","Awka North","Awka South","Ayamelum","Dunukofia","Ekwusigo","Idemili North","Idemili South","Ihiala","Njikoka","Nnewi North","Nnewi South","Ogbaru","Onitsha North","Onitsha South","Orumba North","Orumba South","Oyi"],
  "Bauchi": ["Alkaleri","Bauchi","Bogoro","Damban","Darazo","Dass","Gamawa","Ganjuwa","Giade","Itas/Gadau","Jama'are","Katagum","Kirfi","Misau","Ningi","Shira","Tafawa Balewa","Toro","Warji","Zaki"],
  "Bayelsa": ["Brass","Ekeremor","Kolokuma/Opokuma","Nembe","Ogbia","Sagbama","Southern Ijaw","Yenagoa"],
  "Benue": ["Ado","Agatu","Apa","Buruku","Gboko","Guma","Gwer East","Gwer West","Katsina-Ala","Konshisha","Kwande","Logo","Makurdi","Obi","Ogbadibo","Ohimini","Oju","Okpokwu","Otukpo","Tarka","Ukum","Ushongo","Vandeikya"],
  "Borno": ["Abadam","Askira/Uba","Bama","Bayo","Biu","Chibok","Damboa","Dikwa","Gubio","Guzamala","Gwoza","Hawul","Jere","Kaga","Kala/Balge","Konduga","Kukawa","Kwaya Kusar","Mafa","Magumeri","Maiduguri","Marte","Mobbar","Monguno","Ngala","Nganzai","Shani"],
  "Cross River": ["Abi","Akamkpa","Akpabuyo","Bakassi","Bekwarra","Biase","Boki","Calabar Municipal","Calabar South","Etung","Ikom","Obanliku","Obubra","Obudu","Odukpani","Ogoja","Yakurr","Yala"],
  "Delta": ["Aniocha North","Aniocha South","Bomadi","Burutu","Ethiope East","Ethiope West","Ika North East","Ika South","Isoko North","Isoko South","Ndokwa East","Ndokwa West","Okpe","Oshimili North","Oshimili South","Patani","Sapele","Udu","Ughelli North","Ughelli South","Ukwuani","Uvwie","Warri North","Warri South","Warri South West"],
  "Ebonyi": ["Abakaliki","Afikpo North","Afikpo South","Ebonyi","Ezza North","Ezza South","Ikwo","Ishielu","Ivo","Izzi","Ohaozara","Ohaukwu","Onicha"],
  "Edo": ["Akoko-Edo","Egor","Esan Central","Esan North-East","Esan South-East","Esan West","Etsako Central","Etsako East","Etsako West","Igueben","Ikpoba-Okha","Oredo","Orhionmwon","Ovia North-East","Ovia South-West","Owan East","Owan West","Uhunmwonde"],
  "Ekiti": ["Ado Ekiti","Efon","Ekiti East","Ekiti South-West","Ekiti West","Emure","Gbonyin","Ido Osi","Ijero","Ikere","Ikole","Ilejemeje","Irepodun/Ifelodun","Ise/Orun","Moba","Oye"],
  "Enugu": ["Aninri","Awgu","Enugu East","Enugu North","Enugu South","Ezeagu","Igbo Etiti","Igbo Eze North","Igbo Eze South","Isi Uzo","Nkanu East","Nkanu West","Nsukka","Oji River","Udenu","Udi","Uzo-Uwani"],
  "FCT": ["Abaji","Bwari","Gwagwalada","Kuje","Kwali","Municipal Area Council"],
  "Gombe": ["Akko","Balanga","Billiri","Dukku","Funakaye","Gombe","Kaltungo","Kwami","Nafada","Shongom","Yamaltu/Deba"],
  "Imo": ["Aboh Mbaise","Ahiazu Mbaise","Ehime Mbano","Ezinihitte","Ideato North","Ideato South","Ihitte/Uboma","Ikeduru","Isiala Mbano","Isu","Mbaitoli","Ngor Okpala","Njaba","Nkwerre","Nwangele","Obowo","Oguta","Ohaji/Egbema","Okigwe","Onuimo","Orlu","Orsu","Oru East","Oru West","Owerri Municipal","Owerri North","Owerri West"],
  "Jigawa": ["Auyo","Babura","Biriniwa","Birnin Kudu","Buji","Dutse","Gagarawa","Garki","Gumel","Guri","Gwaram","Gwiwa","Hadejia","Jahun","Kafin Hausa","Kaugama","Kazaure","Kiri Kasama","Kiyawa","Maigatari","Malam Madori","Miga","Ringim","Roni","Sule Tankarkar","Taura","Yankwashi"],
  "Kaduna": ["Birnin Gwari","Chikun","Giwa","Igabi","Ikara","Jaba","Jema'a","Kachia","Kaduna North","Kaduna South","Kagarko","Kajuru","Kaura","Kauru","Kubau","Kudan","Lere","Makarfi","Sabon Gari","Sanga","Soba","Zangon Kataf","Zaria"],
  "Kano": ["Ajingi","Albasu","Bagwai","Bebeji","Bichi","Bunkure","Dala","Dambatta","Dawakin Kudu","Dawakin Tofa","Doguwa","Fagge","Gabasawa","Garko","Garun Mallam","Gaya","Gezawa","Gwale","Gwarzo","Kabo","Kano Municipal","Karaye","Kibiya","Kiru","Kumbotso","Kunchi","Kura","Madobi","Makoda","Minjibir","Nasarawa","Rano","Rimin Gado","Rogo","Shanono","Sumaila","Takai","Tarauni","Tofa","Tsanyawa","Tudun Wada","Ungogo","Warawa","Wudil"],
  "Katsina": ["Bakori","Batagarawa","Batsari","Baure","Bindawa","Charanchi","Dandume","Danja","Dan Musa","Daura","Dutsi","Dutsin Ma","Faskari","Funtua","Ingawa","Jibia","Kafur","Kaita","Kankara","Kankia","Katsina","Kurfi","Kusada","Mai'Adua","Malumfashi","Mani","Mashi","Matazu","Musawa","Rimi","Sabuwa","Safana","Sandamu","Zango"],
  "Kebbi": ["Aleiro","Arewa Dandi","Argungu","Augie","Bagudo","Birnin Kebbi","Bunza","Dandi","Fakai","Gwandu","Jega","Kalgo","Koko/Besse","Maiyama","Ngaski","Sakaba","Shanga","Suru","Wasagu/Danko","Yauri","Zuru"],
  "Kogi": ["Adavi","Ajaokuta","Ankpa","Bassa","Dekina","Ibaji","Idah","Igalamela Odolu","Ijumu","Kabba/Bunu","Kogi","Lokoja","Mopa Muro","Ofu","Ogori/Magongo","Okehi","Okene","Olamaboro","Omala","Yagba East","Yagba West"],
  "Kwara": ["Asa","Baruten","Edu","Ekiti","Ifelodun","Ilorin East","Ilorin South","Ilorin West","Irepodun","Isin","Kaiama","Moro","Offa","Oke Ero","Oyun","Pategi"],
  "Lagos": ["Agege","Ajeromi-Ifelodun","Alimosho","Amuwo-Odofin","Apapa","Badagry","Epe","Eti Osa","Ibeju-Lekki","Ifako-Ijaiye","Ikeja","Ikorodu","Kosofe","Lagos Island","Lagos Mainland","Mushin","Ojo","Oshodi-Isolo","Shomolu","Surulere"],
  "Nasarawa": ["Akwanga","Awe","Doma","Karu","Keana","Keffi","Kokona","Lafia","Nasarawa","Nasarawa Egon","Obi","Toto","Wamba"],
  "Niger": ["Agaie","Agwara","Bida","Borgu","Bosso","Chanchaga","Edati","Gbako","Gurara","Katcha","Kontagora","Lapai","Lavun","Magama","Mariga","Mashegu","Mokwa","Munya","Paikoro","Rafi","Rijau","Shiroro","Suleja","Tafa","Wushishi"],
  "Ogun": ["Abeokuta North","Abeokuta South","Ado-Odo/Ota","Egbado North","Egbado South","Ewekoro","Ifo","Ijebu East","Ijebu North","Ijebu North East","Ijebu Ode","Ikenne","Imeko Afon","Ipokia","Obafemi Owode","Odeda","Odogbolu","Ogun Waterside","Remo North","Sagamu","Shagamu"],
  "Ondo": ["Akoko North-East","Akoko North-West","Akoko South-East","Akoko South-West","Akure North","Akure South","Ese Odo","Idanre","Ifedore","Ilaje","Ile Oluji/Okeigbo","Irele","Odigbo","Okitipupa","Ondo East","Ondo West","Ose","Owo"],
  "Osun": ["Aiyedaade","Aiyedire","Atakunmosa East","Atakunmosa West","Boluwaduro","Boripe","Ede North","Ede South","Egbedore","Ejigbo","Ife Central","Ife East","Ife North","Ife South","Ifedayo","Ifelodun","Ila","Ilesa East","Ilesa West","Irepodun","Irewole","Isokan","Iwo","Obokun","Odo Otin","Ola Oluwa","Olorunda","Oriade","Orolu","Osogbo"],
  "Oyo": ["Afijio","Akinyele","Atiba","Atisbo","Egbeda","Ibadan North","Ibadan North-East","Ibadan North-West","Ibadan South-East","Ibadan South-West","Ibarapa Central","Ibarapa East","Ibarapa North","Ido","Irepo","Iseyin","Itesiwaju","Iwajowa","Kajola","Lagelu","Ogbomosho North","Ogbomosho South","Ogo Oluwa","Oluyole","Ona Ara","Orelope","Ori Ire","Oyo East","Oyo West","Saki East","Saki West","Surulere"],
  "Plateau": ["Barkin Ladi","Bassa","Bokkos","Jos East","Jos North","Jos South","Kanam","Kanke","Langtang North","Langtang South","Mangu","Mikang","Pankshin","Qua'an Pan","Riyom","Shendam","Wase"],
  "Rivers": ["Abua/Odual","Ahoada East","Ahoada West","Akuku-Toru","Andoni","Asari-Toru","Bonny","Degema","Eleme","Emohua","Etche","Gokana","Ikwerre","Khana","Obio/Akpor","Ogba/Egbema/Ndoni","Ogu/Bolo","Okrika","Omuma","Opobo/Nkoro","Oyigbo","Port Harcourt","Tai"],
  "Sokoto": ["Binji","Bodinga","Dange Shuni","Gada","Goronyo","Gudu","Gwadabawa","Illela","Isa","Kebbe","Kware","Rabah","Sabon Birni","Shagari","Silame","Sokoto North","Sokoto South","Tambuwal","Tangaza","Tureta","Wamako","Wurno","Yabo"],
  "Taraba": ["Ardo Kola","Bali","Donga","Gashaka","Gassol","Ibi","Jalingo","Karim Lamido","Kurmi","Lau","Sardauna","Takum","Ussa","Wukari","Yorro","Zing"],
  "Yobe": ["Bade","Bursari","Damaturu","Fika","Fune","Geidam","Gujba","Gulani","Jakusko","Karasuwa","Machina","Nangere","Nguru","Potiskum","Tarmuwa","Yunusari","Yusufari"],
  "Zamfara": ["Anka","Bakura","Birnin Magaji/Kiyaw","Bukkuyum","Bungudu","Gummi","Gusau","Kaura Namoda","Maradun","Maru","Shinkafi","Talata Mafara","Tsafe","Zurmi"],
};

const NIGERIAN_STATES = Object.keys(NIGERIAN_STATES_LGAS).sort();

const INDUSTRIES = [
  "Agriculture", "Construction", "Education", "Finance", "Healthcare",
  "Hospitality", "Logistics", "Manufacturing", "Oil & Gas", "Retail",
  "Technology", "Other",
];

// ─── Validation helpers ───
const VALIDATION = {
  cac: { regex: /^RC\d{5,7}$/i, message: "Must be RC followed by 5–7 digits (e.g. RC1234567)" },
  tin: { regex: /^\d{10}$/, message: "Must be exactly 10 digits" },
  address: { minLength: 10, message: "Must be at least 10 characters" },
};

function getFieldErrors(form: { cac_number: string; tin_number: string; business_address: string; state: string; lga: string; industry: string }) {
  const errors: Record<string, string> = {};
  if (form.cac_number && !VALIDATION.cac.regex.test(form.cac_number)) errors.cac_number = VALIDATION.cac.message;
  if (form.tin_number && !VALIDATION.tin.regex.test(form.tin_number)) errors.tin_number = VALIDATION.tin.message;
  if (form.business_address && form.business_address.length < VALIDATION.address.minLength) errors.business_address = VALIDATION.address.message;
  return errors;
}

// ─── Business Verification Tab ───
function BusinessVerificationTab() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    cac_number: "",
    tin_number: "",
    business_address: "",
    state: "",
    lga: "",
    industry: "",
  });

  const { data: business, isLoading } = useQuery({
    queryKey: ["my-business"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user?.id || "")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (business) {
      setForm({
        cac_number: business.cac_number || "",
        tin_number: business.tin_number || "",
        business_address: business.business_address || "",
        state: business.state || "",
        lga: business.lga || "",
        industry: business.industry || "",
      });
    }
  }, [business]);

  const errors = getFieldErrors(form);
  const hasErrors = Object.keys(errors).length > 0;

  const lgas = form.state ? (NIGERIAN_STATES_LGAS[form.state] || []) : [];

  const handleFieldChange = (field: string, value: string) => {
    setTouched((t) => ({ ...t, [field]: true }));
    if (field === "state") {
      setForm((f) => ({ ...f, state: value, lga: "" }));
    } else {
      setForm((f) => ({ ...f, [field]: value }));
    }
  };

  const handleSave = async () => {
    if (!user || hasErrors) return;
    setSaving(true);
    if (business) {
      const { error } = await supabase.from("businesses").update({ ...form }).eq("id", business.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Business updated" });
    } else {
      const { error } = await supabase.from("businesses").insert({ owner_id: user.id, company_name: "My Business", ...form });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Business profile created" });
    }
    setSaving(false);
  };

  const handleFileUpload = async (field: "cac_document_url" | "utility_bill_url", file: File) => {
    if (!user || !business) return;
    const path = `${user.id}/${field}_${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("business-documents").upload(path, file);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("business-documents").getPublicUrl(path);
    await supabase.from("businesses").update({ [field]: urlData.publicUrl }).eq("id", business.id);
    toast({ title: "Document uploaded" });
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "text-primary";
    if (s === "rejected") return "text-destructive";
    return "text-warning";
  };

  const FieldError = ({ field }: { field: string }) => {
    if (!touched[field] || !errors[field]) return null;
    return <p className="text-xs text-destructive mt-1">{errors[field]}</p>;
  };

  if (isLoading) return <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Business Verification
        </CardTitle>
        <CardDescription>
          Submit your business documents for admin verification.
          {business && (
            <Badge variant="secondary" className={`ml-2 capitalize ${statusColor(business.verification_status)}`}>
              {business.verification_status}
            </Badge>
          )}
        </CardDescription>
        {business?.rejection_reason && (
          <p className="text-sm text-destructive mt-2">Rejection reason: {business.rejection_reason}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CAC Registration Number */}
          <div className="space-y-2">
            <Label>CAC Registration Number</Label>
            <Input
              value={form.cac_number}
              onChange={(e) => handleFieldChange("cac_number", e.target.value.toUpperCase())}
              onBlur={() => setTouched((t) => ({ ...t, cac_number: true }))}
              placeholder="RC1234567"
              maxLength={9}
              className={touched.cac_number && errors.cac_number ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">Format: RC followed by 5–7 digits</p>
            <FieldError field="cac_number" />
          </div>

          {/* TIN Number */}
          <div className="space-y-2">
            <Label>TIN Number</Label>
            <Input
              value={form.tin_number}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                handleFieldChange("tin_number", val);
              }}
              onBlur={() => setTouched((t) => ({ ...t, tin_number: true }))}
              placeholder="1234567890"
              maxLength={10}
              className={touched.tin_number && errors.tin_number ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">Exactly 10 digits</p>
            <FieldError field="tin_number" />
          </div>

          {/* Business Address */}
          <div className="space-y-2 md:col-span-2">
            <Label>Business Address</Label>
            <Input
              value={form.business_address}
              onChange={(e) => handleFieldChange("business_address", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, business_address: true }))}
              placeholder="Full business address (min. 10 characters)"
              className={touched.business_address && errors.business_address ? "border-destructive" : ""}
            />
            <FieldError field="business_address" />
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label>State</Label>
            <Select value={form.state} onValueChange={(v) => handleFieldChange("state", v)}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {NIGERIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* LGA */}
          <div className="space-y-2">
            <Label>LGA</Label>
            <Select value={form.lga} onValueChange={(v) => handleFieldChange("lga", v)} disabled={!form.state}>
              <SelectTrigger><SelectValue placeholder={form.state ? "Select LGA" : "Select a state first"} /></SelectTrigger>
              <SelectContent>
                {lgas.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label>Industry / Sector</Label>
            <Select value={form.industry} onValueChange={(v) => handleFieldChange("industry", v)}>
              <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {business && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <Label>CAC Certificate</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload("cac_document_url", f);
              }} />
              {business.cac_document_url && <p className="text-xs text-primary">✓ Document uploaded</p>}
            </div>
            <div className="space-y-2">
              <Label>Utility Bill</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload("utility_bill_url", f);
              }} />
              {business.utility_bill_url && <p className="text-xs text-primary">✓ Document uploaded</p>}
            </div>
          </div>
        )}

        <Separator />
        <Button onClick={handleSave} disabled={saving || hasErrors}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {business ? "Update Business Profile" : "Create Business Profile"}
        </Button>
        {hasErrors && Object.keys(touched).length > 0 && (
          <p className="text-xs text-destructive">Please fix the validation errors above before saving.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Branding Tab ───
function BrandingTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brand_name: "",
    primary_color: "#22c55e",
    secondary_color: "#f59e0b",
    email_format: "first.last@domain",
  });

  const { data: business } = useQuery({
    queryKey: ["my-business"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("*").eq("owner_id", user?.id || "").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ["my-business-settings"],
    queryFn: async () => {
      if (!business) return null;
      const { data } = await supabase.from("business_settings").select("*").eq("business_id", business.id).maybeSingle();
      return data;
    },
    enabled: !!business,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        brand_name: settings.brand_name || "",
        primary_color: settings.primary_color || "#22c55e",
        secondary_color: settings.secondary_color || "#f59e0b",
        email_format: settings.email_format || "first.last@domain",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!business) {
      toast({ title: "Error", description: "Create your business profile first in the Business Verification tab.", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (settings) {
      const { error } = await supabase.from("business_settings").update(form).eq("id", settings.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Branding saved" });
    } else {
      const { error } = await supabase.from("business_settings").insert({ business_id: business.id, ...form });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Branding saved" });
    }
    queryClient.invalidateQueries({ queryKey: ["my-business-settings"] });
    setSaving(false);
  };

  const handleLogoUpload = async (file: File) => {
    if (!user || !business || !settings) return;
    const path = `${user.id}/logo_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("business-documents").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("business-documents").getPublicUrl(path);
    await supabase.from("business_settings").update({ logo_url: urlData.publicUrl }).eq("id", settings.id);
    toast({ title: "Logo uploaded" });
    queryClient.invalidateQueries({ queryKey: ["my-business-settings"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" /> Branding & Preferences
        </CardTitle>
        <CardDescription>Customise your business brand and team email format.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Brand Name</Label>
            <Input value={form.brand_name} onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))} placeholder="Your brand display name" />
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            <Input type="file" accept=".png,.jpg,.jpeg,.svg" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleLogoUpload(f);
            }} />
            {settings?.logo_url && <p className="text-xs text-primary">✓ Logo uploaded</p>}
          </div>
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex items-center gap-2">
              <Input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="w-14 h-10 p-1" />
              <Input value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <div className="flex items-center gap-2">
              <Input type="color" value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="w-14 h-10 p-1" />
              <Input value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="flex-1" />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Team Email Format</Label>
          <Select value={form.email_format} onValueChange={(v) => setForm((f) => ({ ...f, email_format: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first.last@domain">first.last@domain</SelectItem>
              <SelectItem value="first_last@domain">first_last@domain</SelectItem>
              <SelectItem value="first.last@role.domain">first.last@role.domain</SelectItem>
              <SelectItem value="first@domain">first@domain</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Email subdomain setup will be available in a future update.</p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Branding
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Team Tab ───
function TeamTab() {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("employee");
  const canManageTeam = roles.includes("business_owner") || roles.includes("super_admin");

  const { data: invitations = [], isLoading: loadingInvites } = useQuery({
    queryKey: ["team-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_invitations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: canManageTeam,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteEmail || !user) throw new Error("Missing fields");
      const { error } = await supabase.from("team_invitations").insert({ email: inviteEmail, role: inviteRole, invited_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation sent", description: `Invitation sent to ${inviteEmail}.` });
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_invitations").update({ status: "revoked" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation revoked" });
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
    },
  });

  if (!canManageTeam) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">Team management is not available for your role.</p>
        </CardContent>
      </Card>
    );
  }

  const statusIcon = (s: string) => {
    if (s === "pending") return <Clock className="h-3.5 w-3.5 text-warning" />;
    if (s === "accepted") return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
    return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Invite Team Member
          </CardTitle>
          <CardDescription>Send an invitation to add a team member.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="team@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="flex-1" type="email" />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="store_manager">Store Manager</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending || !inviteEmail}>
              {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInvites ? (
            <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : invitations.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">No invitations sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">{(inv.role as string).replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 capitalize text-sm">{statusIcon(inv.status)}{inv.status}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {inv.status === "pending" && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => revokeMutation.mutate(inv.id)} disabled={revokeMutation.isPending}>
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Settings Page ───
export default function Settings() {
  const { roles } = useAuth();
  const isOwner = roles.includes("business_owner");
  const isAdmin = roles.includes("super_admin");
  const showTeamTab = isOwner || isAdmin;
  const showBusinessTabs = isOwner;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, security, business, and team.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
          {showBusinessTabs && (
            <TabsTrigger value="business" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Business
            </TabsTrigger>
          )}
          {showBusinessTabs && (
            <TabsTrigger value="branding" className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Branding
            </TabsTrigger>
          )}
          {showTeamTab && (
            <TabsTrigger value="team" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Team
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        {showBusinessTabs && <TabsContent value="business"><BusinessVerificationTab /></TabsContent>}
        {showBusinessTabs && <TabsContent value="branding"><BrandingTab /></TabsContent>}
        {showTeamTab && <TabsContent value="team"><TeamTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
