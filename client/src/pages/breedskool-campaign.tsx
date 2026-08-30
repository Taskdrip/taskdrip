import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
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
import {
  ArrowRight, BookOpen, Briefcase, Check, CheckCircle2, ChevronRight, Copy,
  HeartHandshake, Laptop, Mail, MapPin, Menu, MessageCircle, Play, Rocket,
  School, Send, ShieldCheck, Sparkles, Users, Wifi, X,
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

const DEFAULT_CONFIG: CampaignConfig = {
  goalUsd: 25000,
  raisedUsd: 0,
  supporters: 0,
  studentsTarget: 100,
  studentsTrained: 0,
  studentsEmployed: 0,
  studentsWithoutEquipment: 100,
  heroImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1800&q=85&auto=format&fit=crop",
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
  return `$${Math.max(0, Number(value || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer">{button}</a>
    : <Link href={href}>{button}</Link>;
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
  const [network, setNetwork] = useState("tron");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: paymentSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/breedskool/payment-settings"],
    enabled: open,
  });

  const wallets = useMemo(() => [
    { id: "tron", label: "USDT · TRC-20", address: paymentSettings.breedskool_usdt_tron_address || "" },
    { id: "ton", label: "USDT · TON", address: paymentSettings.breedskool_usdt_ton_address || "" },
    { id: "bsc", label: "USDT · BEP-20", address: paymentSettings.breedskool_usdt_bnb_address || "" },
  ].filter((wallet) => wallet.address), [paymentSettings]);

  useEffect(() => {
    if (wallets.length && !wallets.some((wallet) => wallet.id === network)) setNetwork(wallets[0].id);
  }, [wallets, network]);

  const selectedWallet = wallets.find((wallet) => wallet.id === network);
  const donationMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("amount", amount);
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
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Choose network</Label>
            {wallets.length ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {wallets.map((wallet) => (
                  <button key={wallet.id} type="button" onClick={() => setNetwork(wallet.id)} className={`rounded-xl border px-2 py-3 text-xs font-bold ${network === wallet.id ? "border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-300" : "border-slate-200 text-slate-600"}`}>{wallet.label}</button>
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
              <p className="mt-2 text-xs text-slate-500">Send exactly {money(Number(amount))} USDT, then paste the transaction hash below.</p>
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

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-slate-900">
      <NavigationFixed />
      <main>
        <section className="relative isolate overflow-hidden bg-slate-950">
          <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: `url(${config.heroImage})` }} />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/45" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 sm:pb-28 lg:px-8">
            <div className="max-w-3xl">
              <Badge className="mb-5 border border-amber-300/30 bg-amber-300/15 px-4 py-2 text-xs font-bold text-amber-200"><HeartHandshake className="mr-2 h-3.5 w-3.5" /> {cms.get("hero", "eyebrow", "A practical technology education campaign for young Africans")}</Badge>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">{cms.get("hero", "title", "Give a Young African a Chance to Build the Future")}</h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-xl">{cms.get("hero", "subtitle", "Talent is everywhere. Opportunity is not. Help us put skills, equipment, mentorship and a real pathway into the hands of young people who are ready to learn.")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CampaignButton href="/breedskool" className="bg-amber-400 text-slate-950 hover:bg-amber-300">Join the training <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton>
                <CampaignButton onClick={() => setDonationOpen(true)} className="border border-white/25 bg-white/10 text-white hover:bg-white/20">Support a learner <HeartHandshake className="ml-2 h-4 w-4" /></CampaignButton>
                <CampaignButton href={config.justGivingUrl || JUST_GIVING_URL} external className="border border-white/25 bg-transparent text-white hover:bg-white/10">Donate on JustGiving <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton>
              </div>
              <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                <StatPill icon={Users} value={String(config.registrations || 0)} label="registered learners" />
                <StatPill icon={Laptop} value={String(config.studentsWithoutEquipment || 0)} label="need equipment" />
                <StatPill icon={Rocket} value={String(config.studentsEmployed || 0)} label="employed learners" />
                <StatPill icon={HeartHandshake} value={money(config.raisedUsd)} label="raised so far" />
              </div>
            </div>
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

        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:px-8 lg:py-28">
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

        <section className="bg-amber-50 py-20 sm:py-24">
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
            <div className="rounded-3xl bg-violet-700 p-8 text-white sm:p-10"><School className="h-8 w-8 text-amber-300" /><h2 className="mt-6 text-3xl font-black">Are you ready to join the training?</h2><p className="mt-4 leading-relaxed text-white/75">Register for onsite or online training and get access to mentorship, practical tools, training equipment and pathways toward jobs and remote opportunities.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><CampaignButton href="/breedskool" className="bg-white text-violet-800 hover:bg-slate-100">View training programs <ArrowRight className="ml-2 h-4 w-4" /></CampaignButton><CampaignButton href="/login" className="border border-white/30 bg-white/10 text-white hover:bg-white/20">Sign in</CampaignButton></div></div>
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
      <Footer />
      <DonationDialog open={donationOpen} onClose={() => setDonationOpen(false)} config={config} />
    </div>
  );
}