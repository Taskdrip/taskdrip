import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone, Zap, Shield, Globe, Bell, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import taskedripLogo from "@assets/taskdrip_icon_logo_1775964032389.jpeg";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">("default");

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/pwa-settings"],
  });

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (alreadyDismissed) {
      setDismissed(true);
      return;
    }

    if (!("Notification" in window)) {
      setPermissionStatus("unsupported");
    } else {
      setPermissionStatus(Notification.permission);
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (dismissed || isInstalled) return;
    if (settings && !settings.promptEnabled) return;
    if (!deferredPrompt && (!("Notification" in window) || Notification.permission !== "default")) return;

    let shown = false;
    const delay = (settings?.promptDelay ?? 30) * 1000;
    const scrollPercent = settings?.promptScrollPercent ?? 25;
    const reveal = () => {
      if (shown) return;
      shown = true;
      setShowPrompt(true);
    };
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const percent = (window.scrollY / scrollable) * 100;
      if (percent >= scrollPercent) reveal();
    };
    const timer = setTimeout(reveal, delay);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [deferredPrompt, dismissed, isInstalled, settings]);

  useEffect(() => {
    if (!user || !("serviceWorker" in navigator) || !("Notification" in window) || Notification.permission !== "granted") return;
    subscribeToPush();
  }, [user]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  };

  const subscribeToPush = async () => {
    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const registration = await navigator.serviceWorker.register("/sw.js");
    const keyRes = await fetch("/api/push/vapid-public-key", { credentials: "include" });
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();
    const existing = await registration.pushManager.getSubscription();
    if (existing && localStorage.getItem("taskdrip-vapid-public-key") === publicKey) {
      await apiRequest("POST", "/api/push/subscribe", existing.toJSON());
      return true;
    }
    if (existing) {
      await existing.unsubscribe();
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await apiRequest("POST", "/api/push/subscribe", subscription.toJSON());
    localStorage.setItem("taskdrip-vapid-public-key", publicKey);
    return true;
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === "granted") {
        await subscribeToPush();
      }
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!showPrompt || isInstalled || dismissed) return null;

  const title = settings?.promptTitle || "Never Miss a Crypto Drop";
  const message =
    settings?.promptMessage ||
    "Turn on Taskdrip alerts and be first in line when high-paying Web3 campaigns go live. New tasks move fast — claim your spot before the rewards are gone.";
  const promptImageUrl = settings?.promptImageUrl;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-2rem)] max-w-md"
      data-testid="pwa-install-prompt"
    >
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl"
        style={{
          background: promptImageUrl
            ? `linear-gradient(135deg, rgba(10,10,26,.92), rgba(26,10,46,.84)), url(${promptImageUrl}) center/cover`
            : "linear-gradient(135deg, #0a0a1a 0%, #0f0f2e 40%, #1a0a2e 100%)",
          border: "1px solid rgba(124,58,237,0.4)",
          boxShadow:
            "0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Animated glow top */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(124,58,237,0.8), rgba(234,179,8,0.6), transparent)",
          }}
        />

        {/* Background sparkle orbs */}
        <div
          className="absolute top-4 right-8 w-20 h-20 rounded-full opacity-10 blur-xl"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }}
        />
        <div
          className="absolute bottom-4 left-8 w-16 h-16 rounded-full opacity-10 blur-xl"
          style={{ background: "radial-gradient(circle, #eab308, transparent)" }}
        />

        <div className="relative p-5">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            data-testid="pwa-dismiss-button"
            className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-shrink-0">
              <img
                src={taskedripLogo}
                alt="Taskdrip"
                className="w-14 h-14 rounded-2xl object-cover"
                style={{
                  boxShadow:
                    "0 4px 20px rgba(124,58,237,0.5), 0 0 0 2px rgba(234,179,8,0.3)",
                }}
              />
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                <Bell className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold text-base leading-tight">{title}</h3>
              <p className="text-yellow-400 text-xs font-medium mt-0.5">
                Instant Web3 campaign alerts
              </p>
            </div>
          </div>

          {/* Message */}
          <p className="text-gray-300 text-sm leading-relaxed mb-4">{message}</p>

          {/* Feature pills */}
          <div className="flex gap-2 flex-wrap mb-4">
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-purple-300 bg-purple-500/10 border border-purple-500/20">
              <Zap className="w-3 h-3" /> Fast Access
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-green-300 bg-green-500/10 border border-green-500/20">
              <Bell className="w-3 h-3" /> Push Alerts
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-blue-300 bg-blue-500/10 border border-blue-500/20">
              <Sparkles className="w-3 h-3" /> Reward Drops
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              data-testid="pwa-install-button"
              className="flex-1 font-semibold text-sm h-10 rounded-xl"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #1d4ed8 100%)",
                boxShadow: "0 4px 15px rgba(124,58,237,0.4)",
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Turn On Alerts
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              data-testid="pwa-maybe-later-button"
              className="text-gray-400 hover:text-white text-sm h-10 px-3 rounded-xl hover:bg-white/10"
            >
              Later
            </Button>
          </div>

          {/* Bottom trust line */}
          <p className="text-center text-gray-500 text-xs mt-3">
            Free alerts · Campaign launches · Reward deadlines
          </p>
        </div>

        {/* Bottom glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(234,179,8,0.4), rgba(124,58,237,0.6), transparent)",
          }}
        />
      </div>
    </div>
  );
}
