import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import {
  Code2, DollarSign, Calendar, MessageCircle, CheckCircle,
  User, Mail, Lock, Briefcase, Zap, Shield, Clock,
  ArrowRight, Star,
} from "lucide-react";

const PROJECT_TYPES = [
  { value: "web_app", label: "Web Application" },
  { value: "ecommerce", label: "E-commerce Store" },
  { value: "landing_page", label: "Landing Page / Website" },
  { value: "dashboard", label: "Dashboard / Admin Panel" },
  { value: "mobile_app", label: "Mobile App (React Native)" },
  { value: "api_backend", label: "API / Backend System" },
  { value: "automation", label: "Automation / Bot" },
  { value: "ai_integration", label: "AI / ChatGPT Integration" },
  { value: "marketplace", label: "Marketplace Platform" },
  { value: "other", label: "Other / Custom" },
];

const BUDGETS = [
  { value: "under_500", label: "Under $500" },
  { value: "500_2000", label: "$500 – $2,000" },
  { value: "2000_5000", label: "$2,000 – $5,000" },
  { value: "5000_10000", label: "$5,000 – $10,000" },
  { value: "over_10000", label: "$10,000+" },
  { value: "discuss", label: "Let's discuss" },
];

const TIMELINES = [
  { value: "asap", label: "ASAP / Urgent" },
  { value: "1_2_weeks", label: "1 – 2 weeks" },
  { value: "1_month", label: "About 1 month" },
  { value: "2_3_months", label: "2 – 3 months" },
  { value: "flexible", label: "Flexible" },
];

export default function HireDeveloper() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Project details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [features, setFeatures] = useState("");

  // Account creation (if not logged in)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description,
        projectType,
        budget,
        timeline,
        features,
        // account creation fields (only used when not logged in)
        firstName: user ? undefined : firstName,
        lastName: user ? undefined : lastName,
        email: user ? undefined : email,
        password: user ? undefined : password,
      };
      const res = await apiRequest("POST", "/api/hire-developer", payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Submission failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSubmitted(true);
      setTimeout(() => {
        // Redirect to messages with admin
        setLocation(data?.adminId ? `/messages?to=${data.adminId}` : "/messages");
      }, 2500);
    },
    onError: (e: any) => {
      toast({ title: "Could not submit request", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast({ title: "Please enter a project title", variant: "destructive" });
    if (!description.trim()) return toast({ title: "Please describe your project", variant: "destructive" });
    if (!projectType) return toast({ title: "Please select a project type", variant: "destructive" });
    if (!budget) return toast({ title: "Please select a budget range", variant: "destructive" });
    if (!user) {
      if (!firstName.trim() || !lastName.trim()) return toast({ title: "Please enter your name", variant: "destructive" });
      if (!email.trim()) return toast({ title: "Please enter your email", variant: "destructive" });
      if (password.length < 6) return toast({ title: "Password must be at least 6 characters", variant: "destructive" });
    }
    submitMutation.mutate();
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3">Request Sent! 🎉</h2>
          <p className="text-gray-400 mb-2">Your project details have been sent to our developer.</p>
          <p className="text-gray-500 text-sm">Redirecting you to your conversation now…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavigationFixed />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-gray-950 to-gray-950" />
        <div className="relative max-w-6xl mx-auto px-4 pt-28 pb-16 text-center">
          <Badge className="bg-violet-500/20 text-violet-300 border border-violet-500/30 mb-6 text-xs px-3 py-1">
            <Code2 className="h-3 w-3 mr-1.5" /> Full-Stack Developer for Hire
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight">
            Build Your Project<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
              With Expert Help
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
            Tell us what you need — we'll build it. Web apps, dashboards, AI integrations, e-commerce, and more. Chat directly with the developer after submitting.
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {[
              { icon: <Shield className="h-4 w-4 text-emerald-400" />, text: "Secure & Private" },
              { icon: <Clock className="h-4 w-4 text-blue-400" />, text: "Fast Response" },
              { icon: <Star className="h-4 w-4 text-amber-400" />, text: "Quality Code" },
              { icon: <MessageCircle className="h-4 w-4 text-violet-400" />, text: "Direct Chat" },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
                {b.icon}
                <span className="text-gray-300">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 pb-24">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Project Details Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-violet-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Project Details</h2>
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Project Title *</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. E-commerce store with payment integration"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500"
              />
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Project Type *</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {PROJECT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-gray-200 focus:bg-gray-700">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Describe Your Project *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Tell us what you want to build. The more detail you share, the better we can estimate and plan. Include any existing tools, integrations, or examples you like."
                rows={5}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 resize-none"
              />
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-1.5 block">Key Features / Requirements</Label>
              <Textarea
                value={features}
                onChange={e => setFeatures(e.target.value)}
                placeholder="List the main features you need (one per line)&#10;e.g.&#10;- User login / registration&#10;- Payment gateway (Stripe)&#10;- Admin dashboard&#10;- Mobile-responsive design"
                rows={4}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 resize-none font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm mb-1.5 block">
                  <DollarSign className="h-3.5 w-3.5 inline mr-1 text-emerald-400" /> Budget Range *
                </Label>
                <Select value={budget} onValueChange={setBudget}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {BUDGETS.map(b => (
                      <SelectItem key={b.value} value={b.value} className="text-gray-200 focus:bg-gray-700">{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 text-sm mb-1.5 block">
                  <Calendar className="h-3.5 w-3.5 inline mr-1 text-blue-400" /> Timeline
                </Label>
                <Select value={timeline} onValueChange={setTimeline}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {TIMELINES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-gray-200 focus:bg-gray-700">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Account creation (only when not logged in) */}
          {!authLoading && !user && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Create Your Account</h2>
                  <p className="text-xs text-gray-500">So you can chat with the developer about your project</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm mb-1.5 block">First Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="John"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pl-10 focus:border-violet-500"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm mb-1.5 block">Last Name *</Label>
                  <Input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300 text-sm mb-1.5 block">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pl-10 focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300 text-sm mb-1.5 block">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pl-10 focus:border-violet-500"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1.5">We'll create your account and log you in automatically.</p>
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-300 mb-4">What happens after you submit?</h3>
            <div className="space-y-3">
              {[
                { icon: <Zap className="h-4 w-4 text-violet-400" />, title: "Instant submission", desc: "Your project details are sent directly to our developer" },
                { icon: <MessageCircle className="h-4 w-4 text-blue-400" />, title: "Open chat", desc: "You'll be taken to a live chat with the developer to discuss your project" },
                { icon: <DollarSign className="h-4 w-4 text-emerald-400" />, title: "Get a quote", desc: "Receive a detailed quote and timeline within 24 hours" },
                { icon: <Code2 className="h-4 w-4 text-amber-400" />, title: "Build it", desc: "Once agreed, development starts immediately" },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">{s.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full h-14 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-base rounded-xl shadow-lg shadow-violet-900/30 gap-2"
          >
            {submitMutation.isPending ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Submitting…</>
            ) : (
              <>{user ? "Submit Project Request" : "Create Account & Submit"} <ArrowRight className="h-5 w-5" /></>
            )}
          </Button>

          <p className="text-center text-xs text-gray-600">
            By submitting you agree to our{" "}
            <a href="/terms" className="text-gray-500 hover:text-gray-300 underline">Terms of Service</a>.
            {" "}Your information is kept private.
          </p>
        </form>
      </div>

      <Footer />
    </div>
  );
}
