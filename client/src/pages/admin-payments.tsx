import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/ui/navigation";
import {
  CreditCard, Bitcoin, Building2, Wallet, Plus, Edit, Trash2, CheckCircle2,
  XCircle, ShoppingCart, Target, Crown, BookOpen, Heart, ArrowDownToLine,
  AlertCircle, Lock, Eye, EyeOff, ChevronRight, Settings, Layers,
  DollarSign, Shield, Zap, Globe, Star, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

const FEATURES = [
  { key: "shop", label: "Shop / Products", icon: ShoppingCart, color: "text-blue-500" },
  { key: "campaigns", label: "Campaigns (Escrow)", icon: Target, color: "text-purple-500" },
  { key: "subscriptions", label: "Account Upgrades", icon: Crown, color: "text-amber-500" },
  { key: "courses", label: "BreedSkool Courses", icon: BookOpen, color: "text-green-500" },
  { key: "tips", label: "Influencer Tips", icon: Heart, color: "text-pink-500" },
  { key: "payouts", label: "Payouts / Withdrawals", icon: ArrowDownToLine, color: "text-indigo-500" },
];

const METHOD_TYPES = [
  { value: "crypto", label: "Cryptocurrency Wallet" },
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "bank", label: "Bank Transfer" },
];

const TYPE_ICONS: Record<string, any> = {
  crypto: Bitcoin,
  stripe: CreditCard,
  paypal: Globe,
  bank: Building2,
};

const TYPE_COLORS: Record<string, string> = {
  crypto: "bg-orange-50 border-orange-200 text-orange-700",
  stripe: "bg-purple-50 border-purple-200 text-purple-700",
  paypal: "bg-blue-50 border-blue-200 text-blue-700",
  bank: "bg-green-50 border-green-200 text-green-700",
};

const CRYPTO_NETWORKS = [
  { network: "TRC-20", currency: "USDT", label: "USDT – Tron (TRC-20)" },
  { network: "BEP-20", currency: "USDT", label: "USDT – BNB Smart Chain (BEP-20)" },
  { network: "ERC-20", currency: "USDT", label: "USDT – Ethereum (ERC-20)" },
  { network: "TON", currency: "TON", label: "TON Network" },
  { network: "BTC", currency: "BTC", label: "Bitcoin (BTC)" },
  { network: "ETH", currency: "ETH", label: "Ethereum (ETH)" },
  { network: "SOL", currency: "SOL", label: "Solana (SOL)" },
  { network: "TRX", currency: "TRX", label: "TRON (TRX)" },
];

const EMPTY_METHOD = {
  type: "crypto",
  label: "",
  network: "",
  currency: "",
  address: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  routingNumber: "",
  swiftCode: "",
  bankCountry: "",
  bankCurrency: "",
  paypalEmail: "",
  paypalClientId: "",
  stripePublicKey: "",
  stripeSecretKey: "",
  instructions: "",
  isActive: true,
  sortOrder: 0,
};

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function MethodForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Payment Type *</Label>
          <Select value={form.type} onValueChange={v => set("type", v)}>
            <SelectTrigger data-testid="select-payment-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {METHOD_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Display Label *</Label>
          <Input data-testid="input-method-label" value={form.label} onChange={e => set("label", e.target.value)} placeholder="e.g. USDT TRC-20 Wallet" />
        </div>
      </div>

      {form.type === "crypto" && (
        <div className="space-y-3 border border-orange-100 bg-orange-50/50 rounded-lg p-4">
          <p className="text-sm font-medium text-orange-700 flex items-center gap-2"><Bitcoin className="h-4 w-4" /> Crypto Wallet Settings</p>
          <div>
            <Label>Network / Preset</Label>
            <Select value={`${form.network}__${form.currency}`} onValueChange={v => {
              const [network, currency] = v.split("__");
              set("network", network); set("currency", currency);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {CRYPTO_NETWORKS.map(n => (
                  <SelectItem key={n.network} value={`${n.network}__${n.currency}`}>{n.label}</SelectItem>
                ))}
                <SelectItem value="custom__custom">Custom / Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(form.network === "custom" || !CRYPTO_NETWORKS.find(n => n.network === form.network)) && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Network</Label><Input value={form.network} onChange={e => set("network", e.target.value)} placeholder="e.g. ERC-20" /></div>
              <div><Label>Currency</Label><Input value={form.currency} onChange={e => set("currency", e.target.value)} placeholder="e.g. USDT" /></div>
            </div>
          )}
          <div>
            <Label>Wallet Address *</Label>
            <Input data-testid="input-wallet-address" value={form.address} onChange={e => set("address", e.target.value)} placeholder="Enter wallet address" className="font-mono text-sm" />
          </div>
        </div>
      )}

      {form.type === "stripe" && (
        <div className="space-y-3 border border-purple-100 bg-purple-50/50 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-700 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Stripe Configuration</p>
          <div>
            <Label>Publishable Key</Label>
            <Input data-testid="input-stripe-public" value={form.stripePublicKey} onChange={e => set("stripePublicKey", e.target.value)} placeholder="pk_live_..." />
          </div>
          <div>
            <Label>Secret Key</Label>
            <SecretInput value={form.stripeSecretKey} onChange={v => set("stripeSecretKey", v)} placeholder="sk_live_..." />
          </div>
        </div>
      )}

      {form.type === "paypal" && (
        <div className="space-y-3 border border-blue-100 bg-blue-50/50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-700 flex items-center gap-2"><Globe className="h-4 w-4" /> PayPal Configuration</p>
          <div>
            <Label>PayPal Email</Label>
            <Input data-testid="input-paypal-email" value={form.paypalEmail} onChange={e => set("paypalEmail", e.target.value)} placeholder="paypal@yourdomain.com" />
          </div>
          <div>
            <Label>Client ID (for checkout buttons)</Label>
            <Input value={form.paypalClientId} onChange={e => set("paypalClientId", e.target.value)} placeholder="AXxx..." />
          </div>
        </div>
      )}

      {form.type === "bank" && (
        <div className="space-y-3 border border-green-100 bg-green-50/50 rounded-lg p-4">
          <p className="text-sm font-medium text-green-700 flex items-center gap-2"><Building2 className="h-4 w-4" /> Bank Transfer Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Bank Name *</Label><Input value={form.bankName} onChange={e => set("bankName", e.target.value)} placeholder="e.g. Chase Bank" /></div>
            <div><Label>Account Name *</Label><Input value={form.accountName} onChange={e => set("accountName", e.target.value)} placeholder="Account holder name" /></div>
            <div><Label>Account Number *</Label><Input value={form.accountNumber} onChange={e => set("accountNumber", e.target.value)} placeholder="xxxx-xxxx-xxxx" /></div>
            <div><Label>Routing / Sort Code</Label><Input value={form.routingNumber} onChange={e => set("routingNumber", e.target.value)} placeholder="Routing / sort code" /></div>
            <div><Label>SWIFT / BIC</Label><Input value={form.swiftCode} onChange={e => set("swiftCode", e.target.value)} placeholder="XXXXXX" /></div>
            <div><Label>Currency</Label><Input value={form.bankCurrency} onChange={e => set("bankCurrency", e.target.value)} placeholder="USD, EUR, NGN..." /></div>
            <div className="col-span-2"><Label>Country</Label><Input value={form.bankCountry} onChange={e => set("bankCountry", e.target.value)} placeholder="United States" /></div>
          </div>
        </div>
      )}

      <div>
        <Label>Payment Instructions (shown to user)</Label>
        <Textarea value={form.instructions} onChange={e => set("instructions", e.target.value)} placeholder="E.g. Send exact amount, then upload proof of payment..." rows={3} />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.isActive} onCheckedChange={v => set("isActive", v)} data-testid="switch-method-active" />
        <Label>Active (visible to users)</Label>
      </div>
    </div>
  );
}

export default function AdminPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_METHOD);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: methods = [], isLoading: methodsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/payment-methods"] });
  const { data: toggles = [] } = useQuery<any[]>({ queryKey: ["/api/admin/payment-feature-toggles"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/payment-methods", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); setDialogOpen(false); toast({ title: "Payment method added" }); },
    onError: () => toast({ title: "Failed to add", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/admin/payment-methods/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); setDialogOpen(false); toast({ title: "Updated successfully" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/payment-methods/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); setDeleteConfirm(null); toast({ title: "Deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/payment-feature-toggles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/payment-feature-toggles"] }),
  });

  const openAdd = () => { setEditingMethod(null); setForm(EMPTY_METHOD); setDialogOpen(true); };
  const openEdit = (m: any) => { setEditingMethod(m); setForm({ ...EMPTY_METHOD, ...m }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.label || !form.type) return toast({ title: "Label and type are required", variant: "destructive" });
    if (editingMethod) updateMutation.mutate({ id: editingMethod.id, data: form });
    else createMutation.mutate(form);
  };

  const getToggle = (methodId: string, feature: string) => {
    const t = toggles.find((t: any) => t.paymentMethodId === methodId && t.feature === feature);
    return t ? t.isEnabled : true;
  };

  const handleToggle = (methodId: string, feature: string, val: boolean) => {
    toggleMutation.mutate({ paymentMethodId: methodId, feature, isEnabled: val });
  };

  const stats = {
    total: methods.length,
    active: methods.filter((m: any) => m.isActive).length,
    crypto: methods.filter((m: any) => m.type === "crypto").length,
    gateways: methods.filter((m: any) => ["stripe", "paypal"].includes(m.type)).length,
  };

  if ((user as any)?.userType !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center"><Shield className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-lg font-semibold">Admin access required</p></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl"><Wallet className="h-7 w-7 text-purple-600" /></div>
                Payment Control Center
              </h1>
              <p className="text-gray-500 mt-1">Manage all payment methods, wallets, and feature access controls in one place</p>
            </div>
            <Button onClick={openAdd} data-testid="button-add-payment-method" className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
              <Plus className="h-4 w-4" /> Add Payment Method
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Methods", value: stats.total, icon: Layers, color: "text-blue-600 bg-blue-50" },
            { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
            { label: "Crypto Wallets", value: stats.crypto, icon: Bitcoin, color: "text-orange-600 bg-orange-50" },
            { label: "Payment Gateways", value: stats.gateways, icon: CreditCard, color: "text-purple-600 bg-purple-50" },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${s.color}`}><s.icon className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="methods">
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="methods" className="gap-2"><CreditCard className="h-4 w-4" /> Payment Methods</TabsTrigger>
            <TabsTrigger value="toggles" className="gap-2"><Settings className="h-4 w-4" /> Feature Access</TabsTrigger>
          </TabsList>

          {/* ── Payment Methods Tab ── */}
          <TabsContent value="methods">
            {methodsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-48 bg-gray-100 border-0" />)}
              </div>
            ) : methods.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200 bg-white">
                <CardContent className="py-16 text-center">
                  <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-500 mb-2">No payment methods configured</p>
                  <p className="text-sm text-gray-400 mb-6">Add crypto wallets, Stripe, PayPal, or bank transfers to accept payments.</p>
                  <Button onClick={openAdd} variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Add First Method</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {methods.map((m: any) => {
                  const Icon = TYPE_ICONS[m.type] || CreditCard;
                  const colorClass = TYPE_COLORS[m.type] || "bg-gray-50 border-gray-200 text-gray-700";
                  return (
                    <Card key={m.id} data-testid={`card-payment-method-${m.id}`} className="border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg border ${colorClass}`}><Icon className="h-5 w-5" /></div>
                            <div>
                              <p className="font-semibold text-gray-900">{m.label}</p>
                              <Badge variant="outline" className={`text-xs mt-0.5 ${colorClass}`}>{m.type.toUpperCase()}</Badge>
                            </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${m.isActive ? "bg-green-400" : "bg-gray-300"}`} />
                        </div>

                        {m.type === "crypto" && m.address && (
                          <div className="mb-3 bg-gray-50 rounded-lg p-2.5">
                            <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
                            <p className="text-xs font-mono text-gray-700 break-all">{m.address.slice(0, 28)}...</p>
                          </div>
                        )}
                        {m.type === "bank" && m.bankName && (
                          <div className="mb-3 bg-gray-50 rounded-lg p-2.5">
                            <p className="text-xs text-gray-500 mb-1">{m.bankName}</p>
                            <p className="text-xs text-gray-700">{m.accountName} · ****{m.accountNumber?.slice(-4)}</p>
                          </div>
                        )}
                        {m.type === "paypal" && m.paypalEmail && (
                          <div className="mb-3 bg-gray-50 rounded-lg p-2.5">
                            <p className="text-xs text-gray-500 mb-1">PayPal</p>
                            <p className="text-xs text-gray-700">{m.paypalEmail}</p>
                          </div>
                        )}
                        {m.type === "stripe" && (
                          <div className="mb-3 bg-gray-50 rounded-lg p-2.5">
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Lock className="h-3 w-3" /> Stripe</p>
                            <p className="text-xs text-gray-700">{m.stripePublicKey ? `${m.stripePublicKey.slice(0, 12)}...` : "Keys configured"}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={m.isActive}
                              onCheckedChange={v => updateMutation.mutate({ id: m.id, data: { isActive: v } })}
                              data-testid={`switch-active-${m.id}`}
                            />
                            <span className="text-xs text-gray-500">{m.isActive ? "Active" : "Disabled"}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(m)} data-testid={`button-edit-${m.id}`}><Edit className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteConfirm(m.id)} data-testid={`button-delete-${m.id}`}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Feature Access / Toggles Tab ── */}
          <TabsContent value="toggles">
            <div className="mb-4">
              <p className="text-sm text-gray-500">Control which payment methods are available for each platform feature. Toggle off to hide a method from users in that context.</p>
            </div>
            {methods.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200 bg-white">
                <CardContent className="py-12 text-center">
                  <Settings className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Add payment methods first to configure feature access.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/80">
                      <th className="text-left px-5 py-4 font-semibold text-gray-700 min-w-[180px]">Payment Method</th>
                      {FEATURES.map(f => (
                        <th key={f.key} className="px-4 py-4 text-center min-w-[120px]">
                          <div className="flex flex-col items-center gap-1">
                            <f.icon className={`h-4 w-4 ${f.color}`} />
                            <span className="text-xs font-medium text-gray-600 leading-tight">{f.label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {methods.map((m: any, idx: number) => {
                      const Icon = TYPE_ICONS[m.type] || CreditCard;
                      return (
                        <tr key={m.id} className={`border-b last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"} hover:bg-blue-50/20 transition-colors`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <Icon className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="font-medium text-gray-800">{m.label}</p>
                                {!m.isActive && <Badge variant="outline" className="text-xs text-gray-400 border-gray-200 mt-0.5">Inactive</Badge>}
                              </div>
                            </div>
                          </td>
                          {FEATURES.map(f => (
                            <td key={f.key} className="px-4 py-4 text-center">
                              <div className="flex justify-center">
                                <Switch
                                  checked={getToggle(m.id, f.key)}
                                  onCheckedChange={v => handleToggle(m.id, f.key, v)}
                                  disabled={!m.isActive}
                                  data-testid={`toggle-${m.id}-${f.key}`}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">How feature toggles work</p>
                <p>When a payment method is toggled <strong>ON</strong> for a feature, it will appear as an option during checkout for that feature. Toggling it off hides it from users without deleting it. A method must also be <strong>Active</strong> to appear anywhere.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              {editingMethod ? "Edit Payment Method" : "Add New Payment Method"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <MethodForm form={form} setForm={setForm} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-save-method"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingMethod ? "Save Changes" : "Add Method"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-5 w-5" /> Delete Payment Method</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 text-sm">This will permanently remove this payment method and all its feature toggles. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
