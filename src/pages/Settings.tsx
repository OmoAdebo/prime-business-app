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
  Eye, EyeOff, Check, X, Monitor, Smartphone, ShieldCheck, RotateCcw,
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

// ─── Password Strength Helper ───
function getPasswordStrength(pw: string) {
  const criteria = [
    { label: "At least 8 characters", met: pw.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(pw) },
    { label: "Lowercase letter", met: /[a-z]/.test(pw) },
    { label: "Number", met: /\d/.test(pw) },
    { label: "Special character (!@#$...)", met: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = criteria.filter((c) => c.met).length;
  let level: string, color: string, percent: number;
  if (score <= 1) { level = "Weak"; color = "bg-destructive"; percent = 20; }
  else if (score <= 2) { level = "Weak"; color = "bg-destructive"; percent = 40; }
  else if (score <= 3) { level = "Fair"; color = "bg-yellow-500"; percent = 60; }
  else if (score <= 4) { level = "Strong"; color = "bg-green-500"; percent = 80; }
  else { level = "Very Strong"; color = "bg-green-600"; percent = 100; }
  return { criteria, score, level, color, percent, allMet: score === 5 };
}

// ─── Security Tab ───
function SecurityTab() {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = strength.allMet && passwordsMatch && confirmPassword.length > 0;

  const handleChangePassword = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  };

  const lastSignIn = session?.user?.last_sign_in_at;

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Change Password
          </CardTitle>
          <CardDescription>Use a strong password to protect your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 max-w-md w-full">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength Meter */}
            {password.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Password strength</span>
                  <span className={`font-medium ${strength.percent >= 80 ? "text-green-600" : strength.percent >= 60 ? "text-yellow-600" : "text-destructive"}`}>
                    {strength.level}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
                <ul className="grid grid-cols-1 gap-1 pt-1">
                  {strength.criteria.map((c) => (
                    <li key={c.label} className="flex items-center gap-2 text-xs">
                      {c.met ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className={c.met ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <X className="h-3 w-3" /> Passwords do not match
              </p>
            )}
            {confirmPassword.length > 0 && passwordsMatch && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Passwords match
              </p>
            )}
          </div>

          <Button onClick={handleChangePassword} disabled={saving || !canSubmit}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Session & Security Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" /> Session & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          {lastSignIn && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last sign-in</span>
              <span className="font-medium">{new Date(lastSignIn).toLocaleString()}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current session</span>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" /> Active
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> Two-factor authentication
            </div>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
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
    const updateData = field === "cac_document_url"
      ? { cac_document_url: urlData.publicUrl }
      : { utility_bill_url: urlData.publicUrl };
    await supabase.from("businesses").update(updateData).eq("id", business.id);
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

// ─── Font Options ───
const FONT_OPTIONS = ['DM Sans', 'Inter', 'Poppins', 'Nunito', 'Roboto'];

const BRAND_DEFAULTS = {
  brand_name: "",
  primary_color: "#22c55e",
  secondary_color: "#f59e0b",
  accent_color: "#f59e0b",
  font_family: "DM Sans",
  email_format: "first.last@domain",
};

// ─── Branding Tab ───
function BrandingTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...BRAND_DEFAULTS });

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
        accent_color: (settings as any).accent_color || settings.secondary_color || "#f59e0b",
        font_family: (settings as any).font_family || "DM Sans",
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
    const payload = {
      brand_name: form.brand_name,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      accent_color: form.accent_color,
      font_family: form.font_family,
      email_format: form.email_format,
    };
    if (settings) {
      const { error } = await supabase.from("business_settings").update(payload).eq("id", settings.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Branding saved", description: "Your theme will apply across all dashboards." });
    } else {
      const { error } = await supabase.from("business_settings").insert({ business_id: business.id, ...payload });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Branding saved", description: "Your theme will apply across all dashboards." });
    }
    queryClient.invalidateQueries({ queryKey: ["my-business-settings"] });
    setSaving(false);
    // Reload to apply branding
    setTimeout(() => window.location.reload(), 500);
  };

  const handleReset = () => {
    setForm({ ...BRAND_DEFAULTS });
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> Branding & Theme
          </CardTitle>
          <CardDescription>Customise your brand identity. Changes apply to your dashboard and your team's dashboards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
          </div>

          <Separator />

          {/* Colors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="w-14 h-10 p-1 cursor-pointer" />
                <Input value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="flex-1 font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="w-14 h-10 p-1 cursor-pointer" />
                <Input value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="flex-1 font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={form.accent_color} onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))} className="w-14 h-10 p-1 cursor-pointer" />
                <Input value={form.accent_color} onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))} className="flex-1 font-mono text-xs" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Font */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select value={form.font_family} onValueChange={(v) => setForm((f) => ({ ...f, font_family: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: `'${font}', sans-serif` }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          <Separator />

          {/* Live Preview */}
          <div className="space-y-2">
            <Label>Live Preview</Label>
            <div
              className="rounded-lg border p-4 space-y-3"
              style={{ fontFamily: `'${form.font_family}', sans-serif` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: form.primary_color }}
                >
                  {form.brand_name?.charAt(0)?.toUpperCase() || "P"}
                </div>
                <div>
                  <p className="font-semibold text-sm">{form.brand_name || "Your Brand"}</p>
                  <p className="text-xs text-muted-foreground">Business Suite</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 px-4 rounded-md flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: form.primary_color }}>
                  Primary Button
                </div>
                <div className="h-8 px-4 rounded-md flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: form.secondary_color }}>
                  Secondary
                </div>
                <div className="h-8 px-4 rounded-md flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: form.accent_color }}>
                  Accent
                </div>
              </div>
              <p className="text-sm">This is how your dashboard text will appear with <strong>{form.font_family}</strong>.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Branding
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
            <>
              {/* Mobile card view */}
              <div className="sm:hidden space-y-3">
                {invitations.map((inv) => (
                  <div key={inv.id} className="p-3 rounded-lg border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{inv.email}</span>
                      <div className="flex items-center gap-1.5 capitalize text-xs">{statusIcon(inv.status)}{inv.status}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="capitalize text-xs">{(inv.role as string).replace("_", " ")}</Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</span>
                        {inv.status === "pending" && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8" onClick={() => revokeMutation.mutate(inv.id)} disabled={revokeMutation.isPending}>
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block">
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
              </div>
            </>
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
        <div className="overflow-x-auto scrollbar-thin -mx-1 px-1">
          <TabsList className="flex-nowrap w-max sm:w-auto">
            <TabsTrigger value="profile" className="flex items-center gap-1.5 min-h-[44px]">
              <User className="h-3.5 w-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1.5 min-h-[44px]">
              <Shield className="h-3.5 w-3.5" /> Security
            </TabsTrigger>
            {showBusinessTabs && (
              <TabsTrigger value="business" className="flex items-center gap-1.5 min-h-[44px]">
                <FileText className="h-3.5 w-3.5" /> Business
              </TabsTrigger>
            )}
            {showBusinessTabs && (
              <TabsTrigger value="branding" className="flex items-center gap-1.5 min-h-[44px]">
                <Palette className="h-3.5 w-3.5" /> Branding
              </TabsTrigger>
            )}
            {showTeamTab && (
              <TabsTrigger value="team" className="flex items-center gap-1.5 min-h-[44px]">
                <Users className="h-3.5 w-3.5" /> Team
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        {showBusinessTabs && <TabsContent value="business"><BusinessVerificationTab /></TabsContent>}
        {showBusinessTabs && <TabsContent value="branding"><BrandingTab /></TabsContent>}
        {showTeamTab && <TabsContent value="team"><TeamTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
