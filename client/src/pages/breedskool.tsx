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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SeoHead } from "@/components/SeoHead";
import {
  BookOpen, Users, Star, Clock, Play, Search, TrendingUp, Zap,
  Instagram, Youtube, DollarSign, Award, ChevronRight, ChevronLeft, CheckCircle2,
  Laptop, Brain, TrendingDown, GraduationCap, Globe2, ArrowRight, Sparkles, X,
  PhoneCall, MessageCircle, Send, CheckCircle, AlertCircle, CreditCard, Upload,
  MapPin, Eye, EyeOff, User, Mail, Lock, ShieldCheck, Timer, Home, MonitorPlay, School, Baby,
  Share2, Copy, Bell,
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
  phone: string;
  location: string;
  email: string;
  password: string;
  confirmPassword: string;
  selectedCourseKey: string;
  selectedCourseTitle: string;
  amountNgn: number;
  paymentOption: "pay_now" | "pay_later";
  paymentMethod: string;
  transactionRef: string;
  deliveryMode: "online" | "onsite" | "home_lesson";
  childName: string;
  childAge: string;
  parentName: string;
  homeAddress: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const BLACK_MARKET_RATE = 1650;
const BREEDSKOOL_IMAGE = "/breedskool-training-project.png";
const TELEGRAM_URL = "https://t.me/taskdrip";
const DONATION_TARGET_GBP = 100000;

const LEARNER_STORIES = [
  {
    name: "Amina O.",
    location: "Lagos, Nigeria",
    role: "Web development learner",
    quote: "I joined to understand how websites are built and left with a project I could show people. The step-by-step lessons made the journey feel possible.",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=160&h=160&fit=crop&crop=face",
  },
  {
    name: "Chidi N.",
    location: "Enugu, Nigeria",
    role: "Digital creator",
    quote: "The community is the best part for me. I can ask a question, see how other learners approach it, and keep moving instead of getting stuck alone.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face",
  },
  {
    name: "Zainab M.",
    location: "Abuja, Nigeria",
    role: "AI content learner",
    quote: "The practical projects helped me turn curiosity into a real routine. I now know what to practise next and where to get feedback.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&h=160&fit=crop&crop=face",
  },
  {
    name: "Tunde A.",
    location: "Ibadan, Nigeria",
    role: "Community learner",
    quote: "I started with no technical background. Having lessons, reminders and other African learners in one place gave me the confidence to keep showing up.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=face",
  },
  {
    name: "Nneka E.",
    location: "Port Harcourt, Nigeria",
    role: "SaaS learner",
    quote: "The lessons helped me stop waiting for the perfect time. I can now break a big idea into a small project and ask for help when I need it.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=face",
  },
  {
    name: "Kofi B.",
    location: "Accra, Ghana",
    role: "Digital skills learner",
    quote: "I appreciate that the learning is practical. Every module gives me something I can try immediately instead of only theory.",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=face",
  },
  {
    name: "Fatima S.",
    location: "Kano, Nigeria",
    role: "Content creator",
    quote: "The community makes the process less intimidating. Seeing people share progress encouraged me to share my own work too.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&h=160&fit=crop&crop=face",
  },
  {
    name: "Mandla P.",
    location: "Johannesburg, South Africa",
    role: "Web learner",
    quote: "I joined for the free foundations course and found a clear path into deeper training. The first lesson gave me a useful place to begin.",
    image: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=160&h=160&fit=crop&crop=face",
  },
];

const FUNDRAISING_MILESTONES = [
  { amount: 10000, label: "Equip learners", detail: "Starter devices, data support, and learning materials" },
  { amount: 25000, label: "Open access", detail: "Connectivity grants and more free course places" },
  { amount: 50000, label: "Grow mentorship", detail: "Tutors, community sessions, and practical workshops" },
  { amount: 100000, label: "Scale the mission", detail: "A sustainable training hub reaching more communities" },
];

const ALL_PAYMENT_METHODS: Record<string, { label: string; icon: string; desc: string }> = {
  bank_transfer: { label: "Bank Transfer", icon: "🏦", desc: "Pay via local bank transfer (Opay/Palmpay)" },
  usdt_tron: { label: "USDT – TRC-20", icon: "💎", desc: "Pay with USDT on the Tron network" },
  usdt_ton: { label: "USDT – TON", icon: "💠", desc: "Pay with USDT on the TON network" },
  usdt_bnb: { label: "USDT – BEP-20", icon: "🟡", desc: "Pay with USDT on BNB Smart Chain" },
};

const COURSE_ICONS: Record<string, any> = {
  webdev: Laptop,
  ai_content: Brain,
  social_monetize: Globe2,
  trading: TrendingDown,
  home_lesson: Home,
  onsite_training: School,
};
const COURSE_GRADIENTS: Record<string, string> = {
  webdev: "from-blue-600 to-cyan-500",
  ai_content: "from-violet-600 to-purple-500",
  social_monetize: "from-emerald-600 to-teal-500",
  trading: "from-orange-600 to-amber-500",
  home_lesson: "from-pink-600 to-rose-500",
  onsite_training: "from-teal-600 to-green-500",
};
const COURSE_BG: Record<string, string> = {
  webdev: "bg-blue-50 border-blue-100",
  ai_content: "bg-violet-50 border-violet-100",
  social_monetize: "bg-emerald-50 border-emerald-100",
  trading: "bg-orange-50 border-orange-100",
  home_lesson: "bg-pink-50 border-pink-100",
  onsite_training: "bg-teal-50 border-teal-100",
};
const COURSE_BADGE_COLOR: Record<string, string> = {
  webdev: "bg-blue-100 text-blue-700",
  ai_content: "bg-violet-100 text-violet-700",
  social_monetize: "bg-emerald-100 text-emerald-700",
  trading: "bg-orange-100 text-orange-700",
  home_lesson: "bg-pink-100 text-pink-700",
  onsite_training: "bg-teal-100 text-teal-700",
};

const fmtNgn = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const toUsd = (ngn: number) => ngn / BLACK_MARKET_RATE;

// Default courses shown when admin hasn't seeded pricing yet
const DEFAULT_COURSES: BsCoursePricing[] = [
  {
    id: "default-webdev",
    courseKey: "webdev",
    title: "Web Development & Vibe Coding",
    shortDescription: "Build modern websites, web apps, and vibe-coded digital products from scratch. Master HTML, CSS, JavaScript, React, Node.js, and deployment.",
    regularPrice: 220000,
    discountPrice: 150000,
    duration: "8 Weeks",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
  {
    id: "default-ai_content",
    courseKey: "ai_content",
    title: "AI Content Creation & Video Editing",
    shortDescription: "Leverage ChatGPT, Midjourney & AI video tools to create viral content, professional videos, and earn from multiple platforms.",
    regularPrice: 270000,
    discountPrice: 179000,
    duration: "6 Weeks",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
  {
    id: "default-social_monetize",
    courseKey: "social_monetize",
    title: "Social Media & Web Assets Monetization",
    shortDescription: "Build and monetize Instagram, TikTok & YouTube channels, websites, and digital assets to unlock multiple income streams.",
    regularPrice: 400000,
    discountPrice: 320000,
    duration: "6 Weeks",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
  {
    id: "default-trading",
    courseKey: "trading",
    title: "Pocket Option Trading",
    shortDescription: "Master Pocket Option binary trading, chart analysis, risk management, and consistent income strategies for financial freedom.",
    regularPrice: 320000,
    discountPrice: 279000,
    duration: "8 Weeks",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
  {
    id: "default-home_lesson",
    courseKey: "home_lesson",
    title: "Tech Home Lessons for Kids",
    shortDescription: "One-on-one tech lessons delivered at your home by a certified tutor. Book flexible sessions for your child (ages 6–17) covering coding, AI tools, digital skills, and more.",
    regularPrice: 120000,
    discountPrice: 85000,
    duration: "Per Session",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
  {
    id: "default-onsite_training",
    courseKey: "onsite_training",
    title: "Onsite Group Training",
    shortDescription: "Join our hands-on classroom sessions at TootoOba Estate, Ikorodu Lagos. Work alongside fellow students in a structured environment with daily tutor support.",
    regularPrice: 180000,
    discountPrice: 130000,
    duration: "6–8 Weeks",
    isActive: true,
    acceptedPayments: ["bank_transfer", "usdt_tron", "usdt_ton", "usdt_bnb"],
  },
];

// ── Step Indicator ─────────────────────────────────────────────────────────────
const STEPS = ["Personal Info", "Create Account", "Choose Course", "Payment"];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((label, i) => {
        const s = i + 1;
        const done = step > s;
        const active = step === s;
        return (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? "bg-emerald-500 text-white" : active ? "bg-violet-600 text-white ring-4 ring-violet-100" : "bg-gray-100 text-gray-400"
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${active ? "text-violet-700" : done ? "text-emerald-600" : "text-gray-400"}`}>{label}</span>
            </div>
            {s < STEPS.length && <div className={`flex-1 h-0.5 mx-1 mb-4 ${step > s ? "bg-emerald-400" : "bg-gray-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Course Selection Card ─────────────────────────────────────────────────────
function BsCourseCard({ course, selected, onClick }: { course: BsCoursePricing; selected: boolean; onClick: () => void }) {
  const Icon = COURSE_ICONS[course.courseKey] || BookOpen;
  const gradient = COURSE_GRADIENTS[course.courseKey] || "from-gray-600 to-gray-500";
  const bg = COURSE_BG[course.courseKey] || "bg-gray-50 border-gray-100";
  const savings = course.regularPrice - course.discountPrice;
  const savingsPct = Math.round((savings / course.regularPrice) * 100);

  return (
    <div
      onClick={onClick}
      className={`relative border-2 rounded-2xl p-4 cursor-pointer transition-all duration-200 ${
        selected
          ? "border-violet-500 bg-violet-50 shadow-lg shadow-violet-100 scale-[1.01]"
          : `border-transparent ${bg} hover:border-gray-300 hover:shadow-md`
      }`}
      data-testid={`card-bscourse-${course.courseKey}`}
    >
      {selected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={`text-[10px] px-2 py-0.5 ${COURSE_BADGE_COLOR[course.courseKey] || "bg-gray-100 text-gray-600"} border-0`}>{course.duration}</Badge>
            <Badge className="bg-red-100 text-red-600 text-[10px] border-0">-{savingsPct}% OFF</Badge>
          </div>
          <h3 className="font-bold text-gray-900 text-sm mb-0.5 leading-snug">{course.title}</h3>
          <p className="text-xs text-gray-500 whitespace-normal break-anywhere mb-2">{course.shortDescription}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-gray-400 line-through">{fmtNgn(course.regularPrice)}</span>
            <span className="text-base font-black text-gray-900">{fmtNgn(course.discountPrice)}</span>
            <span className="text-[11px] text-gray-400">≈ {fmtUsd(toUsd(course.discountPrice))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Password Input ─────────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder, id, testId }: { value: string; onChange: (v: string) => void; placeholder?: string; id?: string; testId?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Password"}
        className="pr-10"
        data-testid={testId}
      />
      <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Registration Modal ─────────────────────────────────────────────────────────
function RegistrationModal({ open, onClose, courses: rawCourses, initialDeliveryMode = "online" }: {
  open: boolean;
  onClose: () => void;
  courses: BsCoursePricing[];
  initialDeliveryMode?: "online" | "onsite" | "home_lesson";
}) {
  // Use admin-configured courses if available, otherwise fall back to defaults
  const courses = rawCourses.length > 0 ? rawCourses : DEFAULT_COURSES;
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [registeredCourse, setRegisteredCourse] = useState("");
  const [registeredCourseId, setRegisteredCourseId] = useState<string | null>(null);
  const [payLater, setPayLater] = useState(false);
  const [regWrongPassword, setRegWrongPassword] = useState(false);
  const [regAutoLoggedIn, setRegAutoLoggedIn] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  // Inline login mode — for existing account holders
  const [loginMode, setLoginMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [form, setForm] = useState<RegForm>({
    fullName: "", phone: "", location: "",
    email: "", password: "", confirmPassword: "",
    selectedCourseKey: "", selectedCourseTitle: "", amountNgn: 0,
    paymentOption: "pay_now", paymentMethod: "bank_transfer", transactionRef: "",
    deliveryMode: initialDeliveryMode, childName: "", childAge: "", parentName: "", homeAddress: "",
  });

  // Fetch payment settings directly inside the modal (fixes missing bsPaySettings reference)
  const { data: bsPaySettings = {} } = useQuery<Record<string, string>>({ queryKey: ["/api/breedskool/payment-settings"] });

  // Pre-select delivery mode whenever the modal opens with a different mode
  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, deliveryMode: initialDeliveryMode }));
      setStep(1);
    }
  }, [open, initialDeliveryMode]);

  // Keep the student on a clear confirmation state long enough to read the
  // thank-you message, then take them to the learning dashboard — never back
  // to the BreedSkool landing page.
  useEffect(() => {
    if (!showSuccess || regWrongPassword) return;
    const timer = window.setTimeout(() => {
      setShowSuccess(false);
      navigate("/dashboard?tab=training");
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [showSuccess, regWrongPassword]);

  const set = (field: keyof RegForm, value: any) =>
    setForm(f => ({ ...f, [field]: value }));

  const selectedCourse = courses.find(c => c.courseKey === form.selectedCourseKey);
  const availableMethods = selectedCourse?.acceptedPayments?.length
    ? selectedCourse.acceptedPayments
    : Object.keys(ALL_PAYMENT_METHODS);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("fullName", form.fullName);
      fd.append("email", form.email);
      fd.append("password", form.password);
      fd.append("phone", form.phone);
      fd.append("location", form.location);
      fd.append("selectedCourseKey", form.selectedCourseKey);
      fd.append("selectedCourseTitle", form.selectedCourseTitle);
      fd.append("amountNgn", String(form.amountNgn));
      fd.append("paymentOption", form.paymentOption);
      fd.append("paymentMethod", form.paymentMethod);
      fd.append("transactionRef", form.transactionRef);
      fd.append("currencyUsed", "NGN");
      fd.append("deliveryMode", form.deliveryMode);
      if (form.childName) fd.append("childName", form.childName);
      if (form.childAge) fd.append("childAge", form.childAge);
      if (form.parentName) fd.append("parentName", form.parentName);
      if (form.homeAddress) fd.append("homeAddress", form.homeAddress);
      if (proofFile) fd.append("paymentProof", proofFile);
      const r = await fetch("/api/breedskool/register", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Registration failed"); }
      return r.json();
    },
    onSuccess: (data) => {
      if (data.loggedIn && data.user) {
        queryClient.setQueryData(["/api/user"], data.user);
        queryClient.invalidateQueries({ queryKey: ["/api/my/breedskool-registrations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/my/enrollments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/courses/my-enrollments"] });
      }
      onClose();
      if (data.wrongPassword) {
        // Existing account, wrong password — show modal with login button
        setRegisteredName(form.fullName);
        setRegisteredCourse(form.selectedCourseTitle);
        setRegisteredCourseId(data.linkedCourseId || null);
        setRegWrongPassword(true);
        setRegAutoLoggedIn(false);
        setPayLater(form.paymentOption === "pay_later");
        setShowSuccess(true);
      } else {
        // Keep every successful signup on this page first so the student sees
        // the thank-you message, community links, and dashboard next step.
        setRegisteredName(form.fullName);
        setRegisteredCourse(form.selectedCourseTitle);
        setRegisteredCourseId(data.linkedCourseId || null);
        setRegWrongPassword(false);
        setRegAutoLoggedIn(false);
        setPayLater(form.paymentOption === "pay_later");
        setShowSuccess(true);
      }
    },
    onError: (e: any) => toast({ title: "Registration failed", description: e.message, variant: "destructive" }),
  });

  const next = () => {
    if (step === 1) {
      if (!form.fullName.trim() || !form.phone.trim()) {
        return toast({ title: "Required fields", description: "Please enter your full name and phone number.", variant: "destructive" });
      }
      if (form.deliveryMode === "home_lesson") {
        if (!form.childName.trim()) return toast({ title: "Child's name required", description: "Please enter the child's full name.", variant: "destructive" });
        if (!form.homeAddress.trim()) return toast({ title: "Home address required", description: "Please enter your home address for the tutor visit.", variant: "destructive" });
      }
      // Auto-select course for onsite / home_lesson (only one option each)
      if (form.deliveryMode !== "online") {
        const targetKey = form.deliveryMode === "onsite" ? "onsite_training" : "home_lesson";
        const c = courses.find(c => c.courseKey === targetKey);
        if (c) setForm(f => ({ ...f, selectedCourseKey: c.courseKey, selectedCourseTitle: c.title, amountNgn: c.discountPrice }));
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.email.trim()) return toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      if (!form.password || form.password.length < 6) return toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      if (form.password !== form.confirmPassword) return toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      // Skip step 3 for onsite/home_lesson — course already auto-selected in step 1
      if (form.deliveryMode !== "online") {
        setStep(4);
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      if (!form.selectedCourseKey) return toast({ title: "Select a course", description: "Please pick a course to continue.", variant: "destructive" });
      setStep(4);
    }
  };

  const back = () => {
    // Skip step 3 when going back from step 4 for onsite/home_lesson (step 3 is skipped)
    if (step === 4 && form.deliveryMode !== "online") {
      setStep(2);
    } else {
      setStep(s => Math.max(1, s - 1) as any);
    }
  };

  // Filter courses shown in step 3 based on delivery mode
  const coursesForStep3 = courses.filter(c => {
    if (!c.isActive) return false;
    if (form.deliveryMode === "home_lesson") return c.courseKey === "home_lesson";
    if (form.deliveryMode === "onsite") return c.courseKey === "onsite_training";
    // For online mode: show all courses except onsite/home_lesson physical-only ones
    return c.courseKey !== "onsite_training" && c.courseKey !== "home_lesson";
  });

  const reset = () => {
    setStep(1);
    setShowSuccess(false);
    setProofFile(null);
    setLoginMode(false);
    setLoginEmail("");
    setLoginPassword("");
    setForm({ fullName: "", phone: "", location: "", email: "", password: "", confirmPassword: "", selectedCourseKey: "", selectedCourseTitle: "", amountNgn: 0, paymentOption: "pay_now", paymentMethod: "bank_transfer", transactionRef: "", deliveryMode: initialDeliveryMode, childName: "", childAge: "", parentName: "", homeAddress: "" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 pt-6 pb-5 rounded-t-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white font-black text-lg">BreedSkool Registration</DialogTitle>
                <DialogDescription className="text-violet-200 text-xs">Create your free account & enroll in a tech training program.</DialogDescription>
              </div>
            </div>
            <StepIndicator step={step} />
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* ── Step 1: Personal Info ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center pb-1">
                  <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <User className="w-6 h-6 text-violet-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Tell us about yourself</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Let's get to know you before you start learning</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Full Name *</Label>
                  <Input value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="e.g. Adebayo Okonkwo" className="mt-1" data-testid="input-reg-name" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Phone Number *</Label>
                  <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+234 800 0000 000" className="mt-1" data-testid="input-reg-phone" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-700">City / Location</Label>
                  <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Lagos, Nigeria" className="mt-1" data-testid="input-reg-location" />
                </div>

                {/* Delivery Mode Selector */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-2 block">How would you like to learn? *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "online", label: "Online", icon: MonitorPlay, desc: "Live sessions & recorded classes" },
                      { value: "onsite", label: "Onsite", icon: School, desc: "At our Lagos campus" },
                      { value: "home_lesson", label: "Home Lesson", icon: Home, desc: "Tutor visits your home" },
                    ].map(({ value, label, icon: Icon, desc }) => (
                      <button key={value} type="button" onClick={() => set("deliveryMode", value)}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${form.deliveryMode === value ? "border-violet-500 bg-violet-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                        <Icon className={`w-5 h-5 ${form.deliveryMode === value ? "text-violet-600" : "text-gray-500"}`} />
                        <span className={`text-xs font-bold leading-tight ${form.deliveryMode === value ? "text-violet-700" : "text-gray-700"}`}>{label}</span>
                        <span className="text-[9px] text-gray-400 leading-tight">{desc}</span>
                        {form.deliveryMode === value && <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-violet-600 rounded-full flex items-center justify-center"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Child details — shown only when Home Lesson is selected */}
                {form.deliveryMode === "home_lesson" && (
                  <div className="space-y-3 bg-pink-50 border border-pink-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Baby className="w-4 h-4 text-pink-500" />
                      <p className="text-xs font-bold text-pink-700">Child's Details (for home lesson booking)</p>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Child's Full Name *</Label>
                      <Input value={form.childName} onChange={e => set("childName", e.target.value)} placeholder="e.g. Tomiwa Okafor" className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Child's Age *</Label>
                        <Input value={form.childAge} onChange={e => set("childAge", e.target.value)} placeholder="e.g. 10" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Your Name (Parent)</Label>
                        <Input value={form.parentName} onChange={e => set("parentName", e.target.value)} placeholder="Parent / Guardian" className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Home Address for Tutor Visit *</Label>
                      <Input value={form.homeAddress} onChange={e => set("homeAddress", e.target.value)} placeholder="Full address where lessons will hold" className="mt-1" />
                    </div>
                    <p className="text-[10px] text-pink-600">Our tutor will be assigned and contact you to confirm the schedule.</p>
                  </div>
                )}

                {/* Onsite details — shown only when Onsite is selected */}
                {form.deliveryMode === "onsite" && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex gap-2">
                    <MapPin className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-teal-700">Onsite Location</p>
                      <p className="text-xs text-teal-600 mt-0.5">TootoOba Estate, Ijede, Ikorodu, Lagos. Training runs weekdays and weekends — we will confirm your schedule by WhatsApp.</p>
                    </div>
                  </div>
                )}

                <Button onClick={next} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl h-11" data-testid="btn-reg-next-1">
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {/* ── Step 2: Create Account ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center pb-1">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ShieldCheck className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Create your login details</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Your email and password will be used to access your student dashboard</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Email Address *</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" className="pl-9" data-testid="input-reg-email" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Create Password *</Label>
                  <div className="mt-1">
                    <PasswordInput value={form.password} onChange={v => set("password", v)} placeholder="Min. 6 characters" testId="input-reg-password" />
                  </div>
                  {form.password.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {[form.password.length >= 6, /[A-Z]/.test(form.password), /[0-9]/.test(form.password)].map((ok, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${ok ? "bg-emerald-400" : "bg-gray-200"}`} />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Confirm Password *</Label>
                  <div className="mt-1">
                    <PasswordInput value={form.confirmPassword} onChange={v => set("confirmPassword", v)} placeholder="Repeat your password" testId="input-reg-confirm" />
                  </div>
                  {form.confirmPassword && (
                    <p className={`text-xs mt-1 ${form.password === form.confirmPassword ? "text-emerald-600" : "text-red-500"}`}>
                      {form.password === form.confirmPassword ? "✓ Passwords match" : "✗ Passwords don't match yet"}
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 rounded-xl p-3 flex gap-2">
                  <Lock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">Your account gives you access to your student dashboard, course progress, and the BreedSkool community.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={back} className="flex-1 rounded-xl">Back</Button>
                  <Button onClick={next} className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl" data-testid="btn-reg-next-2">
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-center text-xs text-gray-500 mb-2">Already have a Taskdrip account?</p>
                  {!loginMode ? (
                    <button
                      type="button"
                      onClick={() => { setLoginMode(true); setLoginEmail(form.email); }}
                      className="w-full text-center text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl py-2.5 transition-colors"
                      data-testid="btn-reg-login-existing"
                    >
                      Log in with my existing account →
                    </button>
                  ) : (
                    <div className="space-y-3 bg-violet-50 border border-violet-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-violet-800">Log in to continue your enrollment</p>
                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Email</Label>
                        <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Your Taskdrip email" className="mt-1 text-sm" data-testid="input-login-email" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Password</Label>
                        <PasswordInput value={loginPassword} onChange={setLoginPassword} placeholder="Your account password" testId="input-login-password" />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setLoginMode(false)}>Cancel</Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={loginLoading || !loginEmail || !loginPassword}
                          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold"
                          data-testid="btn-login-inline"
                          onClick={async () => {
                            setLoginLoading(true);
                            try {
                              const r = await fetch("/api/login", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({ email: loginEmail, password: loginPassword }),
                              });
                              if (!r.ok) {
                                const err = await r.json();
                                toast({ title: "Login failed", description: err.message || "Check your email and password.", variant: "destructive" });
                              } else {
                                const data = await r.json();
                                queryClient.setQueryData(["/api/user"], data.user || data);
                                queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                                setLoginMode(false);
                                // Pre-fill email so registration is linked to their account
                                set("email", loginEmail);
                                set("password", loginPassword);
                                toast({ title: "✅ Logged in!", description: "Continue the form to complete your enrollment." });
                              }
                            } catch {
                              toast({ title: "Login error", description: "Please try again.", variant: "destructive" });
                            } finally {
                              setLoginLoading(false);
                            }
                          }}
                        >
                          {loginLoading ? "Logging in…" : "Log In →"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: Select Course ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center pb-1">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <BookOpen className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Pick your program</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Choose the course that aligns with your goals</p>
                </div>
                <div className="space-y-3">
                  {coursesForStep3.map(c => (
                    <BsCourseCard
                      key={c.courseKey}
                      course={c}
                      selected={form.selectedCourseKey === c.courseKey}
                      onClick={() => { set("selectedCourseKey", c.courseKey); set("selectedCourseTitle", c.title); set("amountNgn", c.discountPrice); }}
                    />
                  ))}
                </div>
                {selectedCourse && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-violet-600 font-semibold">Selected program</p>
                    <p className="font-black text-violet-900 mt-0.5">{selectedCourse.title}</p>
                    <p className="text-sm font-bold text-gray-700 mt-1">{fmtNgn(selectedCourse.discountPrice)}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={back} className="flex-1 rounded-xl">Back</Button>
                  <Button onClick={next} disabled={!form.selectedCourseKey} className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl" data-testid="btn-reg-next-3">
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 4: Payment ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center pb-1">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CreditCard className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Choose how to pay</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Pay now to unlock full live training, or join free to access online courses only</p>
                </div>

                {/* Order summary */}
                {selectedCourse && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Enrolling in</p>
                        <p className="font-bold text-gray-900 text-sm">{selectedCourse.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 line-through">{fmtNgn(selectedCourse.regularPrice)}</p>
                        <p className="font-black text-gray-900 text-lg">{fmtNgn(selectedCourse.discountPrice)}</p>
                        <p className="text-[11px] text-gray-400">≈ {fmtUsd(toUsd(selectedCourse.discountPrice))}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment timing */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-2 block">When would you like to pay?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => set("paymentOption", "pay_now")}
                      className={`border-2 rounded-xl p-3 text-left transition-all ${form.paymentOption === "pay_now" ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-gray-300"}`}
                      data-testid="btn-pay-now"
                    >
                      <CreditCard className={`w-5 h-5 mb-1.5 ${form.paymentOption === "pay_now" ? "text-violet-600" : "text-gray-400"}`} />
                      <p className="font-bold text-sm text-gray-900">Pay Now</p>
                      <p className="text-xs text-gray-500">Lock your spot immediately</p>
                    </button>
                    <button
                      onClick={() => set("paymentOption", "pay_later")}
                      className={`border-2 rounded-xl p-3 text-left transition-all ${form.paymentOption === "pay_later" ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-gray-300"}`}
                      data-testid="btn-pay-later"
                    >
                      <Timer className={`w-5 h-5 mb-1.5 ${form.paymentOption === "pay_later" ? "text-amber-500" : "text-gray-400"}`} />
                      <p className="font-bold text-sm text-gray-900">Join Free</p>
                      <p className="text-xs text-gray-500">Free online courses only</p>
                    </button>
                  </div>
                  {form.paymentOption === "pay_later" && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 leading-relaxed">
                        You will only have access to <strong>free online courses</strong>. Live training sessions on site are exclusively for paid students. You can upgrade anytime by making payment.
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment method (shown when pay_now) */}
                {form.paymentOption === "pay_now" && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Payment Method</Label>
                    <div className="space-y-2">
                      {availableMethods.map(key => {
                        const info = ALL_PAYMENT_METHODS[key];
                        if (!info) return null;
                        return (
                          <button
                            key={key}
                            onClick={() => set("paymentMethod", key)}
                            className={`w-full flex items-center gap-3 border-2 rounded-xl px-4 py-3 text-left transition-all ${form.paymentMethod === key ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-gray-300"}`}
                            data-testid={`btn-pm-${key}`}
                          >
                            <span className="text-xl">{info.icon}</span>
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-gray-900">{info.label}</p>
                              <p className="text-xs text-gray-500">{info.desc}</p>
                            </div>
                            {form.paymentMethod === key && <CheckCircle className="w-4 h-4 text-violet-600 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Payment details */}
                    {form.paymentMethod === "bank_transfer" && (
                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="font-bold text-blue-800 text-sm mb-2">🏦 Bank Transfer Details</p>
                        <div className="space-y-1.5 text-sm text-blue-800 bg-white/70 rounded-lg p-3">
                          <p>Bank: <strong>{bsPaySettings.breedskool_bank_name || "GTBank"}</strong></p>
                          <p>Account No: <strong className="font-mono tracking-wider">{bsPaySettings.breedskool_bank_account_number || "0273575556"}</strong></p>
                          <p>Acc Name: <strong>{bsPaySettings.breedskool_bank_account_name || "BREEDSKOOL GALAXY LTD"}</strong></p>
                          <p>Currency: <strong>{bsPaySettings.breedskool_bank_country || "Naira (NGN)"}</strong></p>
                        </div>
                        <p className="text-xs text-blue-600 mt-2">{bsPaySettings.breedskool_payment_instructions || "After transfer, enter your transaction reference below and optionally upload your payment screenshot as proof."}</p>
                      </div>
                    )}
                    {form.paymentMethod === "usdt_tron" && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="font-bold text-green-800 text-sm mb-1">💎 USDT TRC-20 Address</p>
                        <p className="font-mono text-xs text-green-700 break-all select-all bg-white/70 rounded-lg px-3 py-2">
                          {bsPaySettings.breedskool_usdt_tron_address || "TRX wallet — contact admin via WhatsApp (+1 201-680-0266) for address"}
                        </p>
                        <p className="text-xs text-green-600 mt-2">Send exact USDT amount on Tron (TRC-20) network. Enter the TX hash below after sending.</p>
                      </div>
                    )}
                    {form.paymentMethod === "usdt_ton" && (
                      <div className="mt-3 bg-sky-50 border border-sky-200 rounded-xl p-4">
                        <p className="font-bold text-sky-800 text-sm mb-1">💠 USDT TON Network Address</p>
                        <p className="font-mono text-xs text-sky-700 break-all select-all bg-white/70 rounded-lg px-3 py-2">
                          {bsPaySettings.breedskool_usdt_ton_address || "TON wallet — contact admin via WhatsApp (+1 201-680-0266) for address"}
                        </p>
                        <p className="text-xs text-sky-600 mt-2">Send exact USDT amount on TON network. Enter the TX hash below after sending.</p>
                      </div>
                    )}
                    {form.paymentMethod === "usdt_bnb" && (
                      <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="font-bold text-yellow-800 text-sm mb-1">🟡 USDT BEP-20 (BNB Smart Chain) Address</p>
                        <p className="font-mono text-xs text-yellow-700 break-all select-all bg-white/70 rounded-lg px-3 py-2">
                          {bsPaySettings.breedskool_usdt_bnb_address || "BEP-20 wallet — contact admin via WhatsApp (+1 201-680-0266) for address"}
                        </p>
                        <p className="text-xs text-yellow-600 mt-2">Send exact USDT amount on BNB Smart Chain (BEP-20). Enter the TX hash below after sending.</p>
                      </div>
                    )}

                    <div className="mt-3 space-y-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Transaction Reference / Hash</Label>
                        <Input value={form.transactionRef} onChange={e => set("transactionRef", e.target.value)} placeholder="Enter transaction ID or hash" className="mt-1" data-testid="input-txref" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Upload Payment Proof <span className="text-gray-400 font-normal">(optional)</span></Label>
                        <div className="mt-1 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-violet-300 transition-colors cursor-pointer">
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

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={back} className="flex-1 rounded-xl">Back</Button>
                  <Button
                    onClick={() => {
                      // Client-side validation before submitting
                      if (!form.fullName.trim()) return toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
                      if (!form.email.trim()) return toast({ title: "Email required", description: "Please enter your email.", variant: "destructive" });
                      if (!form.phone.trim()) return toast({ title: "Phone required", description: "Please enter your phone number.", variant: "destructive" });
                      if (!form.selectedCourseKey) return toast({ title: "No course selected", description: "Please go back to step 3 and select a course.", variant: "destructive" });
                      if (form.paymentOption === "pay_now" && !form.transactionRef.trim() && !proofFile) {
                        return toast({ title: "Payment details needed", description: "Please enter your transaction reference or upload your payment proof.", variant: "destructive" });
                      }
                      registerMutation.mutate();
                    }}
                    disabled={registerMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl h-11"
                    data-testid="btn-reg-submit"
                  >
                    {registerMutation.isPending
                      ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating your account…</span>
                      : form.paymentOption === "pay_later"
                      ? "Join Free — Access Online Courses 🎓"
                      : "Complete Enrollment 🚀"}
                  </Button>
                </div>

                <p className="text-[10px] text-gray-400 text-center">By registering you agree to our Terms of Service. Your account will be created automatically.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Success Modal ── */}
      <Dialog open={showSuccess} onOpenChange={o => { if (!o) { setShowSuccess(false); reset(); } }}>
        <DialogContent className="max-w-md" aria-describedby="success-desc">
          <div className="py-4 space-y-4">

            {/* Wrong password — existing account scenario */}
            {regWrongPassword ? (
              <ExistingAccountModal
                name={registeredName}
                course={registeredCourse}
                courseId={registeredCourseId}
                onClose={() => { setShowSuccess(false); reset(); }}
                onSuccess={(user, courseId) => {
                  setShowSuccess(false); reset();
                  queryClient.setQueryData(["/api/user"], user);
                  queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/my/breedskool-registrations"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/courses/my-enrollments"] });
                  if (courseId) navigate(`/breedskool/${courseId}/learn`);
                  else navigate("/my-training");
                }}
              />
            ) : (
              <>
                {/* New registration success */}
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-xl animate-bounce">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-black text-gray-900">🎉 Welcome, {registeredName.split(" ")[0]}!</h2>
                  <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                    You're officially a <span className="font-bold text-violet-700">BreedSkool student</span>! Your account is live and you're now part of an elite community turning skills into income.{" "}
                    {payLater ? "Browse free online courses below." : `Get ready to start your journey in ${registeredCourse}!`}
                  </p>
                </div>

                {payLater && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-blue-800 text-sm">📚 Free Online Courses Access</p>
                        <p className="text-xs text-blue-700 mt-1">You now have access to our <strong>free online courses</strong>. Note that live training sessions are exclusively for paid students. Upgrade anytime to unlock full live training.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-left">
                  <p className="text-xs text-emerald-800">✅ Your Taskdrip influencer account has been created alongside your BreedSkool enrollment. You can earn from brand campaigns, P2P trading and more — all from your dashboard!</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-left">
                  <p className="font-semibold text-gray-800 text-sm">Connect with your tutors 👇</p>
                  <a href={`https://wa.me/12016800266?text=${encodeURIComponent(`Hi! I just registered for ${registeredCourse} on BreedSkool. My name is ${registeredName}.`)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white rounded-xl px-4 py-3 transition-colors" data-testid="link-welcome-whatsapp">
                    <PhoneCall className="w-5 h-5" />
                    <div>
                      <p className="font-bold text-sm">WhatsApp Your Tutor</p>
                      <p className="text-[11px] text-green-100">+1 (201) 680-0266</p>
                    </div>
                  </a>
                  <a href="https://t.me/taskdrip" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-3 transition-colors" data-testid="link-welcome-telegram">
                    <Send className="w-5 h-5" />
                    <div>
                      <p className="font-bold text-sm">Join the Telegram Community</p>
                      <p className="text-[11px] text-blue-100">t.me/taskdrip</p>
                    </div>
                  </a>
                </div>

                {registeredCourseId && (
                  <Button
                    onClick={() => { setShowSuccess(false); reset(); navigate(`/breedskool/${registeredCourseId}/learn`); }}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl h-12 text-base shadow-lg"
                    data-testid="btn-welcome-go-course"
                  >
                    🎓 Start Learning Now →
                  </Button>
                )}
                <Button
                  variant={registeredCourseId ? "outline" : undefined}
                  onClick={() => { setShowSuccess(false); reset(); navigate("/dashboard?tab=training"); }}
                  className={`w-full font-bold rounded-xl ${registeredCourseId ? "" : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"}`}
                  data-testid="btn-welcome-dashboard"
                >
                  Go to My Dashboard 🚀
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Existing Account Inline Login Modal ────────────────────────────────────────
function ExistingAccountModal({ name, course, courseId, onClose, onSuccess }: {
  name: string; course: string; courseId: string | null;
  onClose: () => void;
  onSuccess: (user: any, courseId: string | null) => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return toast({ title: "Enter your email and password", variant: "destructive" });
    setLoading(true);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const err = await r.json();
        toast({ title: "Login failed", description: err.message || "Wrong email or password.", variant: "destructive" });
      } else {
        const data = await r.json();
        toast({ title: "✅ Logged in!", description: "Taking you to your training…" });
        onSuccess(data.user || data, courseId);
      }
    } catch {
      toast({ title: "Login error", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
        <CheckCircle className="w-10 h-10 text-white" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black text-gray-900">✅ Registration Saved, {name.split(" ")[0]}!</h2>
        <p className="text-gray-600 text-sm mt-2 leading-relaxed">
          Your <strong className="text-violet-700">{course}</strong> enrollment is saved. Log in with your original account password to access your training dashboard.
        </p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-800 font-medium">⚠️ An account already exists for this email. Enter your <strong>original Taskdrip password</strong> below.</p>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-semibold text-gray-700">Email</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your account email" className="mt-1" data-testid="input-existing-email" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-700">Password</Label>
          <PasswordInput value={password} onChange={setPassword} placeholder="Your original password" testId="input-existing-password" />
        </div>
        <Button
          disabled={loading || !email || !password}
          onClick={handleLogin}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl"
          data-testid="btn-welcome-login"
        >
          {loading ? "Logging in…" : "Log In & Access My Training →"}
        </Button>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="font-semibold text-gray-800 text-sm">Need help?</p>
        <a href={`https://wa.me/12016800266?text=${encodeURIComponent(`Hi! I just registered for ${course} on BreedSkool. My name is ${name}. I need help accessing my account.`)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white rounded-xl px-4 py-3 transition-colors text-sm font-bold"
          data-testid="link-welcome-whatsapp-existing">
          <PhoneCall className="w-4 h-4" /> WhatsApp Tutor — +1 (201) 680-0266
        </a>
      </div>
    </div>
  );
}

// ── Course Library helpers ─────────────────────────────────────────────────────
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
          <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1 whitespace-normal break-anywhere group-hover:text-violet-600 transition-colors">{course.title}</h3>
          <p className="text-xs text-gray-500 whitespace-normal break-anywhere mb-3 flex-1">{course.shortDescription || course.description}</p>
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
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1 max-w-2xl leading-tight">{course.title}</h2>
          {course.shortDescription && <p className="text-white/80 text-sm max-w-xl whitespace-normal break-anywhere mb-4">{course.shortDescription}</p>}
          <div className="flex flex-wrap items-center gap-4">
            {course.duration && <span className="text-white/70 text-sm flex items-center gap-1"><Clock className="w-4 h-4" />{course.duration}</span>}
            {course.lessonsCount > 0 && <span className="text-white/70 text-sm flex items-center gap-1"><BookOpen className="w-4 h-4" />{course.lessonsCount} lessons</span>}
            <Button onClick={e => { e.stopPropagation(); navigate(`/breedskool/${course.id}`); }} className={`ml-auto font-bold px-5 rounded-xl shadow-lg ${enrolled ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-white text-gray-900 hover:bg-yellow-50"}`} data-testid={`btn-spotlight-course-${course.id}`}>
              {enrolled ? <><CheckCircle2 className="w-4 h-4 mr-1.5" />Continue</> : <>View Course <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        </div>
      </div>
      {total > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={e => { e.stopPropagation(); goTo((current - 1 + total) % total); }} className="w-10 h-10 rounded-full bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 flex items-center justify-center transition-all" data-testid="btn-breedskool-spotlight-prev"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex gap-2">{courses.map((_, i) => <button key={i} onClick={e => { e.stopPropagation(); goTo(i); }} className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-violet-600" : "w-2 bg-gray-300 hover:bg-gray-400"}`} data-testid={`btn-breedskool-spotlight-dot-${i}`} />)}</div>
          <button onClick={e => { e.stopPropagation(); goTo((current + 1) % total); }} className="w-10 h-10 rounded-full bg-white border border-violet-200 text-violet-700 hover:bg-violet-50 flex items-center justify-center transition-all" data-testid="btn-breedskool-spotlight-next"><ChevronRight className="w-5 h-5" /></button>
        </div>
      )}
    </div>
  );
}

function ShareButtons({ compact = false, title = "BreedSkool — free tech training for Africa", description = "Join BreedSkool to learn practical digital skills, meet other learners, and start building your future." }: { compact?: boolean; title?: string; description?: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "/breedskool";
  const shareTitle = title;
  const shareText = description;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard access can be blocked in embedded previews; the social links still work.
    }
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: shareTitle, text: shareText, url: shareUrl }).catch(() => {});
    } else {
      copyLink();
    }
  };

  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, color: "bg-emerald-500 hover:bg-emerald-600" },
    { label: "X / Twitter", href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, color: "bg-gray-900 hover:bg-gray-800" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: "bg-blue-600 hover:bg-blue-700" },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, color: "bg-sky-700 hover:bg-sky-800" },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, color: "bg-sky-500 hover:bg-sky-600" },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-center"}`}>
      <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-700" data-testid="button-share-breedskool">
        <Share2 className="h-3.5 w-3.5" /> Share
      </button>
      {links.map(link => (
        <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={`rounded-xl px-3 py-2 text-xs font-semibold text-white transition-colors ${link.color}`} data-testid={`link-share-${link.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
          {link.label}
        </a>
      ))}
      <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50" data-testid="button-copy-breedskool-link">
        <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
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
  const { data: bsPaySettings = {} } = useQuery<Record<string, string>>({ queryKey: ["/api/breedskool/payment-settings"] });
  const { data: siteContent = [] } = useQuery<any[]>({ queryKey: ["/api/site-content"] });

  const [regModalMode, setRegModalMode] = useState<"online" | "onsite" | "home_lesson">("online");

  const openRegModal = (mode: "online" | "onsite" | "home_lesson" = "online") => {
    setRegModalMode(mode);
    setShowRegModal(true);
  };

  const enrolledCourseIds = new Set((myEnrollments as any[]).map((e: any) => e.courseId));
  const filtered = courses.filter((c: any) => {
    if (activeCategory !== "all" && c.category !== activeCategory) return false;
    if (levelFilter !== "all" && c.level !== levelFilter) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); return c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q); }
    return true;
  });
  const featured = courses.filter((c: any) => c.isFeatured);
  const totalStudents = courses.reduce((sum: number, c: any) => sum + (c.studentsCount || 0), 0);
  const isPremium = (user as any)?.subscriptionStatus === "active";
  const isAdmin = (user as any)?.userType === "admin" || (user as any)?.role === "admin";
  const canTeach = isAdmin || isPremium;
  const content = (key: string, fallback: string) => {
    const item = (siteContent as any[]).find((entry: any) => entry.contentKey === key);
    return item?.value || item?.defaultValue || fallback;
  };
  const heroImage = content("breedskool.hero.bg_image", BREEDSKOOL_IMAGE);
  const fundraisingTarget = Number(content("breedskool.fundraising.target", String(DONATION_TARGET_GBP))) || DONATION_TARGET_GBP;
  const fundraisingRaised = Math.max(0, Number(content("breedskool.fundraising.raised", "0")) || 0);
  const fundraisingPercent = Math.min(100, Math.round((fundraisingRaised / fundraisingTarget) * 100));
  const telegramUrl = content("breedskool.community.telegram_url", TELEGRAM_URL);
  const shareTitle = content("breedskool.share.title", "BreedSkool — free tech training for Africa");
  const shareDescription = content("breedskool.share.description", "Learn practical digital skills, join a supportive community, and start building your future with BreedSkool.");

  return (
    <div className="min-h-screen bg-gray-50">
      <SeoHead
        title={content("breedskool.seo.title", "BreedSkool — Free Tech Training & Digital Skills for Africa")}
        description={shareDescription}
        ogImage={typeof window !== "undefined"
          ? (heroImage.startsWith("http") ? heroImage : `${window.location.origin}${heroImage.startsWith("/") ? heroImage : `/${heroImage}`}`)
          : heroImage}
        canonicalUrl={typeof window !== "undefined" ? `${window.location.origin}/breedskool` : undefined}
      />
      <AdPopupZone page="breedskool" />
      <NavigationFixed />
      <AdSlot page="breedskool" placementType="banner_top" className="w-full" />

      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden min-h-[620px] flex items-center">
        {/* Professional background: tech training / students with laptops */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${heroImage}')` }}
        />
        {/* Strong dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950/95 via-violet-950/90 to-indigo-950/90" />
        {/* Decorative glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: Text */}
            <div>
              {/* Badge */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="inline-flex items-center gap-1.5 bg-orange-500/20 border border-orange-400/30 backdrop-blur-sm text-orange-200 text-xs font-semibold px-3 py-1.5 rounded-full">
                  🔴 Live Training Ongoing
                </span>
              </div>

              <div className="inline-flex items-center gap-2 mb-4 animate-fade-in">
                <span className="text-2xl">🎓</span>
                <span className="text-violet-300 text-sm font-bold tracking-widest uppercase">{content("breedskool.hero.eyebrow", "BreedSkool Tech Training Academy")}</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-5 leading-tight">
                {content("breedskool.hero.title_line1", "Where Skills")}<br />
                {content("breedskool.hero.title_line2", "Become")} <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">{content("breedskool.hero.title_accent", "Income")}</span>
              </h1>

              <p className="text-white/75 text-base md:text-lg mb-4 leading-relaxed max-w-lg">
                {content("breedskool.hero.subtitle", "Equipping tech enthusiasts with Web3-era digital skills to build profitable online businesses and become valuable global assets.")}
              </p>

              {/* Location & event info */}
              <div className="flex items-start gap-2 mb-7 bg-white/5 border border-white/10 rounded-xl p-3 max-w-sm">
                <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-xs font-bold">Current Live Training Venue</p>
                  <p className="text-white/70 text-xs mt-0.5">TootoOba Estate, Ijede, Ikorodu, Lagos</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Button
                  onClick={() => openRegModal("online")}
                  size="lg"
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-gray-900 font-black px-8 py-6 text-base rounded-2xl shadow-2xl shadow-orange-400/30 hover:-translate-y-0.5 transition-all"
                  data-testid="btn-hero-register"
                >
                   🎓 {content("breedskool.hero.cta", "Join Free & Start Learning")}
                </Button>
                <a href="#courses">
                  <Button variant="outline" size="lg" className="border-white/30 text-white bg-white/10 hover:bg-white/20 font-bold px-6 py-6 text-base rounded-2xl" data-testid="btn-hero-browse">
                    Browse Courses <ChevronRight className="ml-1 w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Right: Stats cards */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: `${courses.length + 4}+`, label: "Training Programs", icon: "📚", color: "from-violet-500/20 to-indigo-500/20 border-violet-400/30" },
                  { value: `${totalStudents.toLocaleString()}+`, label: "Students Enrolled", icon: "🎓", color: "from-orange-500/20 to-amber-500/20 border-orange-400/30" },
                  { value: "100%", label: "Online & In-Person", icon: "🌍", color: "from-emerald-500/20 to-teal-500/20 border-emerald-400/30" },
                  { value: "4", label: "Tech Programs", icon: "💻", color: "from-blue-500/20 to-cyan-500/20 border-blue-400/30" },
                ].map((s) => (
                  <div key={s.label} className={`bg-gradient-to-br ${s.color} border backdrop-blur-sm rounded-2xl p-5 text-center`}>
                    <p className="text-3xl mb-2">{s.icon}</p>
                    <p className="text-3xl font-extrabold text-white">{s.value}</p>
                    <p className="text-white/60 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Testimonial mini card */}
              <div className="mt-4 bg-white/8 border border-white/15 rounded-2xl p-4">
                <div className="flex items-center gap-1 mb-2">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-white/80 text-xs leading-relaxed">"BreedSkool gave me the exact skills I needed to start freelancing. Within 3 months I was earning consistently online."</p>
                <p className="text-violet-300 text-xs font-semibold mt-2">— Adeola, Web Dev Graduate · Lagos</p>
              </div>
            </div>
          </div>

          {/* Mobile stats strip */}
          <div className="flex items-center justify-center gap-3 mt-8 lg:hidden flex-wrap">
            {[
              { value: `${courses.length + 4}+`, label: "Courses", icon: "📚" },
              { value: `${totalStudents.toLocaleString()}+`, label: "Students", icon: "🎓" },
              { value: "100%", label: "Online", icon: "🌍" },
            ].map((s) => (
              <div key={s.label} className="text-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4">
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className="text-xl font-extrabold text-white">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Fund the Future ── */}
      <section className="relative overflow-hidden bg-[#111827] py-14 text-white" id="support">
        <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <Badge className="mb-4 border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-orange-200">
              <span className="mr-1.5 animate-pulse">●</span> {content("breedskool.fundraising.badge", "Help us open more doors")}
            </Badge>
            <h2 className="max-w-2xl text-3xl font-black leading-tight sm:text-4xl">
              {content("breedskool.fundraising.title", "Give more African learners a seat at the table.")}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
              {content("breedskool.fundraising.description", "We are raising funds to provide devices, connectivity, mentors, and practical training to people ready to build a better future. Every contribution helps a learner move from potential to opportunity.")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={`https://wa.me/12016800266?text=${encodeURIComponent("Hello, I would like to support the BreedSkool training project.")}`} target="_blank" rel="noopener noreferrer">
                <Button className="rounded-xl bg-orange-400 font-black text-gray-950 hover:bg-orange-300" data-testid="button-donate-breedskool">Support the project</Button>
              </a>
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-xl border-white/20 bg-white/5 font-bold text-white hover:bg-white/10" data-testid="button-fundraising-telegram">Join the community</Button>
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-sm">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Community goal</p>
                <p className="mt-1 text-3xl font-black text-orange-300">£{fundraisingTarget.toLocaleString()}</p>
              </div>
              <p className="text-sm font-bold text-white">{fundraisingPercent}%</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-300 transition-all duration-1000" style={{ width: `${fundraisingPercent}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>£{fundraisingRaised.toLocaleString()} raised</span>
              <span>£{Math.max(0, fundraisingTarget - fundraisingRaised).toLocaleString()} to go</span>
            </div>
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-300">Our milestones</p>
                <p className="text-[10px] text-gray-500">Every stage creates impact</p>
              </div>
              <div className="space-y-3">
                {FUNDRAISING_MILESTONES.map((milestone, index) => {
                  const milestonePercent = Math.min(100, Math.round((fundraisingRaised / milestone.amount) * 100));
                  const reached = fundraisingRaised >= milestone.amount;
                  return (
                    <div key={milestone.amount} className="relative">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${reached ? "bg-emerald-400 text-gray-950" : "bg-white/10 text-gray-400"}`}>{reached ? "✓" : index + 1}</span>
                        <span className="text-xs font-bold text-white">{milestone.label}</span>
                        <span className="ml-auto text-[10px] font-semibold text-orange-200">£{milestone.amount.toLocaleString()}</span>
                      </div>
                      <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full transition-all duration-700 ${reached ? "bg-emerald-400" : "bg-orange-300"}`} style={{ width: `${milestonePercent}%` }} />
                      </div>
                      <p className="ml-7 mt-1 text-[10px] leading-relaxed text-gray-500">{milestone.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-gray-400">
              Funds go towards accessible training, learner resources, and community support. Donors can share this page to help us reach the goal faster.
            </p>
            <div className="mt-4">
              <ShareButtons compact title={shareTitle} description={shareDescription} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Teaching Modes ── */}
      <section className="py-14 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge className="mb-3 bg-violet-100 text-violet-700 border-0 px-4 py-1.5 text-sm font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1 inline" /> 3 Ways to Learn
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">Choose How You Learn</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">
              Whether you prefer learning online, in a classroom, or from the comfort of your home — BreedSkool meets you where you are.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {/* Online Classes */}
            <div className="relative group bg-gradient-to-br from-indigo-50 to-violet-50 border border-violet-100 rounded-3xl p-7 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <MonitorPlay className="w-7 h-7 text-white" />
              </div>
              <Badge className="bg-violet-100 text-violet-700 border-0 text-xs mb-3">Live + Recorded</Badge>
              <h3 className="text-xl font-black text-gray-900 mb-2">Online Classes</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">Join live Zoom sessions and access recorded lessons anytime. Learn from anywhere in the world with a full interactive curriculum.</p>
              <ul className="space-y-1.5 mb-5">
                {["Live Zoom sessions with tutors", "Recorded lessons on demand", "Group chat & community", "Digital certificate on completion"].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-700"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <Button onClick={() => openRegModal("online")} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-sm">
                Enroll Online <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {/* Onsite Training */}
            <div className="relative group bg-gradient-to-br from-teal-50 to-green-50 border border-teal-100 rounded-3xl p-7 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-600 to-green-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <School className="w-7 h-7 text-white" />
              </div>
              <Badge className="bg-teal-100 text-teal-700 border-0 text-xs mb-3">Lagos Campus</Badge>
              <h3 className="text-xl font-black text-gray-900 mb-2">Onsite Training</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">Attend physical classes at our TootoOba Estate campus in Ikorodu, Lagos. Work hands-on with equipment and fellow students daily.</p>
              <ul className="space-y-1.5 mb-5">
                {["Physical classroom environment", "Hands-on practical sessions", "Direct tutor interaction daily", "Weekday & weekend batches"].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-700"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-2.5 flex items-start gap-2 mb-4">
                <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-teal-700 font-medium">TootoOba Estate, Ijede, Ikorodu, Lagos</p>
              </div>
              <Button onClick={() => openRegModal("onsite")} className="w-full bg-gradient-to-r from-teal-600 to-green-600 text-white font-bold rounded-xl text-sm">
                Book Onsite Spot <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {/* Home Lessons */}
            <div className="relative group bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-3xl p-7 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-4 right-4">
                <Badge className="bg-orange-500 text-white border-0 text-[10px] font-bold px-2 py-0.5 animate-pulse">🔥 NEW</Badge>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-pink-600 to-rose-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                <Home className="w-7 h-7 text-white" />
              </div>
              <Badge className="bg-pink-100 text-pink-700 border-0 text-xs mb-3">For Parents & Kids</Badge>
              <h3 className="text-xl font-black text-gray-900 mb-2">Home Lessons</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">Book a certified BreedSkool tutor to teach your child at home. One-on-one personalised sessions tailored for ages 6–17.</p>
              <ul className="space-y-1.5 mb-5">
                {["Tutor visits your home", "Personalised 1-on-1 sessions", "Kids ages 6–17 welcome", "Coding, AI tools & digital skills", "Flexible scheduling"].map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-700"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <Button onClick={() => openRegModal("home_lesson")} className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold rounded-xl text-sm">
                Book Home Lesson <Home className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Start Here Guide ── */}
      <section className="bg-violet-50 py-14" id="start-here">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <Badge className="mb-3 border-0 bg-violet-100 px-3 py-1 text-violet-700"><Bell className="mr-1.5 h-3.5 w-3.5" /> Your first steps</Badge>
              <h2 className="text-3xl font-black leading-tight text-gray-900 sm:text-4xl">{content("breedskool.guide.title", "Everything you need to start learning today.")}</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
                {content("breedskool.guide.description", "Create your account right here, follow your dashboard prompts, and meet your learning community. No confusing hand-offs and no need to leave this page to get started.")}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={() => openRegModal("online")} className="rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-700" data-testid="button-guide-signup">Create my free account <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100" data-testid="link-guide-telegram">Join Telegram</a>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { step: "01", title: "Sign up here", text: "Complete the short form on this page. Your learning account is created automatically." },
                { step: "02", title: "Open your dashboard", text: "Use the thank-you button or dashboard notification to find your free course and next lesson." },
                { step: "03", title: "Meet your people", text: "Post an introduction in the in-app community, then join Telegram for daily support." },
              ].map(item => (
                <div key={item.step} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1">
                  <span className="text-xs font-black tracking-widest text-violet-500">{item.step}</span>
                  <h3 className="mt-3 text-sm font-black text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech Training Programs ── */}
      {bsPricing.length > 0 && (
        <section className="py-16 bg-gray-50" id="tech-training">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <Badge className="mb-3 bg-violet-100 text-violet-700 border-0 px-4 py-1.5 text-sm font-semibold">
                <Sparkles className="w-3.5 h-3.5 mr-1 inline" /> Intensive Tech Programs
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">BreedSkool Tech Training Programs</h2>
              <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">
                Industry-focused programs designed to take you from zero to profitable in the digital economy. Taught by practitioners, not just theorists.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2 text-sm text-orange-700 font-medium">
                <MapPin className="w-4 h-4" />
                Live training at TootoOba Estate, Ijede, Ikorodu Lagos · Also fully online · Home Lessons available
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={`text-[10px] px-2 py-0.5 ${COURSE_BADGE_COLOR[course.courseKey] || "bg-gray-100 text-gray-600"} border-0`}>{course.duration}</Badge>
                        <Badge className="bg-red-100 text-red-600 text-[10px] border-0">-{savingsPct}% OFF</Badge>
                      </div>
                      <h3 className="font-black text-gray-900 text-sm mb-1 leading-snug">{course.title}</h3>
                      <p className="text-xs text-gray-500 whitespace-normal break-anywhere mb-4">{course.shortDescription}</p>
                      <div className="border-t border-gray-100 pt-3">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs text-gray-400 line-through">{fmtNgn(course.regularPrice)}</span>
                          <span className="text-xs text-green-600 font-semibold">Save {fmtNgn(savings)}</span>
                        </div>
                        <p className="text-xl font-black text-gray-900">{fmtNgn(course.discountPrice)}</p>
                        <p className="text-xs text-gray-400">≈ {fmtUsd(toUsd(course.discountPrice))} for international students</p>
                      </div>
                      <Button onClick={() => openRegModal(course.courseKey === "onsite_training" ? "onsite" : course.courseKey === "home_lesson" ? "home_lesson" : "online")} className={`w-full mt-4 bg-gradient-to-r ${gradient} hover:opacity-90 text-white font-bold rounded-xl text-sm`} data-testid={`btn-enroll-${course.courseKey}`}>
                        Enroll Now <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment methods info */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">Flexible Payment Options</h3>
                  <p className="text-sm text-gray-600">Pay via bank transfer or cryptocurrency. International students can pay the equivalent in USD.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(ALL_PAYMENT_METHODS).map(([k, v]) => (
                    <span key={k} className="bg-white rounded-xl px-3 py-2 border border-gray-200 text-gray-600 text-xs font-medium shadow-sm">{v.icon} {v.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Why BreedSkool ── */}
      <section className="py-14 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-2">Why Choose BreedSkool?</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">We don't just teach — we equip you with income-generating digital skills for the real world.</p>
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
            <Button onClick={() => openRegModal("online")} size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl px-8 shadow-xl" data-testid="btn-why-register">
              Register for a Course <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Learner Voices ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Badge className="mb-3 border-0 bg-orange-100 px-3 py-1 text-orange-700">Learner voices</Badge>
              <h2 className="text-3xl font-black text-gray-900 sm:text-4xl">{content("breedskool.reviews.title", "A community that keeps you moving.")}</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">{content("breedskool.reviews.subtitle", "Learning is easier when you can see yourself in the room. Meet learners building skills across Africa.")}</p>
            </div>
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-violet-600 hover:underline">Meet more learners on Telegram →</a>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {LEARNER_STORIES.map(story => (
              <article key={story.name} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-4 flex items-center gap-3">
                  <img src={story.image} alt={`${story.name}, ${story.role}`} className="h-12 w-12 rounded-full object-cover ring-2 ring-white" />
                  <div>
                    <p className="text-sm font-black text-gray-900">{story.name}</p>
                    <p className="text-[11px] text-gray-500">{story.location}</p>
                  </div>
                </div>
                <div className="mb-3 flex gap-0.5">{[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />)}</div>
                <p className="text-sm leading-relaxed text-gray-600">“{story.quote}”</p>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-violet-600">{story.role}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-center text-[11px] text-gray-400">Learner voices are community spotlights. Admins can replace or update this section with verified reviews and approved photos.</p>
        </div>
      </section>

      {/* ── Share the opportunity ── */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <Share2 className="mx-auto mb-3 h-7 w-7 text-violet-600" />
          <h2 className="text-2xl font-black text-gray-900 sm:text-3xl">{content("breedskool.share.title", "Know someone who would benefit? Share this page.")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">{content("breedskool.share.description", shareDescription)}</p>
          <div className="mt-5"><ShareButtons title={shareTitle} description={shareDescription} /></div>
        </div>
      </section>

      {/* ── Course Library ── */}
      <div className="max-w-7xl mx-auto px-4 py-10" id="courses">
        {isAuthenticated && canTeach && (
          <div className="mb-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white shadow-lg">
            <div className="min-w-0">
              <h3 className="text-lg font-bold">🎤 Teach on BreedSkool</h3>
              <p className="text-white/80 text-sm mt-1">Share your expertise and earn revenue from your courses</p>
            </div>
            <Button className="w-full sm:w-auto shrink-0 bg-white text-violet-700 hover:bg-gray-100 font-semibold" onClick={() => setLocation("/admin/courses")}>Create a Course</Button>
          </div>
        )}

        {!isAuthenticated && (
          <div className="mb-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-lg">
            <div>
              <h3 className="text-lg font-bold">🎓 BreedSkool Tech Training</h3>
              <p className="text-white/80 text-sm mt-1">Register and create your account — start learning today with BreedSkool.</p>
            </div>
            <Button className="bg-white text-violet-700 hover:bg-gray-100 font-semibold whitespace-nowrap" onClick={() => openRegModal("online")} data-testid="btn-enroll-banner">Enroll Now</Button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2 mb-6">
          <div className="flex min-w-0 gap-2 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button key={cat.value} onClick={() => setActiveCategory(cat.value)}
                  className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 ${activeCategory === cat.value ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>
                  <Icon className="h-4 w-4" /> {cat.label}
                </button>
              );
            })}
          </div>
          <div className="flex shrink-0 gap-2 overflow-x-auto scrollbar-hide sm:ml-auto">
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

        {/* Course Grid */}
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

        {/* Upgrade to teach */}
        {!canTeach && isAuthenticated && (
          <section className="mt-16 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-10 text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Want to Teach on BreedSkool?</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-4">Upgrade to a Premium plan to start creating and selling your own courses.</p>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={() => setLocation("/subscription")}>Upgrade to Premium <ChevronRight className="h-4 w-4" /></Button>
          </section>
        )}
      </div>

      {/* ── CTA Section ── */}
      <section className="py-14 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-white mb-3">Ready to Become a Global Digital Asset? 🌍</h2>
          <p className="text-violet-200 mb-2 text-sm sm:text-base">Join hundreds of students learning and earning with BreedSkool. No prior experience required.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-white/80 text-xs"><MonitorPlay className="w-3.5 h-3.5 text-violet-300" /> Online Classes</span>
            <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-white/80 text-xs"><School className="w-3.5 h-3.5 text-teal-300" /> Onsite Training · Ikorodu Lagos</span>
            <span className="flex items-center gap-1.5 bg-white/10 border border-orange-400/40 rounded-full px-3 py-1.5 text-white/80 text-xs bg-orange-500/20"><Home className="w-3.5 h-3.5 text-pink-300" /> 🔥 Home Lessons for Kids</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => openRegModal("online")} size="lg" className="bg-white text-violet-700 hover:bg-gray-100 font-black px-8 rounded-xl shadow-xl" data-testid="btn-cta-register">
              🎓 Register & Create Account
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

      <RegistrationModal open={showRegModal} onClose={() => setShowRegModal(false)} courses={bsPricing} initialDeliveryMode={regModalMode} />
    </div>
  );
}
