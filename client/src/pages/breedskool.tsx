import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { AdSlot } from "@/components/ui/ad-slot";
import { AdPopupZone } from "@/components/ui/ad-popup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Users, Star, Clock, Play, Search, TrendingUp, Zap,
  Instagram, Youtube, DollarSign, Award, ChevronRight, ChevronLeft, Lock, CheckCircle2,
  Laptop, Brain, TrendingDown, GraduationCap, Globe2, ArrowRight, Sparkles, Shield, X,
  PhoneCall, MessageCircle, Send, CheckCircle, AlertCircle, CreditCard, Upload,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface BsCoursePricing {
  id: string;
  courseKey: string;
  title: string;
  shortDescription: string;
  regularPrice: number;
  discountPrice: number;
  duration: string;
  isActive: boolean;
  acceptedPayments: string[];
}

interface RegForm {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  selectedCourseKey: string;
  selectedCourseTitle: string;
  amountNgn: number;
  paymentOption: "pay_now" | "pay_later";
  paymentMethod: string;
  transactionRef: string;
  currencyUsed: "NGN" | "USD";
}

// ── Constants ──────────────────────────────────────────────────────────────────
const BLACK_MARKET_RATE = 1650; // NGN per 1 USD — admin can update via app_settings

const PAYMENT_METHODS: Record<string, { label: string; icon: string; desc: string }> = {
  bank_transfer: { label: "Bank Transfer (NGN)", icon: "🏦", desc: "Pay in Naira via bank transfer" },
  usdt_tron: { label: "USDT (Tron / TRC-20)", icon: "💎", desc: "Pay in USDT on Tron network" },
  usdt_ton: { label: "USDT (TON network)", icon: "💠", desc: "Pay in USDT on TON network" },
  usdt_bnb: { label: "USDT (BNB Chain)", icon: "🟡", desc: "Pay in USDT on BNB Smart Chain" },
};

const COURSE_ICONS: Record<string, any> = {
  webdev: Laptop,
  ai_content: Brain,
  social_monetize: Globe2,
  trading: TrendingDown,
};

const COURSE_GRADIENTS: Record<string, string> = {
  webdev: "from-blue-600 to-cyan-500",
  ai_content: "from-violet-600 to-purple-500",
  social_monetize: "from-emerald-600 to-teal-500",
  trading: "from-orange-600 to-amber-500",
};

const COURSE_BG: Record<string, string> = {
  webdev: "bg-blue-50 border-blue-100",
  ai_content: "bg-violet-50 border-violet-100",
  social_monetize: "bg-emerald-50 border-emerald-100",
  trading: "bg-orange-50 border-orange-100",
};

const COURSE_BADGE_COLOR: Record<string, string> = {
  webdev: "bg-blue-100 text-blue-700",
  ai_content: "bg-violet-100 text-violet-700",
  social_monetize: "bg-emerald-100 text-emerald-700",
  trading: "bg-orange-100 text-orange-700",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtNgn = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const toUsd = (ngn: number) => ngn / BLACK_MARKET_RATE;

// ── BsCoursePricing Card ──────────────────────────────────────────────────────
function BsCourseCard({ course, selected, onClick }: { course: BsCoursePricing; selected: boolean; onClick: () => void }) {
  const Icon = COURSE_ICONS[course.courseKey] || BookOpen;
  const gradient = COURSE_GRADIENTS[course.courseKey] || "from-gray-600 to-gray-500";
  const bg = COURSE_BG[course.courseKey] || "bg-gray-50 border-gray-100";
  const badge = COURSE_BADGE_COLOR[course.courseKey] || "bg-gray-100 text-gray-700";
  const savings = course.regularPrice - course.discountPrice;
  const savingsPct = Math.round((savings / course.regularPrice) * 100);

  return (
    <div
      onClick={onClick}
      className={`relative border-2 rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
        selected
          ? "border-violet-500 bg-violet-50 shadow-lg shadow-violet-100"
          : `border-transparent ${bg} hover:border-gray-300 hover:shadow-md`
      }`}
      data-testid={`card-bscourse-${course.courseKey}`}
    >
      {selected && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="w-5 h-5 text-violet-600" />
        </div>
      )}
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-sm`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <Badge className={`text-[10px] px-2 py-0.5 mb-2 ${badge} border-0`}>{course.duration}</Badge>
      <h3 className="font-bold text-gray-900 text-sm mb-1">{course.title}</h3>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{course.shortDescription}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 line-through">{fmtNgn(course.regularPrice)}</span>
        <span className="text-base font-black text-gray-900">{fmtNgn(course.discountPrice)}</span>
        <Badge className="bg-red-100 text-red-600 text-[10px] border-0">-{savingsPct}%</Badge>
      </div>
      <p className="text-[11px] text-gray-400 mt-0.5">≈ {fmtUsd(toUsd(course.discountPrice))} USD</p>
    </div>
  );
}

// ── Welcome Modal ─────────────────────────────────────────────────────────────
function WelcomeModal({ open, onClose, name, courseTitle, payLater }: { open: boolean; onClose: () => void; name: string; courseTitle: string; payLater: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-black">🎉 Welcome to BreedSkool!</DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4 py-2">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">Hi {name.split(" ")[0]}! 🙌</p>
            <p className="text-gray-600 text-sm mt-1 leading-relaxed">
              You've successfully registered for <span className="font-semibold text-violet-700">{courseTitle}</span>. Where skills become income and individuals become <strong>Global Digital Assets</strong>!
            </p>
          </div>
          {payLater && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">Your spot is reserved. Complete payment within 48 hours to secure your enrollment. Contact your tutor via WhatsApp or Telegram below.</p>
              </div>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
            <p className="font-semibold text-gray-800 text-sm">Join our community 👇</p>
            <a
              href={`https://wa.me/12016800266?text=${encodeURIComponent(`Hi! I just registered for ${courseTitle} on BreedSkool. My name is ${name}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white rounded-xl px-4 py-3 transition-colors"
              data-testid="link-welcome-whatsapp"
            >
              <PhoneCall className="w-5 h-5" />
              <div>
                <p className="font-bold text-sm">Say Hi on WhatsApp</p>
                <p className="text-[11px] text-green-100">+1 (201) 680-0266</p>
              </div>
            </a>
            <a
              href="https://t.me/taskdrip"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-3 transition-colors"
              data-testid="link-welcome-telegram"
            >
              <Send className="w-5 h-5" />
              <div>
                <p className="font-bold text-sm">Join Telegram Community</p>
                <p className="text-[11px] text-blue-100">t.me/taskdrip</p>
              </div>
            </a>
          </div>
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl" data-testid="btn-welcome-close">
            Let's Get Started! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Registration Modal ─────────────────────────────────────────────────────────
function RegistrationModal({ open, onClose, courses }: { open: boolean; onClose: () => void; courses: BsCoursePricing[] }) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showWelcome, setShowWelcome] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [registeredCourse, setRegisteredCourse] = useState("");
  const [payLater, setPayLater] = useState(false);
  const [form, setForm] = useState<RegForm>({
    fullName: "", email: "", phone: "", location: "",
    selectedCourseKey: "", selectedCourseTitle: "", amountNgn: 0,
    paymentOption: "pay_later", paymentMethod: "bank_transfer", transactionRef: "",
    currencyUsed: "NGN",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);

  const selectedCourse = courses.find(c => c.courseKey === form.selectedCourseKey);
  const usdAmount = selectedCourse ? toUsd(selectedCourse.discountPrice) : 0;

  const setField = (field: keyof RegForm, value: any) =>
    setForm(f => ({ ...f, [field]: value }));

  const selectCourse = (c: BsCoursePricing) => {
    setField("selectedCourseKey", c.courseKey);
    setField("selectedCourseTitle", c.title);
    setField("amountNgn", c.discountPrice);
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("fullName", form.fullName);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("location", form.location);
      fd.append("selectedCourseKey", form.selectedCourseKey);
      fd.append("selectedCourseTitle", form.selectedCourseTitle);
      fd.append("amountNgn", String(form.amountNgn));
      fd.append("paymentOption", form.paymentOption);
      fd.append("paymentMethod", form.paymentMethod);
      fd.append("transactionRef", form.transactionRef);
      fd.append("currencyUsed", form.currencyUsed);
      if (form.currencyUsed === "USD") fd.append("amountUsd", String(usdAmount.toFixed(2)));
      if (proofFile) fd.append("paymentProof", proofFile);
      const r = await fetch("/api/breedskool/register", { method: "POST", body: fd });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Registration failed"); }
      return r.json();
    },
    onSuccess: () => {
      setRegisteredName(form.fullName);
      setRegisteredCourse(form.selectedCourseTitle);
      setPayLater(form.paymentOption === "pay_later");
      onClose();
      setShowWelcome(true);
      setStep(1);
      setForm({ fullName: "", email: "", phone: "", location: "", selectedCourseKey: "", selectedCourseTitle: "", amountNgn: 0, paymentOption: "pay_later", paymentMethod: "bank_transfer", transactionRef: "", currencyUsed: "NGN" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleNext = () => {
    if (step === 1) {
      if (!form.fullName || !form.email || !form.phone) return toast({ title: "Required", description: "Please fill name, email and phone.", variant: "destructive" });
      setStep(2);
    } else if (step === 2) {
      if (!form.selectedCourseKey) return toast({ title: "Select a course", description: "Please pick a course to continue.", variant: "destructive" });
      setStep(3);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <GraduationCap className="w-6 h-6 text-violet-600" />
              BreedSkool Registration
            </DialogTitle>
          </DialogHeader>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-400"}`}>{s}</div>
                <span className={`text-xs ${step >= s ? "text-violet-700 font-semibold" : "text-gray-400"}`}>
                  {s === 1 ? "Your Info" : s === 2 ? "Select Course" : "Payment"}
                </span>
                {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-violet-500" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Full Name *</Label>
                  <Input value={form.fullName} onChange={e => setField("fullName", e.target.value)} placeholder="John Doe" className="mt-1" data-testid="input-reg-name" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Phone *</Label>
                  <Input value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="+234 800 0000 000" className="mt-1" data-testid="input-reg-phone" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Email Address *</Label>
                <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} placeholder="you@example.com" className="mt-1" data-testid="input-reg-email" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">City / Location</Label>
                <Input value={form.location} onChange={e => setField("location", e.target.value)} placeholder="Lagos, Nigeria" className="mt-1" data-testid="input-reg-location" />
              </div>
              <Button onClick={handleNext} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl" data-testid="btn-reg-next-1">
                Continue <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Course selection */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Select the course you want to enroll in:</p>
              <div className="grid grid-cols-1 gap-3">
                {courses.map(c => (
                  <BsCourseCard key={c.courseKey} course={c} selected={form.selectedCourseKey === c.courseKey} onClick={() => selectCourse(c)} />
                ))}
              </div>
              {selectedCourse && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                  <p className="text-xs text-violet-700 font-semibold">Selected: {selectedCourse.title}</p>
                  <p className="text-sm font-black text-violet-900 mt-0.5">{fmtNgn(selectedCourse.discountPrice)} <span className="text-xs font-normal text-gray-500">≈ {fmtUsd(toUsd(selectedCourse.discountPrice))}</span></p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl">Back</Button>
                <Button onClick={handleNext} className="flex-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl flex-1" data-testid="btn-reg-next-2">
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Payment option */}
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-2 block">How would you like to proceed?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setField("paymentOption", "pay_now")}
                    className={`border-2 rounded-xl p-3 text-left transition-all ${form.paymentOption === "pay_now" ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-gray-300"}`}
                    data-testid="btn-pay-now"
                  >
                    <CreditCard className={`w-5 h-5 mb-1 ${form.paymentOption === "pay_now" ? "text-violet-600" : "text-gray-400"}`} />
                    <p className="font-bold text-sm text-gray-900">Pay Now</p>
                    <p className="text-xs text-gray-500">Secure your spot immediately</p>
                  </button>
                  <button
                    onClick={() => setField("paymentOption", "pay_later")}
                    className={`border-2 rounded-xl p-3 text-left transition-all ${form.paymentOption === "pay_later" ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-gray-300"}`}
                    data-testid="btn-pay-later"
                  >
                    <Clock className={`w-5 h-5 mb-1 ${form.paymentOption === "pay_later" ? "text-violet-600" : "text-gray-400"}`} />
                    <p className="font-bold text-sm text-gray-900">Register & Pay Later</p>
                    <p className="text-xs text-gray-500">Reserve your spot now, pay in 48hrs</p>
                  </button>
                </div>
              </div>

              {/* Currency toggle */}
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-2 block">Currency</Label>
                <div className="flex gap-2">
                  <button onClick={() => setField("currencyUsed", "NGN")} className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${form.currencyUsed === "NGN" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`} data-testid="btn-currency-ngn">🇳🇬 Naira (NGN)</button>
                  <button onClick={() => setField("currencyUsed", "USD")} className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${form.currencyUsed === "USD" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`} data-testid="btn-currency-usd">🌍 USD (Intl.)</button>
                </div>
                {selectedCourse && (
                  <div className="mt-2 bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">You will pay</p>
                    <p className="text-xl font-black text-gray-900">
                      {form.currencyUsed === "NGN" ? fmtNgn(selectedCourse.discountPrice) : fmtUsd(toUsd(selectedCourse.discountPrice))}
                    </p>
                    {form.currencyUsed === "USD" && <p className="text-xs text-gray-400">Black market rate: ₦{BLACK_MARKET_RATE.toLocaleString()}/$1</p>}
                  </div>
                )}
              </div>

              {/* Payment method */}
              {form.paymentOption === "pay_now" && (
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-2 block">Payment Method</Label>
                  <div className="space-y-2">
                    {Object.entries(PAYMENT_METHODS)
                      .filter(([key]) => form.currencyUsed === "NGN" ? key === "bank_transfer" : key !== "bank_transfer")
                      .map(([key, info]) => (
                        <button
                          key={key}
                          onClick={() => setField("paymentMethod", key)}
                          className={`w-full flex items-center gap-3 border-2 rounded-xl px-4 py-3 text-left transition-all ${form.paymentMethod === key ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-gray-300"}`}
                          data-testid={`btn-pm-${key}`}
                        >
                          <span className="text-xl">{info.icon}</span>
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{info.label}</p>
                            <p className="text-xs text-gray-500">{info.desc}</p>
                          </div>
                          {form.paymentMethod === key && <CheckCircle className="ml-auto w-4 h-4 text-violet-600" />}
                        </button>
                      ))}
                  </div>

                  {/* Payment details */}
                  {form.paymentMethod === "bank_transfer" && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                      <p className="font-bold text-blue-800 mb-1">Bank Transfer Details:</p>
                      <p className="text-blue-700">Bank: <strong>Opay / Palmpay</strong></p>
                      <p className="text-blue-700">Account: <strong>9019802376</strong></p>
                      <p className="text-blue-700">Name: <strong>Breedskool Tech</strong></p>
                      <p className="text-xs text-blue-500 mt-1">After payment, enter your transaction reference below and send proof.</p>
                    </div>
                  )}
                  {(form.paymentMethod === "usdt_tron") && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
                      <p className="font-bold text-green-800 mb-1">USDT TRC-20 Address:</p>
                      <p className="text-green-700 font-mono text-xs break-all">TRX_ADDRESS_HERE</p>
                      <p className="text-xs text-green-500 mt-1">Send USDT on Tron network only. Enter TX hash below.</p>
                    </div>
                  )}
                  {(form.paymentMethod === "usdt_ton") && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                      <p className="font-bold text-blue-800 mb-1">USDT TON Address:</p>
                      <p className="text-blue-700 font-mono text-xs break-all">TON_ADDRESS_HERE</p>
                    </div>
                  )}
                  {(form.paymentMethod === "usdt_bnb") && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm">
                      <p className="font-bold text-yellow-800 mb-1">USDT BEP-20 Address:</p>
                      <p className="text-yellow-700 font-mono text-xs break-all">BNB_ADDRESS_HERE</p>
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Transaction Reference / Hash</Label>
                      <Input value={form.transactionRef} onChange={e => setField("transactionRef", e.target.value)} placeholder="Enter transaction ID or hash" className="mt-1" data-testid="input-txref" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Upload Payment Proof (optional)</Label>
                      <div className="mt-1 border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-violet-300 transition-colors">
                        <input type="file" accept="image/*,application/pdf" className="hidden" id="proof-upload" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                        <label htmlFor="proof-upload" className="cursor-pointer">
                          {proofFile ? (
                            <p className="text-sm font-semibold text-violet-600 flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" />{proofFile.name}</p>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Upload className="w-5 h-5 text-gray-400" />
                              <p className="text-xs text-gray-500">Click to upload screenshot or PDF</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-xl">Back</Button>
                <Button
                  onClick={() => registerMutation.mutate()}
                  disabled={registerMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl"
                  data-testid="btn-reg-submit"
                >
                  {registerMutation.isPending ? "Registering..." : form.paymentOption === "pay_later" ? "Register & Pay Later" : "Complete Registration"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <WelcomeModal open={showWelcome} onClose={() => setShowWelcome(false)} name={registeredName} courseTitle={registeredCourse} payLater={payLater} />
    </>
  );
}

// ── Existing Course helpers ───────────────────────────────────────────────────
const CATEGORIES = [
  { value: "all", label: "All Courses", icon: BookOpen },
  { value: "instagram_growth", label: "Instagram", icon: Instagram },
  { value: "tiktok_mastery", label: "TikTok", icon: Zap },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "monetization", label: "Monetize", icon: DollarSign },
  { value: "content_creation", label: "Content", icon: Play },
  { value: "branding", label: "Branding", icon: Award },
];
const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-red-100 text-red-700",
};
const CATEGORY_GRADIENTS: Record<string, string> = {
  instagram_growth: "from-pink-500 to-purple-600",
  tiktok_mastery: "from-gray-900 to-gray-700",
  youtube: "from-red-500 to-red-700",
  monetization: "from-yellow-500 to-orange-500",
  content_creation: "from-blue-500 to-cyan-500",
  branding: "from-violet-500 to-indigo-600",
  general: "from-teal-500 to-green-600",
};
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  instagram_growth: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=220&fit=crop",
  tiktok_mastery: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400&h=220&fit=crop",
  youtube: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=220&fit=crop",
  monetization: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=220&fit=crop",
  content_creation: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=220&fit=crop",
  branding: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=220&fit=crop",
  general: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=220&fit=crop",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3 w-3 ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
      ))}
    </div>
  );
}

function CourseCard({ course, enrolled }: { course: any; enrolled: boolean }) {
  const gradient = CATEGORY_GRADIENTS[course.category] || "from-violet-500 to-indigo-600";
  const fallbackImg = CATEGORY_FALLBACK_IMAGES[course.category] || CATEGORY_FALLBACK_IMAGES.general;
  const rating = parseFloat(course.averageRating || "0");
  const [, navigate] = useLocation();

  return (
    <div onClick={() => navigate(`/breedskool/${course.id}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate(`/breedskool/${course.id}`)}>
      <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer h-full flex flex-col">
        <div className="relative overflow-hidden">
          <img src={course.thumbnail || fallbackImg} alt={course.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }} />
          <div className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-20`} />
          <div className="absolute top-3 left-3 flex gap-2">
            {course.isFree ? <Badge className="bg-green-500 text-white text-xs font-bold shadow-lg">FREE</Badge> : <Badge className="bg-white text-gray-900 text-xs font-bold shadow-lg">${course.price}</Badge>}
            {course.isFeatured && <Badge className="bg-violet-600 text-white text-xs font-bold shadow-lg">⭐ Featured</Badge>}
          </div>
          {enrolled && <div className="absolute top-3 right-3"><div className="bg-green-500 rounded-full p-1"><CheckCircle2 className="h-4 w-4 text-white" /></div></div>}
          <div className="absolute bottom-3 right-3"><div className="bg-white/90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"><Play className="h-4 w-4 text-violet-600 fill-violet-600" /></div></div>
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`text-[10px] px-2 py-0.5 ${LEVEL_COLORS[course.level] || "bg-gray-100 text-gray-600"}`}>{course.level}</Badge>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{CATEGORIES.find(c => c.value === course.category)?.label || course.category}</span>
          </div>
          <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1 group-hover:text-violet-600 transition-colors line-clamp-2">{course.title}</h3>
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{course.shortDescription || course.description}</p>
          <div className="flex items-center gap-1 mb-3"><StarRating rating={rating} /><span className="text-xs font-semibold text-gray-700">{rating.toFixed(1)}</span><span className="text-xs text-gray-400">({course.reviewsCount || 0})</span></div>
          <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1"><Users className="h-3 w-3" /><span>{(course.studentsCount || 0).toLocaleString()} students</span></div>
            {course.duration && <div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>{course.duration}</span></div>}
            {course.lessonsCount > 0 && <div className="flex items-center gap-1"><BookOpen className="h-3 w-3" /><span>{course.lessonsCount} lessons</span></div>}
          </div>
          {course.instructor && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                {course.instructor.profileImageUrl ? <img src={course.instructor.profileImageUrl} alt="" className="w-full h-full object-cover" /> : (course.instructor.firstName?.[0] || "?")}
              </div>
              <span className="text-[11px] text-gray-500">
                <span className="hover:underline cursor-pointer text-violet-600" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${course.instructor.id}`); }}>
                  {course.instructor.firstName} {course.instructor.lastName}
                </span>
                {course.instructor.isVerified && <span className="ml-1 text-blue-500">✓</span>}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CourseSpotlightCarousel({ courses, enrolledIds }: { courses: any[]; enrolledIds: Set<string> }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const total = courses.length;
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

  if (courses.length === 0) return null;
  const course = courses[current];
  const gradient = CATEGORY_GRADIENTS[course.category] || "from-violet-500 to-indigo-600";
  const fallbackImg = CATEGORY_FALLBACK_IMAGES[course.category] || CATEGORY_FALLBACK_IMAGES.general;
  const enrolled = enrolledIds.has(course.id);
  const [, navigate] = useLocation();

  return (
    <div className="mb-10">
      <div className="relative rounded-3xl overflow-hidden group cursor-pointer" onClick={() => navigate(`/breedskool/${course.id}`)}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        <img src={course.thumbnail || fallbackImg} alt={course.title}
          className={`absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-all duration-500 group-hover:scale-105 ${fading ? "opacity-0" : ""}`}
          onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
        <div className={`relative p-8 md:p-12 min-h-[260px] flex flex-col justify-end transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge className="bg-yellow-400 text-yellow-900 font-bold text-xs px-3 py-1">⭐ Spotlight Course</Badge>
            {course.isFree ? <Badge className="bg-green-500 text-white text-xs font-bold">FREE</Badge> : <Badge className="bg-white/20 text-white border border-white/30 text-xs">${course.price}</Badge>}
            {enrolled && <Badge className="bg-emerald-500 text-white text-xs font-bold">✓ Enrolled</Badge>}
            <Badge className="bg-white/20 text-white border border-white/30 text-xs capitalize">{course.level}</Badge>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1 max-w-2xl leading-tight">{course.title}</h2>
          {course.shortDescription && <p className="text-white/80 text-sm max-w-xl line-clamp-2 mb-4">{course.shortDescription}</p>}
          <div className="flex flex-wrap items-center gap-4">
            {course.duration && <span className="text-white/70 text-sm flex items-center gap-1"><Clock className="w-4 h-4" />{course.duration}</span>}
            {course.lessonsCount > 0 && <span className="text-white/70 text-sm flex items-center gap-1"><BookOpen className="w-4 h-4" />{course.lessonsCount} lessons</span>}
            {parseFloat(course.averageRating || "0") > 0 && <span className="text-white/70 text-sm flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{parseFloat(course.averageRating).toFixed(1)}</span>}
            <Button onClick={e => { e.stopPropagation(); navigate(`/breedskool/${course.id}`); }} className={`ml-auto font-bold px-5 rounded-xl shadow-lg ${enrolled ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-white text-gray-900 hover:bg-yellow-50"}`} data-testid={`btn-spotlight-course-${course.id}`}>
              {enrolled ? <><CheckCircle2 className="w-4 h-4 mr-1.5" />Continue</> : <>View Course <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        </div>
      </div>
      {total > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={e => { e.stopPropagation(); goTo((current - 1 + total) % total); }} className="w-10 h-10 rounded-full bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 hover:shadow-[0_0_15px_rgba(139,92,246,0.55)] hover:border-violet-400 flex items-center justify-center transition-all" data-testid="btn-breedskool-spotlight-prev"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex gap-2">{courses.map((_, i) => <button key={i} onClick={e => { e.stopPropagation(); goTo(i); }} className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-violet-600" : "w-2 bg-gray-300 hover:bg-gray-400"}`} data-testid={`btn-breedskool-spotlight-dot-${i}`} />)}</div>
          <button onClick={e => { e.stopPropagation(); goTo((current + 1) % total); }} className="w-10 h-10 rounded-full bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 hover:shadow-[0_0_15px_rgba(139,92,246,0.55)] hover:border-violet-400 flex items-center justify-center transition-all" data-testid="btn-breedskool-spotlight-next"><ChevronRight className="w-5 h-5" /></button>
        </div>
      )}
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function BreedSkool() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [showRegModal, setShowRegModal] = useState(false);

  const { data: courses = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/courses"] });
  const { data: myEnrollments = [] } = useQuery<any[]>({ queryKey: ["/api/courses/my-enrollments"], enabled: isAuthenticated });
  const { data: bsPricing = [] } = useQuery<BsCoursePricing[]>({ queryKey: ["/api/breedskool/pricing"] });

  const enrolledCourseIds = new Set((myEnrollments as any[]).map((e: any) => e.courseId));
  const filtered = courses.filter((c: any) => {
    if (activeCategory !== "all" && c.category !== activeCategory) return false;
    if (levelFilter !== "all" && c.level !== levelFilter) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); return c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q); }
    return true;
  });
  const featured = courses.filter((c: any) => c.isFeatured);
  const freeCourses = courses.filter((c: any) => c.isFree);
  const totalStudents = courses.reduce((sum: number, c: any) => sum + (c.studentsCount || 0), 0);
  const isPremium = (user as any)?.subscriptionStatus === "active";
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";
  const canTeach = isAdmin || isPremium;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdPopupZone page="breedskool" />
      <NavigationFixed />
      <AdSlot page="breedskool" placementType="banner_top" className="w-full" />

      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden min-h-[580px] flex items-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&h=700&fit=crop')" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/92 via-purple-900/88 to-indigo-900/92" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/6 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-24 w-full text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 mb-6 shadow-lg">
            <span className="text-2xl">🎓</span>
            <span className="text-white text-sm font-semibold tracking-wide">BreedSkool – Tech Training Academy</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight drop-shadow-xl">
            Where Skills Become <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">Income</span>
          </h1>
          <p className="text-white/80 text-base md:text-xl max-w-3xl mx-auto mb-3 leading-relaxed">
            Empowering tech enthusiasts to acquire the requisite skills in this Web3 dispensation — <strong className="text-white">build & manage profitable online businesses</strong> and become valuable digital assets in the global labour market.
          </p>
          <p className="text-violet-300 text-sm md:text-base mb-10 font-medium">Individuals become Global Digital Assets. 🌍</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              onClick={() => setShowRegModal(true)}
              size="lg"
              className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900 font-black px-8 py-6 text-base rounded-2xl shadow-2xl shadow-orange-400/30 hover:-translate-y-0.5 transition-all"
              data-testid="btn-hero-register"
            >
              🎓 Register Now — Start Learning
            </Button>
            <a href="#courses">
              <Button variant="outline" size="lg" className="border-white/30 text-white bg-white/10 hover:bg-white/20 font-bold px-6 py-6 text-base rounded-2xl" data-testid="btn-hero-browse">
                Browse All Courses <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
            {[
              { value: `${courses.length + 4}+`, label: "Courses", icon: "📚" },
              { value: `${totalStudents.toLocaleString()}+`, label: "Students", icon: "🎓" },
              { value: "4", label: "Tech Programs", icon: "💻" },
              { value: "100%", label: "Online", icon: "🌍" },
            ].map((s) => (
              <div key={s.label} className="text-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4 shadow-lg">
                <p className="text-3xl mb-1">{s.icon}</p>
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-white/60 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tech Training Courses Section ── */}
      {bsPricing.length > 0 && (
        <section className="py-16 bg-white" id="tech-training">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <Badge className="mb-3 bg-violet-100 text-violet-700 border-0 px-4 py-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1 inline" /> Nigerian Naira Pricing
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">BreedSkool Tech Training Programs</h2>
              <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">
                Industry-focused programs designed to take you from zero to profitable in the digital economy. Taught by practitioners, not just theorists.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              {bsPricing.map((course) => {
                const Icon = COURSE_ICONS[course.courseKey] || BookOpen;
                const gradient = COURSE_GRADIENTS[course.courseKey] || "from-gray-600 to-gray-500";
                const savings = course.regularPrice - course.discountPrice;
                const savingsPct = Math.round((savings / course.regularPrice) * 100);
                return (
                  <div key={course.courseKey} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden" data-testid={`card-training-${course.courseKey}`}>
                    <div className={`h-2 bg-gradient-to-r ${gradient}`} />
                    <div className="p-5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-sm`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-[10px] px-2 py-0.5 ${COURSE_BADGE_COLOR[course.courseKey] || "bg-gray-100 text-gray-600"} border-0`}>{course.duration}</Badge>
                        <Badge className="bg-red-100 text-red-600 text-[10px] border-0">-{savingsPct}% OFF</Badge>
                      </div>
                      <h3 className="font-black text-gray-900 text-sm mb-1 leading-snug">{course.title}</h3>
                      <p className="text-xs text-gray-500 mb-4 line-clamp-3">{course.shortDescription}</p>
                      <div className="border-t border-gray-100 pt-3">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs text-gray-400 line-through">{fmtNgn(course.regularPrice)}</span>
                          <span className="text-xs text-green-600 font-semibold">Save {fmtNgn(savings)}</span>
                        </div>
                        <p className="text-xl font-black text-gray-900">{fmtNgn(course.discountPrice)}</p>
                        <p className="text-xs text-gray-400">≈ {fmtUsd(toUsd(course.discountPrice))} for international students</p>
                      </div>
                      <Button onClick={() => setShowRegModal(true)} className={`w-full mt-4 bg-gradient-to-r ${gradient} hover:opacity-90 text-white font-bold rounded-xl text-sm`} data-testid={`btn-enroll-${course.courseKey}`}>
                        Enroll Now <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Currency Converter Info */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <Globe2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="font-bold text-gray-900 mb-1">International Students Welcome 🌍</h3>
              <p className="text-sm text-gray-600 mb-3">All prices are in Nigerian Naira. International students can pay the USD equivalent using the current black market exchange rate.</p>
              <div className="flex items-center justify-center gap-6 flex-wrap text-sm font-semibold">
                <span className="bg-white rounded-xl px-4 py-2 border border-emerald-200 text-gray-700">Current Rate: ₦{BLACK_MARKET_RATE.toLocaleString()} / $1</span>
                <span className="text-gray-500">Pay in:</span>
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                  <span key={k} className="bg-white rounded-xl px-3 py-1.5 border border-gray-200 text-gray-600 text-xs">{v.icon} {v.label.split(" ")[0]} {v.label.split(" ").slice(1).join(" ")}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Why BreedSkool Section ── */}
      <section className="py-14 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-2">Why BreedSkool?</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">We don't just teach — we equip you with income-generating digital skills.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "🎯", title: "Goal-Oriented Training", desc: "Each program is designed with a clear outcome: income. Not just certificates." },
              { icon: "🌐", title: "Web3 Focused", desc: "Courses cover blockchain, crypto, DeFi, NFTs, AI and the tools shaping the future." },
              { icon: "💰", title: "Income-Ready Skills", desc: "Start freelancing or monetizing within weeks of completing your program." },
              { icon: "🤝", title: "Community Support", desc: "Join a WhatsApp & Telegram community of learners, tutors and industry experts." },
            ].map((item) => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <p className="text-3xl mb-3">{item.icon}</p>
                <h3 className="font-bold text-white mb-1 text-sm">{item.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button onClick={() => setShowRegModal(true)} size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl px-8 shadow-xl" data-testid="btn-why-register">
              Register for a Course <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Course Library Section ── */}
      <div className="max-w-7xl mx-auto px-4 py-10" id="courses">

        {/* Teach on BreedSkool CTA */}
        {isAuthenticated && canTeach && (
          <div className="mb-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 flex items-center justify-between text-white shadow-lg">
            <div>
              <h3 className="text-lg font-bold">🎤 Teach on BreedSkool</h3>
              <p className="text-white/80 text-sm mt-1">Share your expertise and earn revenue from your courses</p>
            </div>
            <Button className="bg-white text-violet-700 hover:bg-gray-100 font-semibold" onClick={() => setLocation("/admin/courses")}>Create a Course</Button>
          </div>
        )}

        {!isAuthenticated && (
          <div className="mb-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-lg">
            <div>
              <h3 className="text-lg font-bold">🎓 BreedSkool Tech Training</h3>
              <p className="text-white/80 text-sm mt-1">Register without an account — learn at your own pace, earn real skills.</p>
            </div>
            <Button className="bg-white text-violet-700 hover:bg-gray-100 font-semibold whitespace-nowrap" onClick={() => setShowRegModal(true)} data-testid="btn-enroll-banner">Enroll Now</Button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button key={cat.value} onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 ${activeCategory === cat.value ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>
                <Icon className="h-4 w-4" /> {cat.label}
              </button>
            );
          })}
          <div className="ml-auto flex gap-2">
            {["all", "beginner", "intermediate", "advanced"].map((lvl) => (
              <button key={lvl} onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${levelFilter === lvl ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {lvl === "all" ? "All Levels" : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="max-w-xl mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search courses..." className="pl-11 rounded-xl border-gray-200" />
        </div>

        {/* Spotlight Carousel */}
        {featured.length > 0 && activeCategory === "all" && !searchQuery && (
          <section className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-violet-500" />
              <h2 className="text-xl font-bold text-gray-900">Spotlight Courses</h2>
              {featured.length > 1 && <span className="text-xs text-gray-400 ml-1">{featured.length} featured</span>}
            </div>
            <CourseSpotlightCarousel courses={featured} enrolledIds={enrolledCourseIds} />
          </section>
        )}

        {/* All / Filtered Courses */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-gray-900">
              {searchQuery ? `Results for "${searchQuery}"` : activeCategory === "all" ? "All Courses" : CATEGORIES.find(c => c.value === activeCategory)?.label}
              <span className="text-sm font-normal text-gray-400 ml-2">({filtered.length})</span>
            </h2>
          </div>
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse"><div className="h-48 bg-gray-200" /><div className="p-5 space-y-3"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-3 bg-gray-200 rounded w-full" /><div className="h-3 bg-gray-200 rounded w-2/3" /></div></div>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400">No courses found</h3>
              <p className="text-gray-400 mt-2">Try a different category or search term</p>
              {searchQuery && <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>Clear Search</Button>}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((course: any) => <CourseCard key={course.id} course={course} enrolled={enrolledCourseIds.has(course.id)} />)}
            </div>
          )}
        </section>

        {/* Teach Section */}
        {!canTeach && isAuthenticated && (
          <section className="mt-16 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-10 text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Want to Teach on BreedSkool?</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-4">Upgrade to any Premium plan to start creating and selling your own courses, earn from students, and build your influencer brand.</p>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={() => setLocation("/subscription")}>Upgrade to Premium <ChevronRight className="h-4 w-4" /></Button>
          </section>
        )}
      </div>

      {/* ── CTA Bar ── */}
      <section className="py-14 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-white mb-3">Ready to Become a Global Digital Asset? 🌍</h2>
          <p className="text-violet-200 mb-6 text-sm sm:text-base">Join hundreds of students already learning and earning with BreedSkool. No prior experience required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => setShowRegModal(true)} size="lg" className="bg-white text-violet-700 hover:bg-gray-100 font-black px-8 rounded-xl shadow-xl" data-testid="btn-cta-register">
              🎓 Register Now
            </Button>
            <a href="https://wa.me/12016800266" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-white/40 text-white bg-white/10 hover:bg-white/20 font-bold px-6 rounded-xl w-full sm:w-auto" data-testid="btn-cta-whatsapp">
                <PhoneCall className="w-4 h-4 mr-2" /> WhatsApp a Tutor
              </Button>
            </a>
          </div>
        </div>
      </section>

      <AdSlot page="breedskool" placementType="banner_bottom" className="w-full" />
      <Footer />

      <RegistrationModal open={showRegModal} onClose={() => setShowRegModal(false)} courses={bsPricing} />
    </div>
  );
}
