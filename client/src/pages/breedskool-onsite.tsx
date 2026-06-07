import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Clock, Users, Phone, Calendar, ChevronRight,
  BookOpen, Wifi, Home, GraduationCap, Star, CheckCircle2,
  CheckCircle, Loader2, UploadCloud,
} from "lucide-react";

const SCHEDULE = [
  { day: "Monday – Wednesday", time: "10am – 1pm", program: "Web3 & DeFi Fundamentals", slots: 12 },
  { day: "Tuesday – Thursday", time: "2pm – 5pm", program: "Social Media Monetisation", slots: 8 },
  { day: "Saturday", time: "9am – 3pm", program: "Full-Day Creator Bootcamp", slots: 20 },
  { day: "Sunday", time: "10am – 12pm", program: "Intro to Crypto & NFTs", slots: 15 },
];

const FEATURES = [
  "Hands-on practical sessions with real equipment",
  "Small class sizes — max 20 students per session",
  "Direct mentorship from certified instructors",
  "Course completion certificate issued on-site",
  "Networking with fellow creators & entrepreneurs",
  "Access to BreedSkool online platform after class",
];

export default function BreedSkoolOnsite() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    program: SCHEDULE[0].program,
    location: "",
    referral: "",
    paymentMethodId: "",
  });
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const { data: allPricing = [] } = useQuery<any[]>({
    queryKey: ["/api/breedskool/pricing"],
  });

  const { data: onsiteCourses = [] } = useQuery<any[]>({
    queryKey: ["/api/breedskool/pricing", "onsite"],
    queryFn: async () => {
      const res = await fetch("/api/breedskool/pricing?mode=onsite");
      return res.json();
    },
  });

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods"],
  });

  const onsitePricing = (allPricing as any[]).find((p: any) =>
    p.courseKey === "onsite_training" || p.label?.toLowerCase().includes("onsite") || p.deliveryMode === "onsite"
  );

  // Merge API onsite courses with fallback SCHEDULE
  const programOptions: { label: string; courseKey?: string; day?: string; time?: string; slots?: number }[] =
    (onsiteCourses as any[]).length > 0
      ? (onsiteCourses as any[]).map((c: any) => ({ label: c.label || c.title || c.courseKey, courseKey: c.courseKey }))
      : SCHEDULE.map(s => ({ label: s.program, day: s.day, time: s.time, slots: s.slots }));

  const activeMethods = (paymentMethods as any[]).filter((m: any) => m.isActive);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const selectedMethod = activeMethods.find((m: any) => m.id === form.paymentMethodId) || activeMethods[0];
      const fd = new FormData();
      fd.append("fullName", form.fullName.trim());
      fd.append("email", form.email.trim());
      fd.append("phone", form.phone.trim());
      fd.append("selectedCourseKey", "onsite_training");
      fd.append("selectedCourseTitle", form.program);
      fd.append("location", form.location.trim());
      fd.append("deliveryMode", "onsite");
      fd.append("paymentOption", proofFile ? "paid" : "pay_later");
      if (selectedMethod) fd.append("paymentMethod", selectedMethod.label || selectedMethod.type);
      if (proofFile) fd.append("paymentProof", proofFile);
      if (form.referral.trim()) fd.append("notes", `Referral: ${form.referral.trim()}`);
      const res = await fetch("/api/breedskool/register", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      return data;
    },
    onSuccess: (data: any) => {
      setSubmitted(true);
      if (data?.registrationId || data?.id) setRegistrationId(data?.registrationId || data?.id);
      toast({ title: "Registration submitted!", description: "We'll contact you within 24 hours to confirm your spot." });
    },
    onError: (e: any) => toast({ title: "Registration failed", description: e.message, variant: "destructive" }),
  });

  const handleChange = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({ title: "Missing details", description: "Please fill in your name, email and phone number.", variant: "destructive" });
      return;
    }
    registerMutation.mutate();
  };

  const resetForm = () => {
    setSubmitted(false);
    setProofFile(null);
    setRegistrationId(null);
    setForm({ fullName: "", email: "", phone: "", program: programOptions[0]?.label || SCHEDULE[0].program, location: "", referral: "", paymentMethodId: "" });
  };

  return (
    <div className="min-h-screen bg-white">
      <NavigationFixed />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #7c3aed 0%, transparent 60%), radial-gradient(circle at 80% 30%, #4f46e5 0%, transparent 50%)" }} />
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <Badge className="bg-yellow-400 text-yellow-900 mb-4 text-xs font-bold px-3 py-1">🏫 Onsite Classes</Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Learn In-Person at<br />
            <span className="text-yellow-400">BreedSkool Lagos</span>
          </h1>
          <p className="text-white/80 text-lg max-w-xl mb-8">
            Join our physical training centre for hands-on tech education, live mentorship, and real-world skills that pay.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold gap-2 shadow-lg"
              onClick={() => setShowForm(true)}
              data-testid="button-register-onsite-hero"
            >
              <GraduationCap className="h-5 w-5" /> Register for Onsite Training
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 gap-2"
              onClick={() => navigate("/breedskool")}
            >
              <Wifi className="h-4 w-4" /> View Online Options
            </Button>
          </div>
        </div>
      </div>

      {/* Venue Info */}
      <div className="bg-violet-50 border-b border-violet-100">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="h-4 w-4 text-violet-600 flex-shrink-0" />
            <div>
              <span className="font-semibold">Training Venue:</span> TootoOba Estate, Ijede, Ikorodu, Lagos
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Phone className="h-4 w-4 text-violet-600" />
            <a href="https://wa.me/2348000000000" className="hover:text-violet-700 hover:underline">WhatsApp us for directions</a>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Users className="h-4 w-4 text-violet-600" />
            <span>Small class sizes — max 20 per session</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">

        {/* Inline Registration Form */}
        <section id="register" className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-3xl p-8 border border-violet-100">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <GraduationCap className="h-10 w-10 text-violet-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-gray-900">Reserve Your Spot</h2>
              <p className="text-gray-500 mt-1">Fill in your details below — no account needed. We'll confirm your place within 24 hours.</p>
            </div>

            {submitted ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">You're registered!</h3>
                <p className="text-gray-500 mb-2">We'll contact you at <strong>{form.email}</strong> within 24 hours to confirm your spot.</p>
                {registrationId && (
                  <p className="text-xs text-violet-600 font-mono bg-violet-50 rounded-lg px-3 py-1.5 inline-block mb-3">
                    Registration ID: <strong>{registrationId}</strong>
                  </p>
                )}
                <p className="text-xs text-gray-400 mb-5">
                  Need help? WhatsApp us at <a href="https://wa.me/2348000000000" className="text-violet-600 hover:underline">+234 800 000 0000</a> or email <a href="mailto:support@breedskool.com" className="text-violet-600 hover:underline">support@breedskool.com</a>
                </p>
                <Button variant="outline" className="gap-2" onClick={resetForm}>
                  Register another person
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-onsite-registration">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="fullName" value={form.fullName} onChange={e => handleChange("fullName", e.target.value)}
                      placeholder="e.g. Chidi Okafor" required data-testid="input-onsite-fullname" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone / WhatsApp <span className="text-red-500">*</span></Label>
                    <Input id="phone" value={form.phone} onChange={e => handleChange("phone", e.target.value)}
                      placeholder="+234 800 000 0000" required data-testid="input-onsite-phone" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                  <Input id="email" type="email" value={form.email} onChange={e => handleChange("email", e.target.value)}
                    placeholder="you@email.com" required data-testid="input-onsite-email" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="program">Programme <span className="text-red-500">*</span></Label>
                  <select id="program" value={form.program} onChange={e => handleChange("program", e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="select-onsite-program">
                    {programOptions.map((p, i) => (
                      <option key={i} value={p.label}>
                        {p.label}{p.day ? ` — ${p.day}` : ""}{p.time ? ` · ${p.time}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {activeMethods.length > 0 && (
                  <div className="space-y-2">
                    <Label>Payment Method (optional — or pay on arrival)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeMethods.slice(0, 6).map((m: any) => (
                        <button key={m.id} type="button"
                          onClick={() => handleChange("paymentMethodId", form.paymentMethodId === m.id ? "" : m.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left text-sm transition-all ${form.paymentMethodId === m.id ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-violet-200"}`}
                          data-testid={`button-payment-method-${m.id}`}>
                          <span className="text-base">{m.type === "crypto" ? "🪙" : m.type === "bank" ? "🏦" : "💳"}</span>
                          <span className="font-medium text-gray-800 truncate">{m.label}</span>
                          {form.paymentMethodId === m.id && <CheckCircle2 className="h-4 w-4 text-violet-600 ml-auto flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Payment Proof (optional — upload if you've already paid)</Label>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => setProofFile(e.target.files?.[0] || null)}
                    data-testid="input-onsite-proof" />
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-colors text-sm ${proofFile ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-gray-300 hover:border-violet-300 text-gray-500"}`}
                    data-testid="button-upload-proof">
                    <UploadCloud className="h-5 w-5 flex-shrink-0" />
                    {proofFile ? <>✓ {proofFile.name}</> : "Click to upload payment receipt / screenshot"}
                  </button>
                  {proofFile && <button type="button" className="text-xs text-gray-400 hover:text-red-500"
                    onClick={() => { setProofFile(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove file</button>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">Your location / area (optional)</Label>
                  <Input id="location" value={form.location} onChange={e => handleChange("location", e.target.value)}
                    placeholder="e.g. Ikorodu, Gbagada, Lekki…" data-testid="input-onsite-location" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="referral">How did you hear about us? (optional)</Label>
                  <Input id="referral" value={form.referral} onChange={e => handleChange("referral", e.target.value)}
                    placeholder="Social media, friend, Google…" data-testid="input-onsite-referral" />
                </div>

                <Button type="submit"
                  className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white text-base font-semibold gap-2 shadow-lg shadow-violet-200"
                  disabled={registerMutation.isPending} data-testid="button-submit-onsite-registration">
                  {registerMutation.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                    : <><GraduationCap className="h-5 w-5" /> Reserve My Spot</>}
                </Button>
                <p className="text-center text-xs text-gray-400">
                  {proofFile ? "Payment proof will be reviewed by our team." : "No payment required now — you can pay on arrival or upload proof above."}
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Pricing */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Onsite Training Fees</h2>
          <p className="text-gray-500 mb-8">One-time fees in Naira. Includes all materials and your certificate.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {onsitePricing ? (
              <Card className="border-violet-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{onsitePricing.label || "Onsite Training"}</h3>
                      <p className="text-sm text-gray-500">{onsitePricing.description || "Full programme access"}</p>
                    </div>
                    <Badge className="bg-violet-100 text-violet-700">Physical</Badge>
                  </div>
                  <div className="text-3xl font-extrabold text-violet-700 mb-4">
                    ₦{Number(onsitePricing.price || 0).toLocaleString()}
                  </div>
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={() => setShowForm(true)}
                    data-testid="button-register-onsite-pricing"
                  >
                    Register Now <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-violet-200 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Standard Programme</h3>
                    <p className="text-sm text-gray-500 mb-3">4-week intensive training, 3× per week</p>
                    <div className="text-3xl font-extrabold text-violet-700 mb-4">₦35,000</div>
                    <Button
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => setShowForm(true)}
                      data-testid="button-register-onsite-standard"
                    >
                      Register Now <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Weekend Bootcamp</h3>
                    <p className="text-sm text-gray-500 mb-3">Intensive Saturday sessions for 6 weeks</p>
                    <div className="text-3xl font-extrabold text-yellow-700 mb-4">₦25,000</div>
                    <Button
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-white"
                      onClick={() => setShowForm(true)}
                      data-testid="button-register-onsite-weekend"
                    >
                      Register Now <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </section>

        {/* Class Schedule */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Class Schedule</h2>
          <p className="text-gray-500 mb-8">Flexible schedules to fit around your work or school day.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SCHEDULE.map((s, i) => (
              <div key={i} className="border rounded-xl p-4 flex gap-4 items-start hover:border-violet-200 hover:bg-violet-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{s.program}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" /> {s.day} · {s.time}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                    <Users className="h-3 w-3" /> {s.slots} spots available
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What you get */}
        <section className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What's Included</h2>
            <ul className="space-y-3">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Physical + Online Access</p>
                <p className="text-xs text-gray-500">Attend in-person and revisit lessons anytime online</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Certified Instructors</p>
                <p className="text-xs text-gray-500">Industry professionals with years of experience</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Home className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Home Tutor Available</p>
                <p className="text-xs text-gray-500">Can't come to us? We'll send a tutor to you</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-violet-700 to-purple-700 rounded-3xl p-10 text-center text-white">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-2xl font-bold mb-2">Ready to Start Learning In-Person?</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            Secure your spot today. Classes fill up fast — limited to 20 students per session.
          </p>
          <Button
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold gap-2"
            onClick={() => setShowForm(true)}
            data-testid="button-register-onsite-cta"
          >
            <GraduationCap className="h-5 w-5" /> Register for Onsite Training
          </Button>
        </section>

      </div>

      {/* Modal registration form (for CTA buttons) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-violet-600" />
              Register for Onsite Training
            </DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">You're registered!</h3>
              <p className="text-gray-500 text-sm mb-2">We'll contact you at <strong>{form.email}</strong> within 24 hours to confirm your spot.</p>
              {registrationId && (
                <p className="text-xs text-violet-600 font-mono bg-violet-50 rounded px-2 py-1 inline-block mb-2">
                  ID: <strong>{registrationId}</strong>
                </p>
              )}
              <p className="text-xs text-gray-400 mb-4">
                Support: <a href="https://wa.me/2348000000000" className="text-violet-600 hover:underline">WhatsApp</a> · <a href="mailto:support@breedskool.com" className="text-violet-600 hover:underline">Email</a>
              </p>
              <Button onClick={() => { setShowForm(false); resetForm(); }}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-2" data-testid="form-onsite-registration-modal">
              <div className="space-y-1.5">
                <Label htmlFor="m-fullName">Full Name <span className="text-red-500">*</span></Label>
                <Input id="m-fullName" value={form.fullName} onChange={e => handleChange("fullName", e.target.value)} placeholder="Your full name" required data-testid="input-modal-onsite-fullname" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="m-email">Email <span className="text-red-500">*</span></Label>
                  <Input id="m-email" type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="you@email.com" required data-testid="input-modal-onsite-email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-phone">Phone <span className="text-red-500">*</span></Label>
                  <Input id="m-phone" value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="+234 …" required data-testid="input-modal-onsite-phone" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-program">Programme</Label>
                <select id="m-program" value={form.program} onChange={e => handleChange("program", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid="select-modal-onsite-program">
                  {programOptions.map((p, i) => <option key={i} value={p.label}>{p.label}</option>)}
                </select>
              </div>
              {activeMethods.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Payment Method (optional)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {activeMethods.slice(0, 4).map((m: any) => (
                      <button key={m.id} type="button"
                        onClick={() => handleChange("paymentMethodId", form.paymentMethodId === m.id ? "" : m.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left text-xs transition-all ${form.paymentMethodId === m.id ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-violet-200"}`}>
                        <span>{m.type === "crypto" ? "🪙" : m.type === "bank" ? "🏦" : "💳"}</span>
                        <span className="font-medium truncate">{m.label}</span>
                        {form.paymentMethodId === m.id && <CheckCircle2 className="h-3.5 w-3.5 text-violet-600 ml-auto flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Payment Proof (optional)</Label>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className={`w-full flex items-center gap-2 p-3 rounded-lg border-2 border-dashed text-sm transition-colors ${proofFile ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-gray-300 hover:border-violet-300 text-gray-500"}`}>
                  <UploadCloud className="h-4 w-4 flex-shrink-0" />
                  {proofFile ? `✓ ${proofFile.name}` : "Upload payment receipt / screenshot"}
                </button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-location">Your area (optional)</Label>
                <Input id="m-location" value={form.location} onChange={e => handleChange("location", e.target.value)} placeholder="e.g. Ikorodu, Lekki…" data-testid="input-modal-onsite-location" />
              </div>
              <Button type="submit" className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-2" disabled={registerMutation.isPending} data-testid="button-submit-modal-onsite">
                {registerMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <><GraduationCap className="h-4 w-4" /> Reserve My Spot</>}
              </Button>
              <p className="text-center text-xs text-gray-400">
                {proofFile ? "Proof will be reviewed after submission." : "You can pay on arrival or upload proof above."}
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
