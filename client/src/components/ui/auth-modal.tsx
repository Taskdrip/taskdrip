/**
 * AuthModal — reusable inline sign-in / sign-up dialog.
 *
 * Drop this anywhere a user might hit a protected action without navigating away.
 * On success the `onSuccess` callback is fired so the parent can continue the flow.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, UserPlus, Lock } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful login or registration */
  onSuccess?: () => void;
  /** Shown at the top to give context (e.g. "Sign in to enroll in this course") */
  title?: string;
  subtitle?: string;
  defaultTab?: "login" | "register";
}

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
  title = "Sign in to continue",
  subtitle = "Access your Taskdrip account to proceed.",
  defaultTab = "login",
}: AuthModalProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register state
  const [regFirst, setRegFirst] = useState("");
  const [regLast, setRegLast] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData(["/api/user"], data.user);
      toast({ title: "Welcome back!", description: `Logged in as ${data.user.firstName}.` });
      // Delay invalidation to avoid a brief flash where user state is cleared
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/user"] }), 800);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({ title: "Login failed", description: err.message || "Invalid credentials.", variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.setQueryData(["/api/user"], data.user);
      toast({ title: `Welcome, ${data.user.firstName}! 🎉`, description: "Account created successfully." });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/user"] }), 800);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({ title: "Registration failed", description: err.message || "Could not create account.", variant: "destructive" });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast({ title: "Please enter your email and password", variant: "destructive" });
      return;
    }
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirst || !regLast || !regEmail || !regPassword) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (regPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    registerMutation.mutate({
      firstName: regFirst,
      lastName: regLast,
      email: regEmail,
      password: regPassword,
      userType: "creator",
      bio: "Taskdrip user",
      skills: ["Content Creation"],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-violet-100">
              <Lock className="h-4 w-4 text-violet-600" />
            </div>
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          </div>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="login" className="gap-1.5">
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </TabsTrigger>
            <TabsTrigger value="register" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Create Account
            </TabsTrigger>
          </TabsList>

          {/* ── Login tab ── */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Email</Label>
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showLoginPw ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-11 gap-2"
              >
                {loginMutation.isPending ? (
                  <span className="animate-pulse">Signing in…</span>
                ) : (
                  <><LogIn className="h-4 w-4" /> Sign In & Continue</>
                )}
              </Button>
              <p className="text-xs text-center text-gray-400">
                No account?{" "}
                <button
                  type="button"
                  onClick={() => setTab("register")}
                  className="text-violet-600 hover:underline font-medium"
                >
                  Create one free
                </button>
              </p>
            </form>
          </TabsContent>

          {/* ── Register tab ── */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold">First Name</Label>
                  <Input
                    value={regFirst}
                    onChange={(e) => setRegFirst(e.target.value)}
                    placeholder="Jane"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Last Name</Label>
                  <Input
                    value={regLast}
                    onChange={(e) => setRegLast(e.target.value)}
                    placeholder="Smith"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold">Email</Label>
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showRegPw ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold h-11 gap-2"
              >
                {registerMutation.isPending ? (
                  <span className="animate-pulse">Creating account…</span>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Create Account & Continue</>
                )}
              </Button>
              <p className="text-xs text-center text-gray-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className="text-violet-600 hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
