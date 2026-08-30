import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePageContent } from "@/hooks/usePageContent";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RegistrationModal } from "@/pages/breedskool";
import {
  ArrowRight, BookOpen, Briefcase, Check, CheckCircle2, ChevronDown, Copy,
  HeartHandshake, Laptop, MessageCircle, Quote, Rocket, School, Send,
  ShieldCheck, Sparkles, TrendingUp, Users, Wifi,
} from "lucide-react";

const JUST_GIVING_URL = "https://www.justgiving.com/crowdfunding/breedskool";

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
  registrations?: number;
  confirmedRegistrations?: number;
};

type DonationWallet = {
  id: string;
  label: string;
  currency: string;
  network: string;
  address: string;
  isActive?: boolean;
};

const DEFAULT_CONFIG: CampaignConfig = {
  goalUsd: 100000,
  raisedUsd: 0,
  supporters: 0,
  studentsTarget: 100,
  studentsTrained: 0,
  studentsEmployed: 0,
  studentsWithoutEquipment: 100,
  heroImage: "/breedskool-campaign-header.png",
  justGivingUrl: JUST_GIVING_URL,
  telegramUrl: "https://t.me/taskdrip",
  studentWhatsAppUrl: "https://wa.me/2348036622568",
  sponsorWhatsAppUrl: "https://wa.me/12016800266",
  developerUrl: "https://taskdrip.online/hire-developer",
};

const storyImage = "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1100&q=85&auto=format&fit=crop";
const learnerImage = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=85&auto=format&fit=crop";
const classroomImage = "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=85&auto=format&fit=crop";
const equipmentImage = "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=85&auto=format&fit=crop";

function money(value: number) {
  return `£${Math.max(0, Number(value || 0)).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function CampaignNav({ onRegister, onDonate }: { onRegister: () => void; onDonate: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="group flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-lg font-black shadow-lg shadow-violet-900/30 transition-transform group-hover:rotate-3">B</span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black tracking-tight sm:text-lg">BreedSkool</span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 sm:block">Skills for the future</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-white/65 md:flex" aria-label="Campaign navigation">
          <a href="#free-course" className="transition-colors hover:text-white">Free course</a>
          <a href="#impact" className="transition-colors hover:text-white">Our impact</a>
          <a href="#projects" className="transition-colors hover:text-white">Projects</a>
          <a href="#stories" className="transition-colors hover:text-white">Learner stories</a>
          <a href="#support" className="transition-colors hover:text-white">Support</a>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onDonate} className="hidden rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80 transition-colors hover:border-amber-300/60 hover:text-amber-200 sm:block">Fund a learner</button>
          <button type="button" onClick={onRegister} className="rounded-full bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-900/20 transition-all hover:-translate-y-0.5 hover:bg-amber-300 sm:px-5">Join free</button>
        </div>
      </div>
    </header>
  );
}

function CampaignButton({ href, children, className = "", external = false, onClick }: {
  href?: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
  onClick?: () => void;
}) {
  const button = <Button onClick={onClick} className={`h-12 rounded-xl px-6 font-bold shadow-lg transition-all hover:-translate-y-0.5 ${className}`}>{children}</Button>;
  if (onClick || !href) return button;
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{button}</a>;
}

function StatPill({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <Icon className="h-5 w-5 text-amber-300" />
      <div>
        <p className="text-lg font-black leading-none text-white">{value}</p>
        <p className="mt-1 text-[11px] font-medium text-white/60">{label}</p>
      </div>
    </div>
  );
}

function DonationDialog({ open, onClose, config }: { open: boolean; onClose: () => void; config: CampaignConfig }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("25");
  const [network, setNetwork] = useState("usdt-trc20");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: paymentSettings = {} as Record<string, string> & { wallets?: DonationWallet[] } } = useQuery<Record<string, string> & { wallets?: DonationWallet[] }>({
    queryKey: ["/api/breedskool/payment-settings"],
    enabled: open,
  });

  const wallets = useMemo<DonationWallet[]>(() => {
    if (Array.isArray(paymentSettings.wallets)) {
      return paymentSettings.wallets.filter((wallet) => wallet.isActive !== false && wallet.address);
    }
    return [
      { id: "tron", label: "USDT · TRC-20", currency: "USDT", network: "tron", address: paymentSettings.breedskool_usdt_tron_address || "" },
      { id: "ton", label: "USDT · TON", currency: "USDT", network: "ton", address: paymentSettings.breedskool_usdt_ton_address || "" },
      { id: "bsc", label: "USDT · BEP-20", currency: "USDT", network: "bsc", address: paymentSettings.breedskool_usdt_bnb_address || "" },
    ].filter((wallet) => wallet.address);
  }, [paymentSettings]);

  useEffect(() => {
    if (wallets.length && !wallets.some((wallet) => wallet.id === network)) setNetwork(wallets[0].id);
  }, [wallets, network]);

  const selectedWallet = wallets.find((wallet) => wallet.id === network);
  const donationMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("amount", amount);
      form.append("walletId", network);
      form.append("network", network);
      form.append("donorName", donorName);
      form.append("donorEmail", donorEmail);
      form.append("transactionHash", transactionHash);
      form.append("message", message);
      const response = await fetch("/api/breedskool/campaign/donations", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Donation could not be recorded");
      return body;
    },
    onSuccess: (body) => {
      toast({ title: "Thank you for standing with BreedSkool", description: body.message });
      queryClient.invalidateQueries({ queryKey: ["/api/breedskool/campaign"] });
      onClose();
      setTransactionHash("");
      setDonorName("");
      setDonorEmail("");
      setMessage("");
    },
    onError: (error: any) => toast({ title: "Donation not submitted", description: error.message, variant: "destructive" }),
  });

  function copyWallet() {
    if (!selectedWallet?.address) return;
    navigator.clipboard?.writeText(selectedWallet.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl p-0">
        <div className="bg-slate-950 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white">Support a learner</DialogTitle>
            <DialogDescription className="text-sm text-white/60">Send a manual crypto donation, then share the transaction hash so our team can verify it.</DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-5 p-6">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Donation amount (USDT)</Label>
            <div className="mt-2 flex gap-2">
              {["10", "25", "50", "100"].map((preset) => (
                <button key={preset} type="button" onClick={() => setAmount(preset)} className={`rounded-lg border px-3 py-2 text-sm font-bold ${amount === preset ? "border-violet-600 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600"}`}>${preset}</button>
              ))}
              <Input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" className="h-10 flex-1" placeholder="Other amount" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Choose a donation wallet</Label>
            {wallets.length ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {wallets.map((wallet) => (
                  <button key={wallet.id} type="button" onClick={() => setNetwork(wallet.id)} className={`rounded-xl border px-3 py-3 text-left text-xs font-bold ${network === wallet.id ? "border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-300" : "border-slate-200 text-slate-600"}`}>
                    <span className="block">{wallet.label}</span>
                    <span className="mt-1 block truncate font-mono text-[10px] font-normal opacity-60">{wallet.address}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Crypto wallets are being configured. You can still support the campaign through JustGiving.</div>
            )}
          </div>
          {selectedWallet && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Send to this wallet</p>
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 break-all font-mono text-xs text-slate-800">{selectedWallet.address}</p>
                <button type="button" onClick={copyWallet} className="rounded-lg bg-slate-900 p-2 text-white" aria-label="Copy wallet address">{copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}</button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Send exactly {Number(amount || 0).toLocaleString("en-US")} USDT, then paste the transaction hash below.</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="text-xs font-bold text-slate-600">Your name (optional)</Label><Input value={donorName} onChange={(event) => setDonorName(event.target.value)} className="mt-1.5" placeholder="Your name" /></div>
            <div><Label className="text-xs font-bold text-slate-600">Email (optional)</Label><Input value={donorEmail} onChange={(event) => setDonorEmail(event.target.value)} type="email" className="mt-1.5" placeholder="you@example.com" /></div>
          </div>
          <div><Label className="text-xs font-bold text-slate-600">Transaction hash</Label><Input value={transactionHash} onChange={(event) => setTransactionHash(event.target.value)} className="mt-1.5 font-mono text-xs" placeholder="Paste the hash after sending" /></div>
          <div><Label className="text-xs font-bold text-slate-600">A note of encouragement (optional)</Label><Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1.5 resize-none" rows={3} placeholder="Leave a message for the next cohort…" /></div>
          <Button onClick={() => donationMutation.mutate()} disabled={donationMutation.isPending || !selectedWallet || transactionHash.trim().length < 6} className="h-12 w-full rounded-xl bg-slate-950 font-bold text-white hover:bg-violet-700">{donationMutation.isPending ? "Submitting…" : "Submit donation proof"} <ArrowRight className="ml-2 h-4 w-4" /></Button>
          <p className="text-center text-[11px] text-slate-400">Donations are manually reviewed. Never share your wallet seed phrase or password.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BreedSkoolCampaign() {
  const cms = usePageContent("breedskool_campaign");
  const [donationOpen, setDonationOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [focus, setFocus] = useState<"learn" | "give">("learn");
  const [sessionId] = useState(() => {
    const key = "taskdrip-analytics-session";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, created);
    return created;
  });
  const { data: apiConfig } = useQuery<CampaignConfig>({ queryKey: ["/api/breedskool/campaign"] });
  const config = { ...DEFAULT_CONFIG, ...(apiConfig || {}) };
  const raisedPercent = Math.min(100, Math.round((Number(config.raisedUsd) / Math.max(1, Number(config.goalUsd))) * 100));

  useEffect(() => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/breedskool/campaign", referrer: document.referrer, sessionId }),
    }).catch(() => {});
  }, [sessionId]);

  const { data: pricing = [] } = useQuery<any[]>({ queryKey: ["/api/breedskool/pricing"] });
  const freeCourseFallback = {
    id: "free-foundations",
    courseKey: "free_foundations",
    title: "BreedSkool Foundations — Learn, Build & Earn",
    shortDescription: "A free, practical foundation across the digital skills young Africans need to learn, build and earn.",
    regularPrice: 0,
    discountPrice: 0,
    duration: "Self-paced · 14 lessons",
    isActive: true,
    acceptedPayments: [],
  };
  const freeCourse = pricing.find((course) => course.courseKey === "free_foundations") || freeCourseFallback;
  const registrationCourses = [freeCourse, ...pricing.filter((course) => course.courseKey !== "free_foundations")];
  return (
    <div id="top" className="min-h-screen overflow-hidden bg-[#fbfaf8] text-slate-900">
      <CampaignNav onRegister={() => setRegistrationOpen(true)} onDonate={() => setDonationOpen(true)} />
      <main>
        <section className="relative isolate overflow-hidden bg-slate-950">
          <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: `url(${config.heroImage})` }} />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/45" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />
          <div className="absolute -right-24 top-16 -z-10 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl campaign-breathe" />
          <div className="absolute bottom-0 left-1/3 -z-10 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl campaign-breathe [animation-delay:1.5s]" />
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 sm:pb-28 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.72fr]">
            <div className="max-w-3xl campaign-rise">
              <Badge className="mb-5 border border-amber-300/30 bg-amber-300/15 px-4 py-2 text-xs font-bold text-amber-200"><HeartHandshake className="mr-2 h-3.5 w-3.5" /> {cms.get("hero", "eyebrow", "A practical technology education campaign for young Africans")}</Badge>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">Skills today.<br /><span className="text-amber-300">Opportunities tomorrow.</span></h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-xl">{cms.get("hero", "subtitle", "A free, practical technology course for young Africans — and a clear way for supporters to help more learners get the tools to build a future.")}</p>
              <div className="mt-7 inline-flex rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-sm" role="tablist" aria-label="Choose your path">
                <button type="button" role="tab" aria-selected={focus === "learn"} onClick={() => setFocus("learn")} className={`rounded-xl px-4 py-2.5 text-xs font-black transition-all sm:px-5 ${focus === "learn" ? "bg-white text-slate-950 shadow-lg" : "text-white/65 hover:text-white"}`}>I want to learn</button>
                <button type="button" role="tab" aria-selected={focus === "give"} onClick={() => setFocus("give")} className={`rounded-xl px-4 py-2.5 text-xs font-black transition-all sm:px-5 ${focus === "give" ? "bg-amber-400 text-slate-950 shadow-lg" : "text-white/65 hover:text-white"}`}>I want to give</button>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {focus === "learn" ? (
                  <>
                    <CampaignButton onClick={() => setRegistrationOpen(true)} className="bg-amber-400 text-slate-950 hover:bg-amber-300">Start the free course <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton>
                    <a href="#free-course" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/20">See what you'll learn <ChevronDown className="ml-2 h-4 w-4" /></a>
                  </>
                ) : (
                  <>
                    <CampaignButton onClick={() => setDonationOpen(true)} className="bg-amber-400 text-slate-950 hover:bg-amber-300">Fund a learner <HeartHandshake className="ml-2 h-4 w-4" /></CampaignButton>
                    <CampaignButton href={config.justGivingUrl || JUST_GIVING_URL} external className="border border-white/25 bg-white/10 text-white hover:bg-white/20">Donate on JustGiving <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton>
                  </>
                )}
              </div>
              <p className="mt-4 text-xs font-medium text-white/50">{focus === "learn" ? "No payment required · Online access · Beginner friendly" : "Transparent giving · Crypto or JustGiving · Every gift has a job"}</p>
              <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                <StatPill icon={Users} value={String(config.registrations || 0)} label="registered learners" />
                <StatPill icon={Laptop} value={String(config.studentsWithoutEquipment || 0)} label="need equipment" />
                <StatPill icon={Rocket} value={String(config.studentsEmployed || 0)} label="employed learners" />
                <StatPill icon={HeartHandshake} value={money(config.raisedUsd)} label="raised so far" />
              </div>
            </div>
            <div className="relative hidden lg:block campaign-float">
              <div className="absolute -left-10 top-12 z-10 rounded-2xl border border-white/15 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="h-4 w-4" /></span><div><p className="text-xs font-black text-white">100% free to join</p><p className="text-[10px] text-white/50">Built for beginners</p></div></div>
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-2 shadow-2xl shadow-black/30 backdrop-blur-sm">
                <img src={learnerImage} alt="African learner working on a laptop" className="h-[24rem] w-full rounded-[1.5rem] object-cover" />
                <div className="flex items-center justify-between px-4 py-4">
                  <div><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Your first step</p><p className="mt-1 text-lg font-black text-white">Learn. Build. Earn.</p></div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400 text-slate-950"><ArrowRight className="h-5 w-5" /></span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </section>

        <section id="free-course" className="scroll-mt-24 border-b border-slate-200 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <Badge className="border-0 bg-violet-100 px-3 py-1 text-violet-700">Free for every learner</Badge>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Start with the course BreedSkool gives you.</h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">Register once and get immediate access to a practical 14-lesson foundation. It covers AI, web development, content creation, social media, digital marketing, blockchain safety, entrepreneurship, freelancing and remote work.</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {["AI tools", "Web development", "Content & social", "Digital marketing", "Crypto safety", "Freelancing"].map((topic) => <span key={topic} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{topic}</span>)}
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <CampaignButton onClick={() => setRegistrationOpen(true)} className="bg-violet-700 text-white hover:bg-violet-800">Get free access <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton>
                   <a href="#impact" className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-900 transition-all hover:-translate-y-0.5 hover:bg-slate-50">How it creates impact <ArrowRight className="ml-2 h-4 w-4" /></a>
                </div>
              </div>
              <Card className="overflow-hidden border-violet-100 bg-gradient-to-br from-violet-50 to-amber-50 shadow-xl">
                <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${config.heroImage})` }} />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Featured free course</p><h3 className="mt-2 text-xl font-black text-slate-950">{freeCourse.title}</h3></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">FREE</span></div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{freeCourse.shortDescription}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-white/80 p-3"><p className="font-black text-slate-950">14</p><p className="text-xs text-slate-500">practical lessons</p></div><div className="rounded-xl bg-white/80 p-3"><p className="font-black text-slate-950">0 cost</p><p className="text-xs text-slate-500">no payment required</p></div></div>
                </CardContent>
              </Card>
            </div>
            <div id="stories" className="mt-10 scroll-mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                 { name: "Amina O.", place: "Lagos", quote: "I finally knew what to practise first.", image: learnerImage },
                 { name: "Kofi B.", place: "Accra", quote: "Every module ends with something real to build.", image: storyImage },
                 { name: "Fatima S.", place: "Kano", quote: "Sharing progress made learning less intimidating.", image: classroomImage },
                 { name: "Mandla P.", place: "Johannesburg", quote: "The free course gave me a clear next step.", image: equipmentImage },
               ].map((review) => <div key={review.name} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-1 hover:border-violet-200 hover:bg-white hover:shadow-xl"><div className="flex items-center gap-3"><img src={review.image} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-sm transition-transform group-hover:scale-105" /><div><p className="text-xs font-black text-slate-900">{review.name}</p><p className="text-[11px] text-slate-500">{review.place}</p></div><div className="ml-auto flex gap-0.5" aria-label="5 out of 5 stars">{[1, 2, 3, 4, 5].map((star) => <span key={star} className="text-sm text-amber-500">★</span>)}</div></div><p className="mt-4 text-sm italic leading-relaxed text-slate-600">“{review.quote}”</p></div>)}
            </div>
             <p className="mt-4 text-center text-[11px] text-slate-400">Illustrative learner voices and approved campaign imagery shown for this preview. Verified reviews and consented student portraits will replace them as cohorts share their stories.</p>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:px-8">
            {[
              { icon: Laptop, label: "Equipment", text: "Computers and practical tools for first projects." },
              { icon: Wifi, label: "Connectivity", text: "Reliable internet and learning resources." },
              { icon: Users, label: "Mentorship", text: "People who help learners keep going." },
            ].map((item) => <div key={item.label} className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><item.icon className="h-5 w-5" /></div><div><p className="font-bold">{item.label}</p><p className="text-sm text-slate-500">{item.text}</p></div></div>)}
          </div>
        </section>

        <section id="impact" className="mx-auto grid max-w-7xl scroll-mt-24 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:px-8 lg:py-28">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-violet-700">Why this matters</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">{cms.get("story", "title", "The talent is there. The opportunity isn't.")}</h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              <p>Every day, somewhere in Africa, a young person wakes up with talent, ambition and dreams — but no computer, no reliable internet, no mentor and no opportunity to learn.</p>
              <p>{cms.get("story", "body", "Imagine being a young person in a rural community with no computer, unreliable internet and no technology centre nearby. You may be intelligent, creative and determined, but the modern digital economy can feel like a world you are not allowed to enter.")}</p>
              <p className="font-bold text-slate-900">We believe where someone is born should not determine whether they get a chance to participate in the future.</p>
            </div>
            <div className="mt-7 flex items-center gap-3 border-l-4 border-amber-400 pl-4"><div><p className="font-bold text-slate-900">Abraham Tahbat</p><p className="text-sm text-slate-500">Founder, Breedskool Galaxy Ltd.</p></div></div>
          </div>
          <div className="relative grid grid-cols-5 gap-3">
            <img src={storyImage} alt="Students learning together in a classroom" className="col-span-3 mt-8 h-72 w-full rounded-3xl object-cover shadow-xl sm:h-96" />
            <img src={classroomImage} alt="Students working with a computer" className="col-span-2 h-52 w-full rounded-3xl object-cover shadow-xl sm:h-64" />
            <div className="col-span-2 rounded-3xl bg-amber-400 p-5 sm:p-6"><p className="text-3xl font-black text-slate-950">One</p><p className="mt-1 text-sm font-bold text-slate-800">learner can become a company, a job, and a new example for their community.</p></div>
            <img src={learnerImage} alt="Young person studying on a laptop" className="col-span-3 h-44 w-full rounded-3xl object-cover shadow-xl sm:h-56" />
          </div>
        </section>

        <section className="bg-slate-950 py-20 text-white sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl"><p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-amber-300">What Breedskool makes possible</p><h2 className="text-3xl font-black tracking-tight sm:text-5xl">From a classroom in Africa to the global economy.</h2><p className="mt-5 leading-relaxed text-white/65">Training alone is not enough. Learners need access, practice, people and a bridge to opportunity.</p></div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: BookOpen, title: "Learn practical skills", text: "AI tools, web development, digital marketing, content creation, blockchain and entrepreneurship." },
                { icon: Laptop, title: "Use real equipment", text: "Computers and connectivity turn lessons into websites, digital products and first coding projects." },
                { icon: Users, title: "Find a mentor", text: "Experienced instructors and peers help learners build confidence and keep making progress." },
                { icon: Briefcase, title: "Move toward work", text: "Freelancing, remote work, client service, entrepreneurship and job placement pathways." },
              ].map((item) => <Card key={item.title} className="border-white/10 bg-white/[0.06] text-white"><CardContent className="p-6"><item.icon className="h-7 w-7 text-amber-300" /><h3 className="mt-5 font-black">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-white/60">{item.text}</p></CardContent></Card>)}
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <img src={equipmentImage} alt="Collaborative workspace with computers" className="h-64 w-full rounded-3xl object-cover sm:h-80" />
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-7"><h3 className="text-2xl font-black">We don't want young people to simply receive certificates.</h3><p className="mt-4 leading-relaxed text-white/65">We want them to build websites, create products, serve clients, use AI, work remotely and start companies that strengthen their communities.</p><div className="mt-6 flex flex-wrap gap-2">{["Build", "Create", "Serve", "Earn", "Employ"].map((word) => <span key={word} className="rounded-full bg-amber-300/15 px-3 py-1.5 text-xs font-bold text-amber-200">{word}</span>)}</div></div>
            </div>
          </div>
        </section>

        <section id="projects" className="scroll-mt-24 bg-[#f3f0ff] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-violet-700">Work built through BreedSkool</p>
                <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Learning becomes real when students ship.</h2>
                <p className="mt-5 text-base leading-relaxed text-slate-600">Alongside our instructors and product team, learners practise by building useful digital projects for real communities. These selected builds show the kind of portfolio, confidence and opportunity your support helps unlock.</p>
              </div>
              <a href={config.developerUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700">Hire a developer for your brand <ArrowRight className="h-4 w-4" /></a>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                { title: "Taskdrip creator marketplace", tag: "Team build · Platform", text: "A Web3 campaign platform that connects brands with creators, structured tasks and transparent crypto rewards.", image: storyImage, accent: "from-violet-700 to-indigo-900" },
                { title: "Community commerce hub", tag: "Student build · Marketplace", text: "A mobile-first storefront concept helping local makers present their products, take orders and reach new customers.", image: equipmentImage, accent: "from-amber-500 to-orange-700" },
                { title: "Learn-to-earn starter kit", tag: "Team + students · Education", text: "A practical learning experience that turns lessons into small projects, public portfolios and a clearer pathway to paid work.", image: learnerImage, accent: "from-cyan-600 to-blue-900" },
              ].map((project) => (
                <article key={project.title} className="group overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
                  <div className="relative h-52 overflow-hidden">
                    <img src={project.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <div className={`absolute inset-0 bg-gradient-to-tr ${project.accent} opacity-45 mix-blend-multiply`} />
                    <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-slate-950/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white backdrop-blur">{project.tag}</span>
                  </div>
                  <div className="p-6"><h3 className="text-xl font-black text-slate-950">{project.title}</h3><p className="mt-3 text-sm leading-relaxed text-slate-600">{project.text}</p><div className="mt-5 flex items-center gap-2 text-xs font-black text-violet-700"><CheckCircle2 className="h-4 w-4" /> Built to be useful</div></div>
                </article>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-5 rounded-[1.75rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">A partnership that compounds</p><h3 className="mt-3 text-2xl font-black sm:text-3xl">Brands that help fund students get huge discounts on their projects.</h3><p className="mt-3 text-sm leading-relaxed text-white/65">Support a learner, then access our top developers at a preferred rate when your brand is ready to build, improve or scale its next project.</p></div>
              <a href={config.developerUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-300">Explore brand development <ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-24"><p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-violet-700">Your support has a job</p><h2 className="text-3xl font-black tracking-tight sm:text-5xl">Behind every donation is a person.</h2><p className="mt-5 leading-relaxed text-slate-600">Your donation is not simply paying for equipment. It is helping put a tool in someone's hands, knowledge in someone's mind and confidence in someone's heart.</p><CampaignButton onClick={() => setDonationOpen(true)} className="mt-7 bg-slate-950 text-white hover:bg-violet-700">Help equip a learner <HeartHandshake className="ml-2 h-4 w-4" /></CampaignButton></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { before: "No computer", after: "A first coding project", icon: Laptop },
                { before: "No internet", after: "Access to the world", icon: Wifi },
                { before: "No mentor", after: "Guidance and confidence", icon: Users },
                { before: "No opportunity", after: "A real pathway", icon: Rocket },
              ].map(({ before, after, icon: Icon }) => <div key={before} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><Icon className="h-6 w-6 text-violet-700" /><p className="mt-5 text-sm text-slate-400 line-through">{before}</p><div className="my-2 h-px w-8 bg-amber-400" /><p className="text-lg font-black text-slate-900">{after}</p></div>)}
            </div>
          </div>
        </section>

        <section id="support" className="scroll-mt-24 bg-amber-50 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-amber-700">Campaign progress</p>
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Help us give talent a chance.</h2>
            <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-slate-600">We are raising funds to establish training programmes, acquire computers, provide connectivity and support instructors and mentors in communities where opportunities are hardest to find.</p>
            <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-amber-200 bg-white p-6 text-left shadow-xl sm:p-8">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-bold text-slate-500">Raised so far</p><p className="mt-1 text-4xl font-black text-slate-950">{money(config.raisedUsd)}</p></div><p className="text-sm font-bold text-slate-500">Goal <span className="text-slate-900">{money(config.goalUsd)}</span></p></div>
              <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${raisedPercent}%` }} /></div>
              <div className="mt-3 flex justify-between text-xs font-bold text-slate-500"><span>{raisedPercent}% funded</span><span>{Number(config.supporters || 0).toLocaleString()} supporters</span></div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row"><CampaignButton onClick={() => setDonationOpen(true)} className="flex-1 bg-slate-950 text-white hover:bg-violet-700">Donate with crypto <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton><CampaignButton href={config.justGivingUrl || JUST_GIVING_URL} external className="flex-1 border border-slate-200 bg-white text-slate-900 hover:bg-slate-50">Donate on JustGiving <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-violet-700 p-8 text-white sm:p-10"><School className="h-8 w-8 text-amber-300" /><h2 className="mt-6 text-3xl font-black">Ready to take your first step?</h2><p className="mt-4 leading-relaxed text-white/75">Register for free online access and start learning practical skills with a community of ambitious young Africans.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><CampaignButton onClick={() => setRegistrationOpen(true)} className="bg-white text-violet-800 hover:bg-slate-100">Join the free course <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton><a href="#free-course" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-bold text-white transition-colors hover:bg-white/20">See the curriculum</a></div></div>
            <div className="rounded-3xl bg-slate-950 p-8 text-white sm:p-10"><Briefcase className="h-8 w-8 text-amber-300" /><h2 className="mt-6 text-3xl font-black">Are you a brand or sponsor?</h2><p className="mt-4 leading-relaxed text-white/65">Partner with Breedskool by sponsoring equipment, supporting a cohort, offering mentorship or creating a pathway into work.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><CampaignButton href={config.sponsorWhatsAppUrl} external className="bg-amber-400 text-slate-950 hover:bg-amber-300"><MessageCircle className="mr-2 h-4 w-4" /> Chat with the team</CampaignButton><CampaignButton href={config.developerUrl} external className="border border-white/20 bg-white/10 text-white hover:bg-white/20">Developer page <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton></div></div>
          </div>
          <div className="mt-16 rounded-3xl border border-slate-200 bg-white p-7 sm:p-10"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">{cms.get("contact", "student_label", "For African students joining the training")}</p><h3 className="mt-2 text-2xl font-black">Bring a friend. Join the community. Stay informed.</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Join Telegram for updates, cohort announcements and opportunities. Students can also chat with the training team directly on WhatsApp.</p></div><div className="flex flex-col gap-3 sm:flex-row"><CampaignButton href={config.telegramUrl} external className="bg-[#229ED9] text-white hover:bg-[#188bbf]"><Send className="mr-2 h-4 w-4" /> Join Telegram</CampaignButton><CampaignButton href={config.studentWhatsAppUrl} external className="bg-[#25D366] text-white hover:bg-[#1db954]"><MessageCircle className="mr-2 h-4 w-4" /> Chat as a student</CampaignButton></div></div></div>
        </section>

        <section className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">A note on our stories</p><h2 className="mt-3 text-3xl font-black tracking-tight">The people behind the possibility.</h2><p className="mt-4 text-sm leading-relaxed text-slate-500">These are the kinds of outcomes Breedskool is building toward. We will publish verified learner stories and approved photos as each cohort gives permission.</p></div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { name: "The first line of code", role: "A learner with access to a computer", image: learnerImage, quote: "A practical lesson becomes powerful when a learner can practise it immediately." },
                { name: "A room full of peers", role: "A cohort learning together", image: classroomImage, quote: "Community turns a difficult first step into something a young person can keep returning to." },
                { name: "A pathway to work", role: "Skills, mentorship and opportunity", image: storyImage, quote: "The goal is not a certificate on a wall. It is confidence, a portfolio and a next step." },
              ].map((story) => <Card key={story.name} className="overflow-hidden border-slate-200"><img src={story.image} alt="" className="h-48 w-full object-cover" /><CardContent className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-violet-700">{story.role}</p><h3 className="mt-2 font-black">{story.name}</h3><p className="mt-3 text-sm italic leading-relaxed text-slate-500">“{story.quote}”</p></CardContent></Card>)}
            </div>
          </div>
        </section>
        <section className="bg-slate-950 py-20 text-center text-white sm:py-24"><div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8"><Sparkles className="mx-auto h-8 w-8 text-amber-300" /><h2 className="mt-5 text-3xl font-black sm:text-5xl">{cms.get("cta", "title", "Will you help us open the door?")}</h2><p className="mt-5 leading-relaxed text-white/65">{cms.get("cta", "subtitle", "Every donation matters. And if you cannot donate, sharing this campaign can still help us reach the right people.")}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><CampaignButton onClick={() => setDonationOpen(true)} className="bg-amber-400 text-slate-950 hover:bg-amber-300">Support Breedskool <HeartHandshake className="ml-2 h-4 w-4" /></CampaignButton><CampaignButton href={config.justGivingUrl || JUST_GIVING_URL} external className="border border-white/20 bg-white/10 text-white hover:bg-white/20">Share on JustGiving <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton></div></div></section>
      </main>
       <div className="fixed inset-x-3 bottom-3 z-30 flex gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur-md sm:hidden">
         <button type="button" onClick={() => setRegistrationOpen(true)} className="flex-1 rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white">Join free</button>
         <button type="button" onClick={() => setDonationOpen(true)} className="flex-1 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950">Fund a learner</button>
       </div>
      <DonationDialog open={donationOpen} onClose={() => setDonationOpen(false)} config={config} />
      <RegistrationModal open={registrationOpen} onClose={() => setRegistrationOpen(false)} courses={registrationCourses} initialDeliveryMode="online" initialCourseKey="free_foundations" />
    </div>
  );
}