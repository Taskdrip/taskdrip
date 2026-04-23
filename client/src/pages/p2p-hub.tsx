import { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowRight, Bitcoin, Briefcase, CheckCircle, ChevronDown, Coins,
  Filter, Globe, Info, Lock, MapPin, MessageSquare, Package,
  Plus, Search, Settings, Shield, ShieldCheck, Sparkles,
  Star, Store, Truck, Users, Wallet, X, Zap, BookOpen,
  ChevronRight, ChevronLeft, AlertCircle, TrendingUp, Box, Trash2, PlusCircle,
} from "lucide-react";

const COUNTRIES = [
  "Nigeria","Ghana","Kenya","South Africa","Egypt","Morocco","Tanzania","Ethiopia",
  "United States","United Kingdom","Canada","Australia","Germany","France","Netherlands",
  "India","Pakistan","Bangladesh","Philippines","Indonesia","Vietnam","Thailand","Malaysia",
  "Brazil","Argentina","Mexico","Colombia","Peru","Chile",
  "UAE","Saudi Arabia","Turkey","Ukraine","Russia","Poland",
  "China","Japan","South Korea","Singapore","Hong Kong","Taiwan",
];

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
];

const CRYPTO_ASSETS = ["USDT","BTC","TON","TRX","XRP","DOGE","PI","BNB","LTC"];

// Only crypto payments — low gas fee networks
const PAYMENT_METHODS = [
  "USDT TRC20 (TRON)",
  "USDT BEP20 (BSC)",
  "TON (Telegram Open Network)",
  "Pi Network (Pi Coin)",
  "BTC (Bitcoin)",
  "TRX (TRON)",
  "XRP (Ripple)",
  "DOGE (Dogecoin)",
  "BNB (BEP20)",
  "LTC (Litecoin)",
];

// Map payment method → wallet key on user profile
const PAYMENT_TO_WALLET: Record<string, { key: string; label: string }> = {
  "USDT TRC20 (TRON)":           { key: "usdtTronWallet", label: "USDT TRC20 Wallet" },
  "USDT BEP20 (BSC)":            { key: "usdtBscWallet",  label: "USDT BEP20 Wallet" },
  "TON (Telegram Open Network)": { key: "tonWallet",      label: "TON Wallet" },
  "Pi Network (Pi Coin)":        { key: "piWallet",       label: "Pi Network Wallet" },
  "BTC (Bitcoin)":               { key: "btcWallet",      label: "Bitcoin Wallet" },
  "TRX (TRON)":                  { key: "usdtTronWallet", label: "TRON (TRX) Wallet" },
  "XRP (Ripple)":                { key: "btcWallet",      label: "XRP/Ripple Wallet" },
  "DOGE (Dogecoin)":             { key: "btcWallet",      label: "DOGE Wallet" },
  "BNB (BEP20)":                 { key: "usdtBscWallet",  label: "BNB (BEP20) Wallet" },
  "LTC (Litecoin)":              { key: "btcWallet",      label: "Litecoin Wallet" },
};

const CATEGORY_TABS = [
  { key: "all",      label: "All",              icon: Store,   color: "text-gray-600" },
  { key: "crypto",   label: "Crypto",           icon: Coins,   color: "text-orange-600" },
  { key: "physical", label: "Physical Products",icon: Box,     color: "text-emerald-600", type: "product", subtype: "physical" },
  { key: "digital",  label: "Digital Products", icon: Package, color: "text-blue-600",   type: "product", subtype: "digital" },
  { key: "service",  label: "Services",         icon: Briefcase,color:"text-purple-600" },
];

const GUIDE_STEPS = [
  { icon: Settings,   title: "Set Your Trading Profile",  body: "Set your country, preferred currency, and crypto wallets in Trading Profile so buyers and sellers can find you easily and you receive payments correctly." },
  { icon: Search,     title: "Browse & Filter Listings",  body: "Use the filter bar to narrow listings by country, currency, price range, and category. Find exactly what you're looking for." },
  { icon: Shield,     title: "Escrow Protection",         body: "All trades are backed by admin-controlled escrow. Your funds are only released after you confirm receipt of your product, crypto, or service." },
  { icon: MessageSquare, title: "Private Deal Room",      body: "Each trade has a private Deal Room — a secure chat between buyer, seller, and admin. Use it to share payment proof, tracking info, and resolve questions." },
  { icon: CheckCircle, title: "Confirm & Complete",       body: "Only confirm receipt after verifying you have received your item. Once confirmed, admin releases funds to the seller. Never confirm before receiving." },
  { icon: AlertCircle, title: "Dispute Resolution",       body: "Facing an issue? Open a dispute from the Deal Room. Our admin team reviews all evidence and makes a fair decision within 24–48 hours." },
];

function money(v: any, currency?: string) {
  const sym = CURRENCIES.find(c => c.code === (currency || "USD"))?.symbol || "$";
  return sym + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCurrencySymbol(code: string) {
  return CURRENCIES.find(c => c.code === code)?.symbol || "$";
}

function getTypeColor(type: string, subtype?: string | null) {
  if (type === "crypto") return "bg-orange-100 text-orange-800 border-orange-200";
  if (type === "product" && subtype === "physical") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (type === "product" && subtype === "digital") return "bg-blue-100 text-blue-800 border-blue-200";
  if (type === "product") return "bg-blue-100 text-blue-800 border-blue-200";
  if (type === "service") return "bg-purple-100 text-purple-800 border-purple-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function getTypeLabel(type: string, subtype?: string | null) {
  if (type === "crypto") return "Crypto";
  if (type === "product" && subtype === "physical") return "Physical Product";
  if (type === "product" && subtype === "digital") return "Digital Product";
  if (type === "product") return "Product";
  if (type === "service") return "Service";
  return type;
}

// ── Guide Bot ─────────────────────────────────────────────────────────────────
function GuideBot({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(0);
  const { icon: Icon, title, body } = GUIDE_STEPS[step];
  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 bg-gray-900 border border-violet-700/50 rounded-2xl shadow-2xl shadow-violet-900/30 overflow-hidden" data-testid="guide-bot">
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-700 to-purple-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-white" />
          <span className="text-white font-bold text-sm">P2P Trade Guide</span>
          <Badge className="bg-white/20 text-white text-xs border-0 ml-1">{step + 1}/{GUIDE_STEPS.length}</Badge>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" data-testid="guide-bot-close">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm mb-1">{title}</p>
            <p className="text-gray-400 text-xs leading-relaxed">{body}</p>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          {GUIDE_STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)} className={`flex-1 h-1 rounded-full transition-colors ${i === step ? "bg-violet-500" : "bg-gray-700 hover:bg-gray-600"}`} data-testid={`guide-step-dot-${i}`} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 border-gray-700 text-gray-400 hover:bg-gray-800 h-8 text-xs" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} data-testid="guide-prev">Prev</Button>
          <Button size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700 h-8 text-xs" onClick={() => setStep(s => Math.min(GUIDE_STEPS.length - 1, s + 1))} disabled={step === GUIDE_STEPS.length - 1} data-testid="guide-next">Next <ChevronRight className="w-3 h-3 ml-1" /></Button>
        </div>
      </div>
    </div>
  );
}

// ── Wallet types ───────────────────────────────────────────────────────────────
interface P2PWallet {
  id: string;
  crypto: string;
  network: string;
  address: string;
  isActive: boolean;
  isDefault: boolean;
  placeholder?: string;
}

const DEFAULT_P2P_WALLETS: P2PWallet[] = [
  { id: "default-usdt-ton",  crypto: "USDT", network: "TON",        address: "", isActive: true, isDefault: true, placeholder: "UQxx... TON wallet address" },
  { id: "default-usdt-tron", crypto: "USDT", network: "TRON (TRC20)", address: "", isActive: true, isDefault: true, placeholder: "TXxx... TRON wallet address" },
  { id: "default-usdt-bsc",  crypto: "USDT", network: "BSC (BEP20)", address: "", isActive: true, isDefault: true, placeholder: "0x... BSC wallet address" },
  { id: "default-pi",        crypto: "PI",   network: "Pi Network",  address: "", isActive: true, isDefault: true, placeholder: "Your Pi username or wallet address" },
];

function buildInitialWallets(user: any): P2PWallet[] {
  if (user?.p2pWallets && Array.isArray(user.p2pWallets) && user.p2pWallets.length > 0) {
    return user.p2pWallets.map((w: any) => ({
      ...w,
      placeholder: DEFAULT_P2P_WALLETS.find(d => d.id === w.id)?.placeholder || "",
    }));
  }
  return DEFAULT_P2P_WALLETS.map(w => {
    let address = "";
    if (w.id === "default-usdt-ton")  address = user?.tonWallet || "";
    if (w.id === "default-usdt-tron") address = user?.usdtTronWallet || "";
    if (w.id === "default-usdt-bsc")  address = user?.usdtBscWallet || "";
    if (w.id === "default-pi")        address = user?.piWallet || "";
    return { ...w, address };
  });
}

// ── P2P Settings Modal ────────────────────────────────────────────────────────
function P2PSettingsModal({ user, onClose }: { user: any; onClose: () => void }) {
  const { toast } = useToast();
  const [country, setCountry] = useState(user?.country || "");
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferredCurrency || "USD");
  const [wallets, setWallets] = useState<P2PWallet[]>(() => buildInitialWallets(user));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCrypto, setNewCrypto] = useState("");
  const [newNetwork, setNewNetwork] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const updateWallet = (id: string, field: keyof P2PWallet, value: any) => {
    setWallets(ws => ws.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const addCustomWallet = () => {
    if (!newCrypto.trim() || !newNetwork.trim()) {
      toast({ title: "Required fields missing", description: "Please enter both cryptocurrency name and network.", variant: "destructive" });
      return;
    }
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setWallets(ws => [...ws, { id, crypto: newCrypto.trim().toUpperCase(), network: newNetwork.trim(), address: newAddress.trim(), isActive: true, isDefault: false }]);
    setNewCrypto(""); setNewNetwork(""); setNewAddress("");
    setShowAddForm(false);
  };

  const removeWallet = (id: string) => {
    setWallets(ws => ws.filter(w => w.id !== id));
  };

  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/user/p2p-settings", {
      country,
      preferredCurrency,
      p2pWallets: wallets.map(({ placeholder: _p, ...w }) => w),
    }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Trading profile saved!", description: "Your country, currency, and wallets are updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const defaultWallets = wallets.filter(w => w.isDefault);
  const customWallets  = wallets.filter(w => !w.isDefault);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" data-testid="modal-p2p-settings">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-gray-100 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-lg">Trading Profile</h2>
              <p className="text-gray-500 text-xs">Wallets, country & currency for payments</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors" data-testid="close-settings-modal"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Info */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-blue-700 text-xs leading-relaxed">Your wallets are used to <strong>receive payments</strong> from buyers and for <strong>refunds</strong> in disputes. Add the address you want to use for each network.</p>
          </div>

          {/* Country & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Your Country</Label>
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white" data-testid="select-country">
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Preferred Currency</Label>
              <select value={preferredCurrency} onChange={e => setPreferredCurrency(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white" data-testid="select-preferred-currency">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Default Wallets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-violet-500" /> Default Wallets
              </p>
              <span className="text-[10px] text-gray-400 font-medium">All wallets are active</span>
            </div>
            <div className="space-y-3">
              {defaultWallets.map(w => (
                <div key={w.id} className="rounded-xl border-2 border-violet-200 bg-violet-50/30 p-3 transition-colors" data-testid={`wallet-card-${w.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] bg-violet-600 text-white">
                        {w.crypto.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-xs">{w.crypto}</p>
                        <p className="text-gray-400 text-[10px]">{w.network}</p>
                      </div>
                      <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase ml-1">Low Gas</span>
                    </div>
                  </div>
                  <Input
                    value={w.address}
                    onChange={e => updateWallet(w.id, "address", e.target.value)}
                    placeholder={w.placeholder || `Enter ${w.crypto} ${w.network} address`}
                    className="rounded-lg font-mono text-xs h-8 bg-white"
                    data-testid={`input-wallet-address-${w.id}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Custom / Additional Wallets */}
          {customWallets.length > 0 && (
            <div>
              <p className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-500" /> Additional Wallets
              </p>
              <div className="space-y-3">
                {customWallets.map(w => (
                  <div key={w.id} className="rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-3 transition-colors" data-testid={`wallet-card-${w.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] bg-emerald-600 text-white">
                          {w.crypto.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-xs">{w.crypto}</p>
                          <p className="text-gray-400 text-[10px]">{w.network}</p>
                        </div>
                      </div>
                      <button onClick={() => removeWallet(w.id)} className="text-red-400 hover:text-red-600 transition-colors" data-testid={`remove-wallet-${w.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Input
                      value={w.address}
                      onChange={e => updateWallet(w.id, "address", e.target.value)}
                      placeholder={`Enter ${w.crypto} ${w.network} wallet address`}
                      className="rounded-lg font-mono text-xs h-8 bg-white"
                      data-testid={`input-wallet-address-${w.id}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Cryptocurrency */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-3 text-sm font-semibold text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors"
              data-testid="button-add-crypto"
            >
              <Plus className="w-4 h-4" /> Add Cryptocurrency
            </button>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/30 p-4 space-y-3" data-testid="add-crypto-form">
              <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-violet-500" /> Add Custom Cryptocurrency
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Cryptocurrency Name *</Label>
                  <Input value={newCrypto} onChange={e => setNewCrypto(e.target.value)} placeholder="e.g. BTC, ETH, SOL" className="rounded-lg text-xs h-8" data-testid="input-new-crypto" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Network *</Label>
                  <Input value={newNetwork} onChange={e => setNewNetwork(e.target.value)} placeholder="e.g. Bitcoin, ERC20, SOL" className="rounded-lg text-xs h-8" data-testid="input-new-network" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Wallet Address</Label>
                <Input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Enter wallet address (optional, add later)" className="rounded-lg font-mono text-xs h-8" data-testid="input-new-address" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700 rounded-lg h-8 text-xs" onClick={addCustomWallet} data-testid="button-confirm-add-crypto">Add Wallet</Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-lg h-8 text-xs border-gray-200" onClick={() => { setShowAddForm(false); setNewCrypto(""); setNewNetwork(""); setNewAddress(""); }} data-testid="button-cancel-add-crypto">Cancel</Button>
              </div>
            </div>
          )}

          {/* Save */}
          <Button
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 font-bold py-3"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            data-testid="button-save-p2p-settings"
          >
            {save.isPending ? "Saving..." : "Save Trading Profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Create Listing Dialog ──────────────────────────────────────────────────────
type TaskAddonEntry = { task: string; platform: string; actionLink: string };

function CreateListingDialog({ user, open, onClose, defaultType }: { user: any; open: boolean; onClose: () => void; defaultType?: string }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    listingType: defaultType || "crypto",
    productSubtype: "digital",
    title: "",
    description: "",
    price: "",
    currency: user?.preferredCurrency || "USD",
    minOrder: "",
    maxOrder: "",
    cryptoAsset: "USDT",
    paymentMethod: "USDT TRC20 (TRON)",
    country: user?.country || "",
    shippingInfo: "",
    tdripPointsPerParticipant: "",
    tdripParticipantLimit: "",
    featuredImage: null as File | null,
  });

  const [taskAddons, setTaskAddons] = useState<TaskAddonEntry[]>([{ task: "", platform: "Instagram", actionLink: "" }]);

  const addTaskAddon = () => setTaskAddons(prev => [...prev, { task: "", platform: "Instagram", actionLink: "" }]);
  const removeTaskAddon = (i: number) => setTaskAddons(prev => prev.filter((_, idx) => idx !== i));
  const updateTaskAddon = (i: number, field: keyof TaskAddonEntry, value: string) =>
    setTaskAddons(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  const createListing = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && k !== "featuredImage") fd.append(k, String(v));
      });
      const validAddons = taskAddons.filter(t => t.task.trim()).map(t => ({
        task: t.task.trim(),
        platform: t.platform,
        actionLink: t.actionLink.trim() || undefined,
        requiredProof: "Profile link or screenshot",
      }));
      fd.set("taskAddons", JSON.stringify(validAddons));
      if (form.featuredImage) fd.append("featuredImage", form.featuredImage);
      const res = await fetch("/api/p2p/listings", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create listing");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Listing submitted!", description: "Our team will review it within a few hours." });
      onClose();
      queryClient.invalidateQueries({ queryKey: ["/api/p2p/listings"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isPhysical = form.listingType === "product" && form.productSubtype === "physical";
  const isCrypto = form.listingType === "crypto";
  const tdripPoints = Number(form.tdripPointsPerParticipant || 0);
  const tdripLimit = Number(form.tdripParticipantLimit || 0);
  const tdripEscrowUsd = (tdripPoints * tdripLimit) / 100;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Plus className="w-5 h-5 text-violet-600" /> Create P2P Listing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Category */}
          <div>
            <Label className="text-sm font-bold mb-2 block">Category</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { v: "crypto",  sub: "",         label: "🔗 Crypto Trade",       desc: "Buy/sell crypto" },
                { v: "product", sub: "physical",  label: "📦 Physical Product",   desc: "Ship to buyer" },
                { v: "product", sub: "digital",   label: "💾 Digital Product",    desc: "Files/access" },
                { v: "service", sub: "",          label: "💼 Service",            desc: "Complete work" },
              ].map(opt => (
                <button
                  key={opt.v + opt.sub}
                  onClick={() => setForm(f => ({ ...f, listingType: opt.v, productSubtype: opt.sub }))}
                  className={`p-3 rounded-xl border text-left transition-all ${form.listingType === opt.v && form.productSubtype === opt.sub ? "border-violet-500 bg-violet-50 ring-1 ring-violet-400" : "border-gray-200 hover:border-gray-300"}`}
                  data-testid={`btn-category-${opt.v}-${opt.sub}`}
                >
                  <p className="font-bold text-xs text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="text-sm font-bold mb-1.5 block">Listing Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={isCrypto ? "e.g. Sell 500 USDT fast (TRC20)" : isPhysical ? "e.g. iPhone 15 Pro Max 256GB Sealed" : "e.g. SEO Article Pack — 5 Articles"} className="rounded-xl" data-testid="input-listing-title" />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-bold mb-1.5 block">Description *</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder={isCrypto ? "Describe the trade: speed, network, any verification required..." : isPhysical ? "Describe the product condition, model, specifications, warranty..." : "Describe what the service includes, timeline, deliverables..."} className="rounded-xl" data-testid="input-listing-description" />
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Price *</Label>
              <Input type="number" min="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" className="rounded-xl" data-testid="input-listing-price" />
            </div>
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Currency *</Label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" data-testid="select-currency">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
            {isCrypto && (
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Crypto Asset</Label>
                <select value={form.cryptoAsset} onChange={e => setForm(f => ({ ...f, cryptoAsset: e.target.value }))} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" data-testid="select-crypto-asset">
                  {CRYPTO_ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Min/Max Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Min Order ({form.currency})</Label>
              <Input type="number" min="0" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} placeholder="e.g. 50" className="rounded-xl" data-testid="input-min-order" />
            </div>
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Max Order ({form.currency})</Label>
              <Input type="number" min="0" value={form.maxOrder} onChange={e => setForm(f => ({ ...f, maxOrder: e.target.value }))} placeholder="e.g. 1000" className="rounded-xl" data-testid="input-max-order" />
            </div>
          </div>

          {/* Payment method + Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Payment Method *</Label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" data-testid="select-payment-method">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Country / Region *</Label>
              <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" data-testid="select-listing-country">
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Shipping info for physical products */}
          {isPhysical && (
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Shipping Information</Label>
              <Textarea value={form.shippingInfo} onChange={e => setForm(f => ({ ...f, shippingInfo: e.target.value }))} rows={3} placeholder="Describe shipping: carrier, estimated days, countries you ship to, policies..." className="rounded-xl" data-testid="input-shipping-info" />
            </div>
          )}

          {/* Featured image */}
          <div>
            <Label className="text-sm font-bold mb-1.5 block">Cover Image (optional)</Label>
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center cursor-pointer hover:border-violet-400 transition-colors" onClick={() => document.getElementById("listing-img-upload")?.click()}>
              {form.featuredImage ? (
                <p className="text-green-600 font-semibold text-sm">✓ {form.featuredImage.name}</p>
              ) : (
                <p className="text-gray-400 text-sm">Click to upload image</p>
              )}
            </div>
            <input id="listing-img-upload" type="file" accept="image/*" className="hidden" onChange={e => setForm(f => ({ ...f, featuredImage: e.target.files?.[0] || null }))} data-testid="input-listing-image" />
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Label className="text-sm font-bold text-violet-950">Optional $TDRIP task add-on</Label>
                <p className="text-xs text-violet-700 mt-1">
                  Reward users for a small action tied to this listing, like following your shop or commenting on a post. 100 $TDRIP = $1.
                </p>
              </div>
              <div className="flex-shrink-0 rounded-xl bg-white border border-violet-200 px-3 py-2 text-right">
                <p className="text-xs text-violet-500 font-medium">Your balance</p>
                <p className="font-black text-violet-900 text-sm">{(user as any)?.totalPoints?.toLocaleString() || 0} <span className="text-violet-500 font-semibold">$TDRIP</span></p>
                {((user as any)?.totalPoints || 0) < 500 && (
                  <Link href="/wallet" className="text-xs text-violet-600 hover:underline font-semibold">+ Top Up</Link>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {taskAddons.map((addon, i) => (
                <div key={i} className="rounded-xl border border-violet-200 bg-white p-3 space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={addon.platform}
                      onChange={e => updateTaskAddon(i, "platform", e.target.value)}
                      className="rounded-xl border border-violet-200 bg-white text-xs px-2 py-1.5 flex-shrink-0 focus:outline-none focus:border-violet-400"
                    >
                      {["Instagram", "TikTok", "YouTube", "X (Twitter)", "Facebook", "Telegram", "Discord", "Other"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      value={addon.task}
                      onChange={e => updateTaskAddon(i, "task", e.target.value)}
                      placeholder={`Task ${i + 1}: e.g., Follow our page & comment...`}
                      className="rounded-xl border border-violet-200 bg-white text-sm px-3 py-1.5 flex-1 min-w-0 focus:outline-none focus:border-violet-400"
                      data-testid={`input-listing-task-addon-${i}`}
                    />
                    {taskAddons.length > 1 && (
                      <button onClick={() => removeTaskAddon(i)} className="text-red-400 hover:text-red-600 px-1 flex-shrink-0" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-violet-600 font-semibold flex-shrink-0">🔗 Action Link:</span>
                    <input
                      value={addon.actionLink}
                      onChange={e => updateTaskAddon(i, "actionLink", e.target.value)}
                      placeholder="https://instagram.com/yourpage — link users click to do the task"
                      className="rounded-xl border border-violet-100 bg-violet-50 text-xs px-3 py-1.5 flex-1 min-w-0 focus:outline-none focus:border-violet-400"
                      data-testid={`input-listing-task-action-link-${i}`}
                    />
                  </div>
                </div>
              ))}
              <button onClick={addTaskAddon} className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-semibold transition-colors" type="button" data-testid="button-add-task-addon">
                <PlusCircle className="w-4 h-4" /> Add another task
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-bold mb-1.5 block">$TDRIP per participant</Label>
                <Input type="number" min="0" value={form.tdripPointsPerParticipant} onChange={e => setForm(f => ({ ...f, tdripPointsPerParticipant: e.target.value }))} placeholder="100" className="rounded-xl bg-white" data-testid="input-listing-tdrip-points" />
              </div>
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Participant limit</Label>
                <Input type="number" min="0" value={form.tdripParticipantLimit} onChange={e => setForm(f => ({ ...f, tdripParticipantLimit: e.target.value }))} placeholder="50" className="rounded-xl bg-white" data-testid="input-listing-tdrip-limit" />
              </div>
            </div>
            <div className="rounded-xl bg-white border border-violet-100 p-3 text-xs text-violet-900" data-testid="text-listing-tdrip-summary">
              Add-on escrow: <strong>{tdripPoints * tdripLimit} $TDRIP</strong> = <strong>${tdripEscrowUsd.toFixed(2)} USDT</strong>. Users can buy more $TDRIP, and points will be swappable when the native Taskdrip token launches.
            </div>
          </div>

          {/* Review tip */}
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-amber-700 text-xs leading-relaxed">Listings are reviewed by our admin team before going live. Make sure your description is accurate and your wallets are set in your <strong>Trading Profile</strong>.</p>
          </div>

          <Button
            className="w-full rounded-xl font-bold py-3 bg-violet-600 hover:bg-violet-700"
            onClick={() => createListing.mutate()}
            disabled={createListing.isPending || !form.title || !form.description || !form.price || !form.country}
            data-testid="button-submit-listing"
          >
            {createListing.isPending ? "Submitting..." : "Submit for Review →"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Accept Offer Modal ────────────────────────────────────────────────────────
function AcceptOfferModal({ listing, user, onClose }: { listing: any; user: any; onClose: () => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isPhysical = listing?.productSubtype === "physical";

  // Build list of user's saved wallets for the matching payment method
  const pmInfo = PAYMENT_TO_WALLET[listing?.paymentMethod || ""] || null;
  const savedWallet = pmInfo ? ((user as any)?.[pmInfo.key] || "") : "";

  const [walletMode, setWalletMode] = useState<"saved" | "custom">(savedWallet ? "saved" : "custom");
  const [customWallet, setCustomWallet] = useState("");
  const [shippingAddr, setShippingAddr] = useState("");

  const resolvedWallet = walletMode === "saved" ? savedWallet : customWallet;

  const acceptOffer = useMutation({
    mutationFn: async () => {
      const body: any = { buyerCryptoWallet: resolvedWallet };
      if (isPhysical) body.shippingAddress = shippingAddr;
      const res = await fetch(`/api/p2p/listings/${listing.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      return res.json();
    },
    onSuccess: (tx: any) => {
      toast({ title: "Deal Room opened!", description: "Follow the guide inside to complete your trade safely." });
      setLocation(`/p2p-deals/${tx.id}`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sym = getCurrencySymbol(listing?.currency || "USD");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" data-testid="modal-accept-offer">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-5">
          <h2 className="text-white font-black text-lg">Accept Offer</h2>
          <p className="text-violet-200 text-sm mt-0.5">{listing?.title}</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Summary */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Price</span>
              <span className="font-bold">{sym}{Number(listing?.price || 0).toLocaleString()} {listing?.currency || "USD"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pay via</span>
              <span className="font-semibold text-violet-700 flex items-center gap-1"><Coins className="w-3 h-3" />{listing?.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Seller</span>
              <span className="font-semibold text-gray-700">
                <Link href={`/profile/${listing?.seller?.id}`} className="hover:underline text-violet-700">
                  {listing?.seller?.username || listing?.seller?.firstName}
                </Link>
                {" "}· ⭐ {Number(listing?.seller?.rating || 4.8).toFixed(1)}
              </span>
            </div>
            {listing?.country && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Country</span>
                <span className="font-semibold text-gray-700 flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.country}</span>
              </div>
            )}
          </div>

          {/* Refund wallet selection */}
          <div>
            <Label className="text-sm font-bold mb-2 block text-gray-800">
              <Wallet className="w-4 h-4 inline mr-1.5 text-violet-500" />Your Refund Wallet
            </Label>
            <p className="text-xs text-gray-400 mb-2">If admin issues a refund, it will be sent to this wallet. Select your saved wallet or enter a custom address.</p>

            {savedWallet && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setWalletMode("saved")}
                  className={`flex-1 rounded-xl border text-xs font-semibold py-2 px-3 transition-all ${walletMode === "saved" ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  data-testid="wallet-mode-saved"
                >
                  ✓ Use Saved {pmInfo?.label}
                </button>
                <button
                  onClick={() => setWalletMode("custom")}
                  className={`flex-1 rounded-xl border text-xs font-semibold py-2 px-3 transition-all ${walletMode === "custom" ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  data-testid="wallet-mode-custom"
                >
                  + Custom Address
                </button>
              </div>
            )}

            {walletMode === "saved" && savedWallet ? (
              <div className="rounded-xl bg-violet-50 border border-violet-200 px-3 py-2.5">
                <p className="text-xs text-violet-500 mb-1">{pmInfo?.label}</p>
                <p className="font-mono text-sm text-violet-800 break-all">{savedWallet}</p>
              </div>
            ) : (
              <Input
                value={customWallet}
                onChange={e => setCustomWallet(e.target.value)}
                placeholder="Enter your wallet address for this trade"
                className="rounded-xl font-mono text-sm"
                data-testid="input-buyer-wallet"
              />
            )}
          </div>

          {/* Shipping address for physical */}
          {isPhysical && (
            <div>
              <Label className="text-sm font-bold mb-1.5 block text-emerald-700">
                <Truck className="w-4 h-4 inline mr-1.5" />Shipping Address *
              </Label>
              <Textarea
                value={shippingAddr}
                onChange={e => setShippingAddr(e.target.value)}
                rows={3}
                placeholder="Full name, street address, city, state/province, postal code, country"
                className="rounded-xl text-sm"
                data-testid="input-shipping-address"
              />
              <p className="text-xs text-gray-400 mt-1">Seller will ship to this address</p>
            </div>
          )}

          {/* Trust banner */}
          <div className="rounded-xl bg-green-50 border border-green-100 p-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-green-700 text-xs leading-relaxed">
              Payment is protected by <strong>admin escrow</strong>. Funds release only after you confirm receipt.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl border-gray-200" onClick={onClose} data-testid="button-cancel-accept">Cancel</Button>
            <Button
              className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 font-bold"
              onClick={() => acceptOffer.mutate()}
              disabled={acceptOffer.isPending || !resolvedWallet.trim() || (isPhysical && !shippingAddr.trim())}
              data-testid="button-confirm-accept"
            >
              {acceptOffer.isPending ? "Opening..." : "Enter Deal Room →"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Listing Card ──────────────────────────────────────────────────────────────
function ListingCard({ listing, onAccept, currentUserId, isAuthenticated }: { listing: any; onAccept: (l: any) => void; currentUserId?: string; isAuthenticated: boolean }) {
  const sym = getCurrencySymbol(listing.currency || "USD");
  const isOwn = listing.sellerId === currentUserId;

  return (
    <Card className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group" data-testid={`card-p2p-listing-${listing.id}`}>
      {/* Image or gradient */}
      <div className="relative h-36 overflow-hidden bg-gray-100 flex-shrink-0">
        {listing.featuredImage ? (
          <img src={listing.featuredImage} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            {listing.listingType === "crypto" ? <Coins className="w-12 h-12 text-white/20" /> :
              listing.productSubtype === "physical" ? <Truck className="w-12 h-12 text-white/20" /> :
              listing.listingType === "product" ? <Package className="w-12 h-12 text-white/20" /> :
              <Briefcase className="w-12 h-12 text-white/20" />}
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <Badge className={`text-[10px] font-bold uppercase tracking-wide border ${getTypeColor(listing.listingType, listing.productSubtype)}`}>
            {getTypeLabel(listing.listingType, listing.productSubtype)}
          </Badge>
          {listing.isFeatured && <Badge className="text-[10px] bg-yellow-400/90 text-yellow-900 border-0">⭐ Featured</Badge>}
        </div>
        <div className="absolute top-2.5 right-2.5">
          <div className="bg-black/75 backdrop-blur-sm text-white text-xs font-black px-2.5 py-1 rounded-lg">
            {sym}{Number(listing.price).toFixed(2)} {listing.currency || "USD"}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2" data-testid={`text-listing-title-${listing.id}`}>{listing.title}</p>
          {listing.listingType === "crypto" && listing.cryptoAsset && (
            <p className="text-xs text-orange-600 font-semibold mt-0.5">{listing.cryptoAsset} Trade</p>
          )}
        </div>

        {/* Country + Order limit row */}
        <div className="flex items-center justify-between text-xs">
          {listing.country ? (
            <span className="flex items-center gap-1 text-gray-500">
              <MapPin className="w-3 h-3 text-gray-400" />
              {listing.country}
            </span>
          ) : <span />}
          {(listing.minOrder || listing.maxOrder) && (
            <span className="text-gray-500">
              Limit: {listing.minOrder ? `${sym}${Number(listing.minOrder).toFixed(0)}` : "—"} – {listing.maxOrder ? `${sym}${Number(listing.maxOrder).toFixed(0)}` : "∞"}
            </span>
          )}
        </div>

        {/* Payment method */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5">
          <Wallet className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="truncate">{listing.paymentMethod}</span>
        </div>

        {/* Seller + CTA */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            {listing.seller?.profileImageUrl ? (
              <img src={listing.seller.profileImageUrl} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {(listing.seller?.username || listing.seller?.firstName || "S")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <Link href={`/profile/${listing.seller?.id}`} onClick={e => e.stopPropagation()}>
                <p className="text-xs font-semibold text-gray-800 truncate hover:underline cursor-pointer">
                  {listing.seller?.username || `${listing.seller?.firstName || "Seller"} ${listing.seller?.lastName || ""}`.trim()}
                </p>
              </Link>
              <p className="text-[10px] text-yellow-600 flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-yellow-500" />
                {Number(listing.seller?.rating || 4.8).toFixed(1)}
                {listing.seller?.completedCampaigns ? <span className="text-gray-400 ml-1">· {listing.seller.completedCampaigns} trades</span> : null}
              </p>
            </div>
          </div>

          {isOwn ? (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] flex-shrink-0">Your listing</Badge>
          ) : (
            <Button
              size="sm"
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold px-3 h-7 text-xs flex-shrink-0"
              onClick={() => onAccept(listing)}
              disabled={!isAuthenticated}
              data-testid={`button-accept-offer-${listing.id}`}
            >
              {!isAuthenticated ? <Link href="/login">Buy Now</Link> : "Buy Now"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function P2PSpotlightCarousel({ listings, onAccept }: { listings: any[]; onAccept: (l: any) => void }) {
  const [, setLocation] = useLocation();
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const { isAuthenticated } = useAuth();
  const total = listings.length;

  const goTo = useCallback((idx: number) => {
    if (fading || total <= 1) return;
    setFading(true);
    setTimeout(() => { setCurrent(idx); setFading(false); }, 220);
  }, [fading, total]);

  const next = useCallback(() => goTo((current + 1) % total), [current, total, goTo]);

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [next, total]);

  if (listings.length === 0) return null;
  const listing = listings[current];

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-900">Spotlight Listings</h2>
        {total > 1 && <span className="text-xs text-gray-400 ml-1">{total} featured</span>}
      </div>
      <div className="relative rounded-3xl overflow-hidden cursor-pointer group" onClick={() => setLocation(`/p2p/${listing.id}`)}>
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 to-purple-900" />
        {listing.imageUrl && (
          <img src={listing.imageUrl} alt={listing.title}
            className={`absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-all duration-500 group-hover:scale-105 ${fading ? "opacity-0" : ""}`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />

        <div className={`relative p-8 md:p-10 min-h-[220px] flex flex-col justify-end transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge className="bg-yellow-400 text-yellow-900 font-bold text-xs px-3 py-1">⭐ Featured Listing</Badge>
            <Badge className="bg-white/20 text-white border border-white/30 text-xs capitalize">{listing.type?.replace(/_/g, ' ')}</Badge>
            {listing.country && <Badge className="bg-white/20 text-white border border-white/30 text-xs"><MapPin className="w-3 h-3 mr-1 inline" />{listing.country}</Badge>}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1 max-w-2xl leading-tight">{listing.title}</h2>
          {listing.description && (
            <p className="text-white/80 text-sm max-w-xl line-clamp-2 mb-4">{listing.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
              <span className="text-2xl font-extrabold text-white">{listing.currency || "USD"} {Number(listing.price || 0).toLocaleString()}</span>
            </div>
            {listing.seller && (
              <span className="text-white/70 text-sm flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{Number(listing.seller.rating || 4.8).toFixed(1)} seller
              </span>
            )}
            <Button
              onClick={e => { e.stopPropagation(); if (isAuthenticated) onAccept(listing); else setLocation('/login'); }}
              className="ml-auto bg-white text-gray-900 hover:bg-yellow-50 font-bold px-6 rounded-xl shadow-lg"
              data-testid={`btn-spotlight-p2p-${listing.id}`}
            >
              Buy Now <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

      </div>
      {total > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={e => { e.stopPropagation(); goTo((current - 1 + total) % total); }}
            className="w-10 h-10 rounded-full bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 hover:shadow-[0_0_15px_rgba(139,92,246,0.55)] hover:border-violet-400 flex items-center justify-center transition-all"
            data-testid="btn-p2p-spotlight-prev">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {listings.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); goTo(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-violet-600" : "w-2 bg-gray-300 hover:bg-gray-400"}`}
                data-testid={`btn-p2p-spotlight-dot-${i}`} />
            ))}
          </div>
          <button onClick={e => { e.stopPropagation(); goTo((current + 1) % total); }}
            className="w-10 h-10 rounded-full bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 hover:shadow-[0_0_15px_rgba(139,92,246,0.55)] hover:border-violet-400 flex items-center justify-center transition-all"
            data-testid="btn-p2p-spotlight-next">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </section>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function P2PHub() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpgradeGate, setShowUpgradeGate] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGuideBot, setShowGuideBot] = useState(true);
  const [acceptingListing, setAcceptingListing] = useState<any>(null);
  const [filters, setFilters] = useState({ search: "", country: "", currency: "", minPrice: "", maxPrice: "" });
  const [showFilters, setShowFilters] = useState(false);

  const activeTabDef = CATEGORY_TABS.find(t => t.key === activeTab) || CATEGORY_TABS[0];

  // Build query params
  const buildQueryString = useCallback(() => {
    const p = new URLSearchParams();
    if (activeTabDef.key !== "all") {
      const type = (activeTabDef as any).type || activeTabDef.key;
      p.set("type", type);
      if ((activeTabDef as any).subtype) p.set("subtype", (activeTabDef as any).subtype);
    }
    if (filters.country) p.set("country", filters.country);
    if (filters.currency) p.set("currency", filters.currency);
    if (filters.search) p.set("search", filters.search);
    if (filters.minPrice) p.set("minPrice", filters.minPrice);
    if (filters.maxPrice) p.set("maxPrice", filters.maxPrice);
    return p.toString();
  }, [activeTab, filters, activeTabDef]);

  const { data: listings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/p2p/listings", activeTab, filters],
    queryFn: async () => {
      const qs = buildQueryString();
      const res = await fetch(`/api/p2p/listings?${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load listings");
      return res.json();
    },
  });

  const { data: featuredListings = [] } = useQuery<any[]>({
    queryKey: ["/api/p2p/listings/featured"],
  });

  const hasProfile = isAuthenticated && (user as any)?.country && (user as any)?.preferredCurrency;
  const activeFiltersCount = [filters.country, filters.currency, filters.minPrice, filters.maxPrice].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      {/* ── HERO ── */}
      <section className="relative min-h-[440px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1800&q=80&auto=format&fit=crop" alt="P2P Marketplace" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/85 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl">
            <Badge className="bg-violet-500/20 text-violet-200 border border-violet-400/30 backdrop-blur-sm px-3 py-1 text-sm font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-violet-300" /> P2P Marketplace — Secure & Global
            </Badge>

            <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight tracking-tight mb-3">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Trade Anything,</span>
              <br /><span className="text-white">Anywhere, Safely</span>
            </h1>
            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
              Crypto, physical products, digital goods, and services — all backed by escrow protection, private deal rooms, and a step-by-step guide bot.
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              {isAuthenticated ? (
                <>
                  <Button size="lg" className="bg-white text-black hover:bg-gray-100 font-bold px-6 rounded-xl shadow-xl" onClick={() => {
                    if ((user as any)?.subscriptionStatus !== 'active') {
                      setShowUpgradeGate(true);
                    } else {
                      setShowCreateDialog(true);
                    }
                  }} data-testid="button-create-listing">
                    <Plus className="w-5 h-5 mr-2" /> Create Listing
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm font-bold px-6 rounded-xl" onClick={() => setShowSettingsModal(true)} data-testid="button-trading-profile">
                    <Settings className="w-4 h-4 mr-2" /> Trading Profile
                  </Button>
                  <Link href="/p2p-deals">
                    <Button size="lg" variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm font-bold px-6 rounded-xl" data-testid="button-my-deals">
                      My Deals <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/login">
                  <Button size="lg" className="bg-white text-black hover:bg-gray-100 font-bold px-8 rounded-xl shadow-xl">
                    <Plus className="w-5 h-5 mr-2" /> Get Started
                  </Button>
                </Link>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4">
              {[
                { icon: ShieldCheck, label: "Escrow Protected" },
                { icon: Globe, label: "Global Marketplace" },
                { icon: Truck, label: "Physical Products" },
                { icon: Lock, label: "Private Deal Rooms" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-gray-300 text-sm">
                  <Icon className="w-4 h-4 text-violet-400" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROFILE SETUP PROMPT ── */}
      {isAuthenticated && !hasProfile && (
        <div className="bg-gradient-to-r from-violet-600 to-purple-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-white">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-semibold">Complete your Trading Profile — set your country, currency, and crypto wallets to start trading.</p>
            </div>
            <Button size="sm" className="bg-white text-violet-700 hover:bg-gray-100 font-bold rounded-lg flex-shrink-0" onClick={() => setShowSettingsModal(true)} data-testid="button-complete-profile">
              Set Up Now →
            </Button>
          </div>
        </div>
      )}

      {/* ── STATS ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { icon: ShieldCheck, label: "Admin Escrow", sub: "100% fund protection", color: "text-green-600" },
              { icon: Globe, label: "Global Trading", sub: "50+ countries supported", color: "text-blue-600" },
              { icon: Truck, label: "Physical Shipping", sub: "Track your delivery", color: "text-emerald-600" },
              { icon: Zap, label: "Fast Settlements", sub: "Avg. release < 24h", color: "text-orange-600" },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon className={`w-6 h-6 ${color}`} />
                <p className="font-bold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-400 hidden sm:block">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Featured Listings Spotlight */}
        {(featuredListings as any[]).length > 0 && (
          <P2PSpotlightCarousel listings={featuredListings as any[]} onAccept={(l) => setAcceptingListing(l)} />
        )}

        {/* Category tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5">
          {CATEGORY_TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold whitespace-nowrap text-sm transition-all flex-shrink-0 ${active ? "bg-gray-900 text-white border-gray-900 shadow-md" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                data-testid={`tab-${tab.key}`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-white" : tab.color}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search + Filter bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="flex gap-3 mb-0">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Search listings..."
                className="pl-9 rounded-xl border-gray-200"
                data-testid="input-search"
              />
            </div>
            <Button
              variant="outline"
              className={`rounded-xl border-gray-200 gap-2 flex-shrink-0 ${activeFiltersCount > 0 ? "bg-violet-50 border-violet-300 text-violet-700" : ""}`}
              onClick={() => setShowFilters(f => !f)}
              data-testid="button-filters"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="bg-violet-600 text-white text-xs border-0 h-5 px-1.5 rounded-full">{activeFiltersCount}</Badge>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 mt-3 border-t border-gray-100">
              <div>
                <Label className="text-xs font-semibold text-gray-500 mb-1 block">Country</Label>
                <select value={filters.country} onChange={e => setFilters(f => ({ ...f, country: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" data-testid="filter-country">
                  <option value="">All Countries</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-500 mb-1 block">Currency</Label>
                <select value={filters.currency} onChange={e => setFilters(f => ({ ...f, currency: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" data-testid="filter-currency">
                  <option value="">All Currencies</option>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-500 mb-1 block">Min Price</Label>
                <Input type="number" min="0" value={filters.minPrice} onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))} placeholder="0" className="rounded-xl border-gray-200" data-testid="filter-min-price" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-500 mb-1 block">Max Price</Label>
                <Input type="number" min="0" value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))} placeholder="Any" className="rounded-xl border-gray-200" data-testid="filter-max-price" />
              </div>
              {activeFiltersCount > 0 && (
                <div className="sm:col-span-4 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs" onClick={() => setFilters({ search: filters.search, country: "", currency: "", minPrice: "", maxPrice: "" })} data-testid="button-clear-filters">
                    <X className="w-3.5 h-3.5 mr-1" /> Clear filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active filter pills */}
        {(filters.country || filters.currency) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.country && (
              <Badge className="bg-violet-100 text-violet-800 border-violet-200 px-3 py-1 rounded-full flex items-center gap-1.5" data-testid="pill-country">
                <MapPin className="w-3 h-3" />{filters.country}
                <button onClick={() => setFilters(f => ({ ...f, country: "" }))} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.currency && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1 rounded-full flex items-center gap-1.5" data-testid="pill-currency">
                <Coins className="w-3 h-3" />{filters.currency}
                <button onClick={() => setFilters(f => ({ ...f, currency: "" }))} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
              </Badge>
            )}
          </div>
        )}

        {/* Listings grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-8 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
            <Store className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="font-bold text-gray-700 text-lg mb-1">No listings found</p>
            <p className="text-sm text-gray-400 mb-2">
              {activeFiltersCount > 0 ? "Try adjusting your filters or clearing them." : "Be the first to post in this category."}
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => setFilters({ search: "", country: "", currency: "", minPrice: "", maxPrice: "" })} className="mb-4">Clear all filters</Button>
            )}
            {isAuthenticated && (
              <Button onClick={() => setShowCreateDialog(true)} className="rounded-xl bg-violet-600 hover:bg-violet-700" data-testid="button-first-listing">
                <Plus className="w-4 h-4 mr-2" /> Create first listing
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{listings.length} listing{listings.length !== 1 ? "s" : ""} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.map((listing: any) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onAccept={setAcceptingListing}
                  currentUserId={(user as any)?.id}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          </>
        )}

        {/* How it works section */}
        <section className="mt-16 mb-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900 mb-2">How P2P Trading Works</h2>
            <p className="text-gray-500 text-sm">Simple, safe, and transparent — every step of the way</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { step: "01", icon: TrendingUp, title: "Browse & Choose", desc: "Browse verified listings. Filter by country, currency, and type to find exactly what you need.", color: "bg-violet-100 text-violet-600" },
              { step: "02", icon: Shield, title: "Open Deal Room", desc: "Click 'Buy Now' to open a private Deal Room with escrow protection. Follow the step-by-step guide bot.", color: "bg-blue-100 text-blue-600" },
              { step: "03", icon: ShieldCheck, title: "Pay to Escrow", desc: "Send payment to admin escrow. Upload proof. Admin verifies and notifies the seller to deliver.", color: "bg-emerald-100 text-emerald-600" },
              { step: "04", icon: Truck, title: "Receive Your Item", desc: "For physical goods: receive tracking info. For crypto/digital: receive access. For services: receive work.", color: "bg-orange-100 text-orange-600" },
              { step: "05", icon: CheckCircle, title: "Confirm Receipt", desc: "Only after verifying receipt, confirm in the Deal Room. This triggers admin to release funds to seller.", color: "bg-green-100 text-green-600" },
              { step: "06", icon: Wallet, title: "Funds Released", desc: "Admin releases funds to the seller's balance. If something's wrong, open a dispute — admin mediates.", color: "bg-pink-100 text-pink-600" },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-2xl ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-1">Step {step}</p>
                  <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {/* ── GUIDE BOT ── */}
      {showGuideBot && (
        <GuideBot onClose={() => setShowGuideBot(false)} />
      )}
      {!showGuideBot && (
        <button
          onClick={() => setShowGuideBot(true)}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-2xl shadow-violet-900/40 flex items-center justify-center transition-all hover:scale-110"
          data-testid="button-show-guide-bot"
          title="Open Trade Guide"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      )}

      {/* ── UPGRADE GATE ── */}
      <Dialog open={showUpgradeGate} onOpenChange={v => !v && setShowUpgradeGate(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <Lock className="w-5 h-5 text-violet-600" /> Premium Feature
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-5 text-center">
              <div className="text-4xl mb-3">🏪</div>
              <h3 className="font-black text-gray-900 text-lg">P2P Marketplace Listings</h3>
              <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                Listing items on the P2P marketplace is a <strong>Premium feature</strong>. Upgrade to Monthly or Yearly to start selling crypto, products, and services globally.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-700"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Unlimited P2P listings</div>
              <div className="flex items-center gap-2 text-sm text-gray-700"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Escrow-protected trades</div>
              <div className="flex items-center gap-2 text-sm text-gray-700"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> $TDRIP task add-ons</div>
              <div className="flex items-center gap-2 text-sm text-gray-700"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Up to 12 feed posts/month</div>
            </div>
            <Link href="/subscription">
              <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl" data-testid="button-upgrade-p2p">
                <Zap className="w-4 h-4 mr-2" /> Upgrade to Premium
              </Button>
            </Link>
            <button onClick={() => setShowUpgradeGate(false)} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1">
              Maybe later
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODALS ── */}
      {showSettingsModal && (
        <P2PSettingsModal user={user} onClose={() => setShowSettingsModal(false)} />
      )}
      {showCreateDialog && (
        <CreateListingDialog
          user={user}
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          defaultType={activeTab !== "all" ? (CATEGORY_TABS.find(t => t.key === activeTab) as any)?.type || activeTab : "crypto"}
        />
      )}
      {acceptingListing && (
        <AcceptOfferModal
          listing={acceptingListing}
          user={user}
          onClose={() => setAcceptingListing(null)}
        />
      )}
    </div>
  );
}
