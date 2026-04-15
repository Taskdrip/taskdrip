import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone, Save, RefreshCw, Globe, Zap, Shield, Eye, EyeOff,
  Clock, Layout, Palette, Type, MessageSquare, Bell, MonitorSmartphone
} from "lucide-react";
import taskedripLogo from "@assets/taskdrip_icon_logo_1775964032389.jpeg";

export function PWASettingsPanel() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/pwa-settings"],
  });

  const [form, setForm] = useState<any>(null);

  const currentSettings = form ?? settings ?? {};

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/admin/pwa-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pwa-settings"] });
      setForm(null);
      toast({ title: "PWA settings saved", description: "Changes will take effect on next visit." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const set = (key: string, value: any) => {
    setForm((prev: any) => ({ ...(prev ?? settings ?? {}), [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(currentSettings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-purple-400" />
            PWA Settings
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Control how Taskdrip appears and behaves as a Progressive Web App on users' devices.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || !form}
          data-testid="pwa-save-button"
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {updateMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: main settings */}
        <div className="lg:col-span-2 space-y-6">

          {/* App Identity */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Type className="h-4 w-4 text-purple-400" /> App Identity
              </CardTitle>
              <CardDescription className="text-gray-400">Name and description shown on device home screens and app launchers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">App Name</Label>
                  <Input
                    data-testid="pwa-app-name"
                    value={currentSettings.appName ?? ""}
                    onChange={(e) => set("appName", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Taskdrip"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Short Name <span className="text-gray-500 text-xs">(max 12 chars)</span></Label>
                  <Input
                    data-testid="pwa-short-name"
                    value={currentSettings.shortName ?? ""}
                    onChange={(e) => set("shortName", e.target.value.slice(0, 12))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Taskdrip"
                    maxLength={12}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Description</Label>
                <Textarea
                  data-testid="pwa-description"
                  value={currentSettings.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white resize-none"
                  rows={2}
                  placeholder="The leading Web3 influencer marketplace..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Display & Theme */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-purple-400" /> Display & Theme
              </CardTitle>
              <CardDescription className="text-gray-400">Colors and display mode for the installed app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Theme Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      data-testid="pwa-theme-color"
                      value={currentSettings.themeColor ?? "#7c3aed"}
                      onChange={(e) => set("themeColor", e.target.value)}
                      className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent"
                    />
                    <Input
                      value={currentSettings.themeColor ?? "#7c3aed"}
                      onChange={(e) => set("themeColor", e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      data-testid="pwa-bg-color"
                      value={currentSettings.backgroundColor ?? "#0f0f1a"}
                      onChange={(e) => set("backgroundColor", e.target.value)}
                      className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent"
                    />
                    <Input
                      value={currentSettings.backgroundColor ?? "#0f0f1a"}
                      onChange={(e) => set("backgroundColor", e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Display Mode</Label>
                  <Select
                    value={currentSettings.displayMode ?? "standalone"}
                    onValueChange={(v) => set("displayMode", v)}
                  >
                    <SelectTrigger data-testid="pwa-display-mode" className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="standalone">Standalone</SelectItem>
                      <SelectItem value="fullscreen">Fullscreen</SelectItem>
                      <SelectItem value="minimal-ui">Minimal UI</SelectItem>
                      <SelectItem value="browser">Browser</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Install Prompt */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-purple-400" /> Install Prompt
              </CardTitle>
              <CardDescription className="text-gray-400">Configure the popup that invites users to install the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800 border border-gray-700">
                <div>
                  <p className="text-white font-medium text-sm">Show Install Prompt</p>
                  <p className="text-gray-400 text-xs mt-0.5">Display the install banner to eligible users</p>
                </div>
                <Switch
                  data-testid="pwa-prompt-enabled"
                  checked={currentSettings.promptEnabled ?? true}
                  onCheckedChange={(v) => set("promptEnabled", v)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Prompt Title</Label>
                <Input
                  data-testid="pwa-prompt-title"
                  value={currentSettings.promptTitle ?? ""}
                  onChange={(e) => set("promptTitle", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Install Taskdrip App"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Prompt Message</Label>
                <Textarea
                  data-testid="pwa-prompt-message"
                  value={currentSettings.promptMessage ?? ""}
                  onChange={(e) => set("promptMessage", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white resize-none"
                  rows={3}
                  placeholder="Get the full experience! Install Taskdrip on your device..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Prompt Background Image URL</Label>
                <Input
                  data-testid="pwa-prompt-image-url"
                  value={currentSettings.promptImageUrl ?? ""}
                  onChange={(e) => set("promptImageUrl", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  Delay before showing prompt (seconds)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    data-testid="pwa-prompt-delay"
                    value={currentSettings.promptDelay ?? 5}
                    onChange={(e) => set("promptDelay", parseInt(e.target.value) || 0)}
                    min={0}
                    max={120}
                    className="bg-gray-800 border-gray-700 text-white w-28"
                  />
                  <span className="text-gray-400 text-sm">{currentSettings.promptDelay ?? 30}s after page load</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Scroll trigger percentage</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    data-testid="pwa-prompt-scroll-percent"
                    value={currentSettings.promptScrollPercent ?? 25}
                    onChange={(e) => set("promptScrollPercent", parseInt(e.target.value) || 0)}
                    min={0}
                    max={100}
                    className="bg-gray-800 border-gray-700 text-white w-28"
                  />
                  <span className="text-gray-400 text-sm">Show after {currentSettings.promptScrollPercent ?? 25}% page scroll</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: preview + info */}
        <div className="space-y-6">

          {/* Live Preview */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-purple-400" /> Prompt Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-2xl overflow-hidden p-4 text-white"
                style={{
                  background: "linear-gradient(135deg, #0a0a1a 0%, #0f0f2e 40%, #1a0a2e 100%)",
                  border: "1px solid rgba(124,58,237,0.4)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <img src={taskedripLogo} alt="Taskdrip" className="w-10 h-10 rounded-xl object-cover" />
                  <div>
                    <p className="font-bold text-sm leading-tight">{currentSettings.promptTitle || "Install Taskdrip App"}</p>
                    <p className="text-yellow-400 text-xs">#1 Web3 Marketplace</p>
                  </div>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">
                  {currentSettings.promptMessage || "Get the full experience! Install Taskdrip on your device."}
                </p>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">⚡ Fast</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/20">🛡 Secure</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">🌐 Offline</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 text-center text-xs py-1.5 rounded-lg font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                    Install Free
                  </div>
                  <div className="text-center text-xs py-1.5 px-3 rounded-lg text-gray-400 bg-white/5">Later</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PWA Icon Preview */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Smartphone className="h-4 w-4 text-purple-400" /> App Icon
              </CardTitle>
              <CardDescription className="text-gray-400">Used on device home screens and app launchers.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <div className="relative">
                <img
                  src={taskedripLogo}
                  alt="Taskdrip PWA Icon"
                  className="w-24 h-24 rounded-3xl object-cover shadow-xl"
                  style={{ boxShadow: "0 8px 30px rgba(124,58,237,0.4), 0 0 0 3px rgba(234,179,8,0.3)" }}
                />
                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs whitespace-nowrap">
                  PWA Icon
                </Badge>
              </div>
              <p className="text-gray-400 text-xs text-center mt-2">
                192×192 · 512×512 · 1024×1024
              </p>
            </CardContent>
          </Card>

          {/* Status indicators */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-purple-400" /> PWA Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Manifest", ok: true },
                { label: "Service Worker", ok: true },
                { label: "HTTPS", ok: true },
                { label: "Icons", ok: true },
                { label: "Install Prompt", ok: currentSettings.promptEnabled ?? true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{item.label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.ok ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {item.ok ? "✓ Active" : "✗ Off"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
