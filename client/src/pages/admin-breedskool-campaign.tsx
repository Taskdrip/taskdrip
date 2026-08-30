import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/ui/navigation";
import { ContentEditorPanel } from "@/components/ContentEditorPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeartHandshake, ExternalLink, Save, Settings2, BarChart3, WalletCards } from "lucide-react";

type CampaignConfig = {
  goalUsd: number;
  raisedUsd: number;
  supporters: number;
  studentsTarget: number;
  studentsTrained: number;
  studentsEmployed: number;
  studentsWithoutEquipment: number;
  heroImage: string;
  justGivingUrl: string;
  telegramUrl: string;
  studentWhatsAppUrl: string;
  sponsorWhatsAppUrl: string;
  developerUrl: string;
};

const DEFAULT_CONFIG: CampaignConfig = {
  goalUsd: 100000, raisedUsd: 0, supporters: 0, studentsTarget: 100,
  studentsTrained: 0, studentsEmployed: 0, studentsWithoutEquipment: 100,
  heroImage: "", justGivingUrl: "https://www.justgiving.com/crowdfunding/breedskool",
  telegramUrl: "https://t.me/taskdrip", studentWhatsAppUrl: "https://wa.me/2348036622568",
  sponsorWhatsAppUrl: "https://wa.me/12016800266", developerUrl: "https://taskdrip.online/hire-developer",
};

const numberFields: Array<[keyof CampaignConfig, string, string]> = [
  ["goalUsd", "Fundraising goal (GBP)", "The total campaign target, displayed in pounds sterling."],
  ["raisedUsd", "Raised so far (GBP)", "Update this after verified JustGiving or crypto donations."],
  ["supporters", "Supporters", "Verified supporters across donation channels."],
  ["studentsTarget", "Learner target", "The number of learners this campaign aims to serve."],
  ["studentsTrained", "Learners trained", "Verified learners who have completed training."],
  ["studentsWithoutEquipment", "Learners needing equipment", "Current equipment gap for reporting."],
  ["studentsEmployed", "Learners employed", "Verified learners who moved into paid work."],
];

export default function AdminBreedSkoolCampaign() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<CampaignConfig>(DEFAULT_CONFIG);
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";
  const { data, isLoading } = useQuery<CampaignConfig>({
    queryKey: ["/api/admin/breedskool/campaign"],
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) setLocation("/login");
  }, [authLoading, isAdmin, setLocation]);
  useEffect(() => { if (data) setForm({ ...DEFAULT_CONFIG, ...data }); }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/admin/breedskool/campaign", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/breedskool/campaign"] });
      queryClient.invalidateQueries({ queryKey: ["/api/breedskool/campaign"] });
      toast({ title: "Campaign settings saved", description: "The public campaign page is now updated." });
    },
    onError: (error: any) => toast({ title: "Could not save settings", description: error.message, variant: "destructive" }),
  });

  if (authLoading || !isAdmin) return <div className="min-h-screen bg-gray-950" />;

  const update = (key: keyof CampaignConfig, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Campaign administration</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><HeartHandshake className="h-7 w-7 text-amber-300" />BreedSkool impact campaign</h1><p className="mt-2 text-sm text-gray-400">Manage the public story, impact numbers, donation links and campaign contacts.</p></div>
          <div className="flex gap-2"><Link href="/breedskool/campaign"><Button variant="outline" className="border-gray-700 bg-transparent text-white hover:bg-gray-800"><ExternalLink className="mr-2 h-4 w-4" />View campaign</Button></Link><Link href="/admin/cms"><Button variant="outline" className="border-gray-700 bg-transparent text-white hover:bg-gray-800">Open CMS editor</Button></Link></div>
        </div>
        <Tabs defaultValue="settings">
          <TabsList className="mb-5 bg-gray-900"><TabsTrigger value="settings"><Settings2 className="mr-2 h-4 w-4" />Campaign settings</TabsTrigger><TabsTrigger value="content"><HeartHandshake className="mr-2 h-4 w-4" />Story and sections</TabsTrigger><TabsTrigger value="wallets"><WalletCards className="mr-2 h-4 w-4" />Donation wallets</TabsTrigger></TabsList>
          <TabsContent value="settings">
            <Card className="border-gray-800 bg-gray-900"><CardHeader><CardTitle className="text-white">Public progress and links</CardTitle><CardDescription className="text-gray-400">Numbers are displayed publicly as campaign reporting. Only enter verified figures.</CardDescription></CardHeader><CardContent className="space-y-7">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{numberFields.map(([key, label, description]) => <div key={key}><Label className="text-gray-200">{label}</Label><Input type="number" min="0" value={String(form[key] ?? "")} onChange={(event) => update(key, Number(event.target.value))} className="mt-2 border-gray-700 bg-gray-800 text-white" /><p className="mt-1 text-xs text-gray-500">{description}</p></div>)}</div>
              <div className="grid gap-5 lg:grid-cols-2"><div><Label className="text-gray-200">Hero image URL</Label><Input value={form.heroImage} onChange={(event) => update("heroImage", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" placeholder="https://…" /></div><div><Label className="text-gray-200">JustGiving campaign URL</Label><Input value={form.justGivingUrl} onChange={(event) => update("justGivingUrl", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" /></div><div><Label className="text-gray-200">Telegram URL</Label><Input value={form.telegramUrl} onChange={(event) => update("telegramUrl", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" /></div><div><Label className="text-gray-200">Student WhatsApp URL</Label><Input value={form.studentWhatsAppUrl} onChange={(event) => update("studentWhatsAppUrl", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" /></div><div><Label className="text-gray-200">Sponsor WhatsApp URL</Label><Input value={form.sponsorWhatsAppUrl} onChange={(event) => update("sponsorWhatsAppUrl", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" /></div><div><Label className="text-gray-200">Developer page URL</Label><Input value={form.developerUrl} onChange={(event) => update("developerUrl", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" /></div></div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isLoading} className="bg-violet-600 font-bold hover:bg-violet-700"><Save className="mr-2 h-4 w-4" />{saveMutation.isPending ? "Saving…" : "Save campaign settings"}</Button>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="content"><ContentEditorPanel /></TabsContent>
          <TabsContent value="wallets"><Card className="border-gray-800 bg-gray-900"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><WalletCards className="h-5 w-5 text-amber-300" />Manual crypto wallets</CardTitle><CardDescription className="text-gray-400">These are shared with BreedSkool registration and the campaign donation form.</CardDescription></CardHeader><CardContent><p className="text-gray-400">Use the existing BreedSkool payment settings panel to add or update USDT wallet addresses, then return here to preview the public form.</p><Link href="/admin?tab=payments"><Button className="mt-5 bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">Open payment settings</Button></Link></CardContent></Card></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}