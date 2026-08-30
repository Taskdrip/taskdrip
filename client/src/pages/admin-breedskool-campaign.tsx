import { useEffect, useMemo, useState } from "react";
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
import { CheckCircle2, Clipboard, ExternalLink, HeartHandshake, Pencil, Plus, Save, Search, Settings2, Trash2, Users, WalletCards, XCircle } from "lucide-react";

type CampaignConfig = {
  goalUsd: number;
  raisedUsd: number;
  supporters: number;
  registeredUsers: number;
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

type DonationWallet = {
  id: string;
  label: string;
  currency: string;
  network: string;
  address: string;
  isActive: boolean;
};

type DonationTransaction = {
  id: string;
  amount: string;
  network: string;
  walletAddress?: string;
  walletLabel?: string;
  transactionHash?: string;
  status: string;
  donorName: string;
  donorEmail: string;
  donorMessage?: string;
  proofUrl?: string | null;
  createdAt?: string;
};

type BreedSkoolRegistration = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location?: string | null;
  selectedCourseKey: string;
  selectedCourseTitle: string;
  amountNgn: number;
  paymentOption?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  transactionRef?: string | null;
  deliveryMode?: string | null;
  childName?: string | null;
  childAge?: string | null;
  parentName?: string | null;
  homeAddress?: string | null;
  notes?: string | null;
  createdAt?: string;
};
const DEFAULT_CONFIG: CampaignConfig = {
  goalUsd: 100000, raisedUsd: 0, supporters: 0, studentsTarget: 100,
  registeredUsers: 0,
  studentsTrained: 0, studentsEmployed: 0, studentsWithoutEquipment: 100,
  heroImage: "", justGivingUrl: "https://www.justgiving.com/crowdfunding/breedskool",
  telegramUrl: "https://t.me/taskdrip", studentWhatsAppUrl: "https://wa.me/2348036622568",
  sponsorWhatsAppUrl: "https://wa.me/12016800266", developerUrl: "https://taskdrip.online/hire-developer",
};

const numberFields: Array<[keyof CampaignConfig, string, string]> = [
  ["goalUsd", "Fundraising goal (GBP)", "The total campaign target, displayed in pounds sterling."],
  ["raisedUsd", "Raised so far (GBP)", "Update this after verified JustGiving or crypto donations."],
  ["supporters", "Supporters", "Verified supporters across donation channels."],
  ["registeredUsers", "Registered users shown publicly", "The learner count displayed on the public campaign and donation pages."],
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
  const [wallets, setWallets] = useState<DonationWallet[]>([]);
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [learnerSearch, setLearnerSearch] = useState("");
  const [learnerModeFilter, setLearnerModeFilter] = useState("all");
  const [learnerStatusFilter, setLearnerStatusFilter] = useState("all");
  const [editingLearnerId, setEditingLearnerId] = useState<string | null>(null);
  const [learnerForm, setLearnerForm] = useState<Record<string, any>>({});
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";
  const { data, isLoading } = useQuery<CampaignConfig>({
    queryKey: ["/api/admin/breedskool/campaign"],
    enabled: isAdmin,
  });
  const { data: paymentSettings, isLoading: walletsLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/admin/breedskool/payment-settings"],
    enabled: isAdmin,
  });
  const { data: donations = [], isLoading: donationsLoading } = useQuery<DonationTransaction[]>({
    queryKey: ["/api/admin/breedskool/campaign/donations"],
    enabled: isAdmin,
  });
  const { data: registrations = [], isLoading: registrationsLoading } = useQuery<BreedSkoolRegistration[]>({
    queryKey: ["/api/admin/breedskool/registrations"],
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) setLocation("/login");
  }, [authLoading, isAdmin, setLocation]);
  useEffect(() => { if (data) setForm({ ...DEFAULT_CONFIG, ...data }); }, [data]);
  useEffect(() => {
    if (Array.isArray(paymentSettings?.wallets)) setWallets(paymentSettings.wallets);
  }, [paymentSettings]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/admin/breedskool/campaign", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/breedskool/campaign"] });
      queryClient.invalidateQueries({ queryKey: ["/api/breedskool/campaign"] });
      toast({ title: "Campaign settings saved", description: "The public campaign page is now updated." });
    },
    onError: (error: any) => toast({ title: "Could not save settings", description: error.message, variant: "destructive" }),
  });

  const saveWalletsMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/admin/breedskool/payment-settings", { wallets }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/breedskool/payment-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/breedskool/payment-settings"] });
      toast({ title: "Donation wallets saved", description: "Active wallets are now available in the public checkout." });
    },
    onError: (error: any) => toast({ title: "Could not save wallets", description: error.message, variant: "destructive" }),
  });

  const reviewDonationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/breedskool/campaign/donations/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/breedskool/campaign/donations"] });
      toast({ title: "Donation status updated" });
    },
    onError: (error: any) => toast({ title: "Could not update donation", description: error.message, variant: "destructive" }),
  });

  const updateLearnerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      apiRequest("PATCH", `/api/admin/breedskool/registrations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/breedskool/registrations"] });
      setEditingLearnerId(null);
      toast({ title: "Learner updated", description: "The registered learner record has been saved." });
    },
    onError: (error: any) => toast({ title: "Could not update learner", description: error.message, variant: "destructive" }),
  });

  if (authLoading || !isAdmin) return <div className="min-h-screen bg-gray-950" />;

  const update = (key: keyof CampaignConfig, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const filteredDonations = useMemo(
    () => transactionFilter === "all" ? donations : donations.filter((donation) => donation.status === transactionFilter),
    [donations, transactionFilter],
  );
  const filteredLearners = useMemo(() => {
    const search = learnerSearch.trim().toLowerCase();
    return registrations.filter((learner) => {
      const matchesSearch = !search || [learner.fullName, learner.email, learner.phone, learner.selectedCourseTitle]
        .some((value) => String(value || "").toLowerCase().includes(search));
      const matchesMode = learnerModeFilter === "all" || (learner.deliveryMode || "online") === learnerModeFilter;
      const matchesStatus = learnerStatusFilter === "all" || (learner.paymentStatus || "pending") === learnerStatusFilter;
      return matchesSearch && matchesMode && matchesStatus;
    });
  }, [learnerSearch, learnerModeFilter, learnerStatusFilter, registrations]);
  const addWallet = (preset?: Partial<DonationWallet>) => {
    setWallets((current) => [...current, {
      id: `${preset?.currency?.toLowerCase() || "wallet"}-${Date.now()}`,
      label: preset?.label || "New crypto wallet",
      currency: preset?.currency || "USDT",
      network: preset?.network || "other",
      address: "",
      isActive: true,
    }]);
  };
  const startEditingLearner = (learner: BreedSkoolRegistration) => {
    setEditingLearnerId(learner.id);
    setLearnerForm({
      fullName: learner.fullName || "", email: learner.email || "", phone: learner.phone || "",
      location: learner.location || "", selectedCourseKey: learner.selectedCourseKey || "",
      selectedCourseTitle: learner.selectedCourseTitle || "", amountNgn: learner.amountNgn ?? 0,
      paymentOption: learner.paymentOption || "pay_later", paymentMethod: learner.paymentMethod || "",
      paymentStatus: learner.paymentStatus || "pending", transactionRef: learner.transactionRef || "",
      deliveryMode: learner.deliveryMode || "online", childName: learner.childName || "",
      childAge: learner.childAge || "", parentName: learner.parentName || "",
      homeAddress: learner.homeAddress || "", notes: learner.notes || "",
    });
  };
  const updateLearnerField = (key: string, value: string | number) => {
    setLearnerForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Campaign administration</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><HeartHandshake className="h-7 w-7 text-amber-300" />BreedSkool impact campaign</h1><p className="mt-2 text-sm text-gray-400">Manage the public story, impact numbers, donation links and campaign contacts.</p></div>
          <div className="flex gap-2"><Link href="/breedskool/campaign"><Button variant="outline" className="border-gray-700 bg-transparent text-white hover:bg-gray-800"><ExternalLink className="mr-2 h-4 w-4" />View campaign</Button></Link><Link href="/admin/cms"><Button variant="outline" className="border-gray-700 bg-transparent text-white hover:bg-gray-800">Open CMS editor</Button></Link></div>
        </div>
        <Tabs defaultValue="settings">
          <TabsList className="mb-5 flex h-auto flex-wrap gap-1 bg-gray-900"><TabsTrigger value="settings"><Settings2 className="mr-2 h-4 w-4" />Campaign settings</TabsTrigger><TabsTrigger value="learners"><Users className="mr-2 h-4 w-4" />Registered learners {registrations.length ? `(${registrations.length})` : ""}</TabsTrigger><TabsTrigger value="transactions"><Clipboard className="mr-2 h-4 w-4" />Donation transactions {donations.length ? `(${donations.length})` : ""}</TabsTrigger><TabsTrigger value="content"><HeartHandshake className="mr-2 h-4 w-4" />Story and sections</TabsTrigger><TabsTrigger value="wallets"><WalletCards className="mr-2 h-4 w-4" />Donation wallets</TabsTrigger></TabsList>
          <TabsContent value="settings">
            <Card className="border-gray-800 bg-gray-900"><CardHeader><CardTitle className="text-white">Public progress and links</CardTitle><CardDescription className="text-gray-400">Numbers are displayed publicly as campaign reporting. Only enter verified figures.</CardDescription></CardHeader><CardContent className="space-y-7">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{numberFields.map(([key, label, description]) => <div key={key}><Label className="text-gray-200">{label}</Label><Input type="number" min="0" value={String(form[key] ?? "")} onChange={(event) => update(key, Number(event.target.value))} className="mt-2 border-gray-700 bg-gray-800 text-white" /><p className="mt-1 text-xs text-gray-500">{description}</p></div>)}</div>
              <div className="grid gap-5 lg:grid-cols-2"><div><Label className="text-gray-200">Hero image URL</Label><Input value={form.heroImage} onChange={(event) => update("heroImage", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" placeholder="https://…" /></div><div><Label className="text-gray-200">JustGiving campaign URL</Label><Input value={form.justGivingUrl} onChange={(event) => update("justGivingUrl", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" /></div><div><Label className="text-gray-200">Telegram URL</Label><Input value={form.telegramUrl} onChange={(event) => update("telegramUrl", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" /></div><div><Label className="text-gray-200">Student WhatsApp URL</Label><Input value={form.studentWhatsAppUrl} onChange={(event) => update("studentWhatsAppUrl", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" /></div><div><Label className="text-gray-200">Sponsor WhatsApp URL</Label><Input value={form.sponsorWhatsAppUrl} onChange={(event) => update("sponsorWhatsAppUrl", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" /></div><div><Label className="text-gray-200">Developer page URL</Label><Input value={form.developerUrl} onChange={(event) => update("developerUrl", event.target.value)} className="mt-2 border-gray-700 bg-gray-800 text-white" /></div></div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isLoading} className="bg-violet-600 font-bold hover:bg-violet-700"><Save className="mr-2 h-4 w-4" />{saveMutation.isPending ? "Saving…" : "Save campaign settings"}</Button>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="learners">
            <Card className="border-gray-800 bg-gray-900">
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-violet-300" />Registered learners</CardTitle>
                    <CardDescription className="text-gray-400">Edit learner details, course selection, payment status, and delivery information. Verified payment statuses can activate course access.</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-500" /><Input value={learnerSearch} onChange={(event) => setLearnerSearch(event.target.value)} placeholder="Search learners…" className="border-gray-700 bg-gray-800 pl-9 text-white sm:w-56" /></div>
                    <select value={learnerModeFilter} onChange={(event) => setLearnerModeFilter(event.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"><option value="all">All delivery modes</option><option value="online">Online</option><option value="onsite">Onsite</option><option value="home_lesson">Home lesson</option></select>
                    <select value={learnerStatusFilter} onChange={(event) => setLearnerStatusFilter(event.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"><option value="all">All statuses</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="confirmed">Confirmed</option><option value="verified">Verified</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {registrationsLoading ? <p className="py-10 text-center text-gray-400">Loading learners…</p> : filteredLearners.length === 0 ? <div className="rounded-xl border border-dashed border-gray-700 py-12 text-center text-gray-400"><Users className="mx-auto mb-3 h-9 w-9 opacity-40" /><p>No registered learners match these filters.</p></div> : (
                  <div className="space-y-3">
                    {filteredLearners.map((learner) => (
                      <div key={learner.id} className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-white">{learner.fullName}</p><span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-200">{learner.deliveryMode || "online"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${learner.paymentStatus === "rejected" ? "bg-red-500/15 text-red-300" : learner.paymentStatus === "pending" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>{learner.paymentStatus || "pending"}</span></div>
                            <p className="mt-1 text-sm text-gray-400">{learner.email} · {learner.phone}</p>
                            <p className="mt-1 text-sm text-gray-500">{learner.selectedCourseTitle} · ₦{Number(learner.amountNgn || 0).toLocaleString("en-NG")} {learner.createdAt ? `· ${new Date(learner.createdAt).toLocaleDateString()}` : ""}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => startEditingLearner(learner)} className="shrink-0 border-gray-700 text-gray-200 hover:bg-gray-800"><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit learner</Button>
                        </div>
                        {editingLearnerId === learner.id && (
                          <div className="mt-4 border-t border-gray-800 pt-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              {[
                                ["fullName", "Full name"], ["email", "Email"], ["phone", "Phone"], ["location", "Location"],
                                ["selectedCourseKey", "Course key"], ["selectedCourseTitle", "Course title"], ["amountNgn", "Amount (NGN)"], ["transactionRef", "Transaction reference"],
                                ["childName", "Child name"], ["childAge", "Child age"], ["parentName", "Parent/guardian"],
                              ].map(([key, label]) => <div key={key}><Label className="text-xs text-gray-400">{label}</Label><Input type={key === "amountNgn" ? "number" : key === "email" ? "email" : "text"} value={learnerForm[key] ?? ""} onChange={(event) => updateLearnerField(key, key === "amountNgn" ? Number(event.target.value) : event.target.value)} className="mt-1 border-gray-700 bg-gray-800 text-white" /></div>)}
                              <div><Label className="text-xs text-gray-400">Delivery mode</Label><select value={learnerForm.deliveryMode || "online"} onChange={(event) => updateLearnerField("deliveryMode", event.target.value)} className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"><option value="online">Online</option><option value="onsite">Onsite</option><option value="home_lesson">Home lesson</option></select></div>
                              <div><Label className="text-xs text-gray-400">Payment option</Label><select value={learnerForm.paymentOption || "pay_later"} onChange={(event) => updateLearnerField("paymentOption", event.target.value)} className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"><option value="pay_now">Pay now</option><option value="pay_later">Pay later</option></select></div>
                              <div><Label className="text-xs text-gray-400">Payment method</Label><Input value={learnerForm.paymentMethod ?? ""} onChange={(event) => updateLearnerField("paymentMethod", event.target.value)} className="mt-1 border-gray-700 bg-gray-800 text-white" placeholder="bank_transfer or crypto network" /></div>
                              <div><Label className="text-xs text-gray-400">Payment status</Label><select value={learnerForm.paymentStatus || "pending"} onChange={(event) => updateLearnerField("paymentStatus", event.target.value)} className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"><option value="pending">Pending</option><option value="paid">Paid</option><option value="confirmed">Confirmed</option><option value="verified">Verified</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
                              <div className="sm:col-span-2 lg:col-span-4"><Label className="text-xs text-gray-400">Home address</Label><Input value={learnerForm.homeAddress ?? ""} onChange={(event) => updateLearnerField("homeAddress", event.target.value)} className="mt-1 border-gray-700 bg-gray-800 text-white" /></div>
                              <div className="sm:col-span-2 lg:col-span-4"><Label className="text-xs text-gray-400">Admin notes</Label><textarea value={learnerForm.notes ?? ""} onChange={(event) => updateLearnerField("notes", event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500" /></div>
                            </div>
                            <div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setEditingLearnerId(null)} className="border-gray-700 text-gray-200 hover:bg-gray-800">Cancel</Button><Button onClick={() => updateLearnerMutation.mutate({ id: learner.id, data: learnerForm })} disabled={updateLearnerMutation.isPending} className="bg-violet-600 font-bold hover:bg-violet-700"><Save className="mr-2 h-4 w-4" />{updateLearnerMutation.isPending ? "Saving…" : "Save learner changes"}</Button></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="transactions">
            <Card className="border-gray-800 bg-gray-900">
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div><CardTitle className="text-white">BreedSkool donation transactions</CardTitle><CardDescription className="text-gray-400">Review transaction hashes and approve verified manual crypto donations.</CardDescription></div>
                  <select value={transactionFilter} onChange={(event) => setTransactionFilter(event.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="verified">Verified</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
                </div>
              </CardHeader>
              <CardContent>
                {donationsLoading ? <p className="py-10 text-center text-gray-400">Loading donations…</p> : filteredDonations.length === 0 ? <div className="rounded-xl border border-dashed border-gray-700 py-12 text-center text-gray-400"><HeartHandshake className="mx-auto mb-3 h-9 w-9 opacity-40" /><p>No donation transactions in this view.</p></div> : (
                  <div className="space-y-3">
                    {filteredDonations.map((donation) => (
                      <div key={donation.id} className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-black text-white">${Number(donation.amount || 0).toLocaleString()}</span><span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-200">{donation.walletLabel || donation.network}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${donation.status === "approved" || donation.status === "verified" ? "bg-emerald-500/15 text-emerald-300" : donation.status === "rejected" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>{donation.status}</span></div>
                            <p className="mt-2 text-sm font-semibold text-gray-200">{donation.donorName}{donation.donorEmail ? <span className="ml-2 font-normal text-gray-500">{donation.donorEmail}</span> : null}</p>
                            <p className="mt-2 break-all font-mono text-xs text-gray-400">Tx: {donation.transactionHash || "Not supplied"}</p>
                            <p className="mt-1 break-all font-mono text-xs text-gray-500">Wallet: {donation.walletAddress || "—"}</p>
                            {donation.donorMessage && <p className="mt-2 text-sm text-gray-400">“{donation.donorMessage}”</p>}
                            <p className="mt-2 text-[11px] text-gray-600">{donation.createdAt ? new Date(donation.createdAt).toLocaleString() : ""}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {donation.proofUrl && <Button size="sm" variant="outline" asChild className="border-gray-700 text-gray-200"><a href={donation.proofUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Proof</a></Button>}
                            {donation.status === "submitted" && <Button size="sm" onClick={() => reviewDonationMutation.mutate({ id: donation.id, status: "verified" })} disabled={reviewDonationMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Verify</Button>}
                            {donation.status === "verified" && <Button size="sm" onClick={() => reviewDonationMutation.mutate({ id: donation.id, status: "approved" })} disabled={reviewDonationMutation.isPending} className="bg-violet-600 hover:bg-violet-700"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Approve</Button>}
                            {donation.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => reviewDonationMutation.mutate({ id: donation.id, status: "rejected" })} disabled={reviewDonationMutation.isPending} className="border-red-900 text-red-300 hover:bg-red-950"><XCircle className="mr-1.5 h-3.5 w-3.5" />Reject</Button>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="content"><ContentEditorPanel /></TabsContent>
          <TabsContent value="wallets">
            <Card className="border-gray-800 bg-gray-900">
              <CardHeader><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><CardTitle className="flex items-center gap-2 text-white"><WalletCards className="h-5 w-5 text-amber-300" />Donation wallet manager</CardTitle><CardDescription className="text-gray-400">Add multiple currencies and networks. Only active wallets with an address appear in the public checkout.</CardDescription></div><Button onClick={() => addWallet()} className="bg-violet-600 font-bold hover:bg-violet-700"><Plus className="mr-2 h-4 w-4" />Add wallet</Button></div></CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap gap-2"><span className="text-xs font-bold uppercase tracking-wide text-gray-500">Quick add</span>{[{ label: "Bitcoin", currency: "BTC", network: "bitcoin" }, { label: "Ethereum", currency: "ETH", network: "ethereum" }, { label: "USDT · ERC-20", currency: "USDT", network: "ethereum" }, { label: "Solana", currency: "SOL", network: "solana" }, { label: "Toncoin", currency: "TON", network: "ton" }].map((preset) => <button key={preset.label} type="button" onClick={() => addWallet(preset)} className="rounded-full border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:border-violet-400 hover:text-white">{preset.label}</button>)}</div>
                {walletsLoading ? <p className="py-8 text-center text-gray-400">Loading wallets…</p> : <div className="space-y-3">{wallets.map((wallet, index) => <div key={wallet.id} className="grid gap-3 rounded-xl border border-gray-800 bg-gray-950/50 p-4 md:grid-cols-[1.1fr_0.65fr_0.9fr_1.6fr_auto] md:items-end">
                  <div><Label className="text-xs text-gray-400">Wallet name</Label><Input value={wallet.label} onChange={(event) => setWallets((current) => current.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} className="mt-1 border-gray-700 bg-gray-800 text-white" placeholder="e.g. Bitcoin" /></div>
                  <div><Label className="text-xs text-gray-400">Currency</Label><Input value={wallet.currency} onChange={(event) => setWallets((current) => current.map((item, i) => i === index ? { ...item, currency: event.target.value.toUpperCase() } : item))} className="mt-1 border-gray-700 bg-gray-800 font-mono text-white" placeholder="BTC" /></div>
                  <div><Label className="text-xs text-gray-400">Network</Label><Input value={wallet.network} onChange={(event) => setWallets((current) => current.map((item, i) => i === index ? { ...item, network: event.target.value.toLowerCase() } : item))} className="mt-1 border-gray-700 bg-gray-800 font-mono text-white" placeholder="bitcoin" /></div>
                  <div><Label className="text-xs text-gray-400">Wallet address</Label><Input value={wallet.address} onChange={(event) => setWallets((current) => current.map((item, i) => i === index ? { ...item, address: event.target.value } : item))} className="mt-1 border-gray-700 bg-gray-800 font-mono text-xs text-white" placeholder="Paste the receiving address" /></div>
                  <div className="flex items-center gap-2"><label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={wallet.isActive} onChange={(event) => setWallets((current) => current.map((item, i) => i === index ? { ...item, isActive: event.target.checked } : item))} />Active</label><Button size="icon" variant="ghost" onClick={() => setWallets((current) => current.filter((_, i) => i !== index))} className="text-red-300 hover:bg-red-950 hover:text-red-200" aria-label={`Remove ${wallet.label}`}><Trash2 className="h-4 w-4" /></Button></div>
                </div>)}</div>}
                <Button onClick={() => saveWalletsMutation.mutate()} disabled={saveWalletsMutation.isPending || walletsLoading} className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"><Save className="mr-2 h-4 w-4" />{saveWalletsMutation.isPending ? "Saving…" : "Save donation wallets"}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}