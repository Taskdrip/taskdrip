import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Save, ShieldCheck, AlertTriangle, Code2 } from "lucide-react";

type AnalyticsCodes = { headCode: string; bodyCode: string; enabled: boolean };

export default function AnalyticsCodeInjector() {
  const { toast } = useToast();

  const q = useQuery<AnalyticsCodes>({ queryKey: ["/api/admin/analytics-codes"] });

  const [headCode, setHeadCode] = useState("");
  const [bodyCode, setBodyCode] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (q.data) {
      setHeadCode(q.data.headCode || "");
      setBodyCode(q.data.bodyCode || "");
      setEnabled(q.data.enabled !== false);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/analytics-codes", { headCode, bodyCode, enabled });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Saved",
        description: `Tracking codes updated. Hard-refresh any open tab to see them in <head>/<body>.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics-codes"] });
    },
    onError: (e: any) =>
      toast({
        title: "Failed to save",
        description: e?.message || "Error",
        variant: "destructive",
      }),
  });

  const FORBIDDEN = /<\s*\/?(html|head|body)\b[^>]*>/i;
  const headInvalid = headCode.length > 0 && FORBIDDEN.test(headCode);
  const bodyInvalid = bodyCode.length > 0 && FORBIDDEN.test(bodyCode);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 p-6 border border-indigo-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Google Analytics &amp; Tag Manager</h2>
            <p className="text-indigo-100 text-sm">
              Paste GA4, GTM, or any tracking snippets. They will be injected on every page —
              both inside <code className="text-white/90">&lt;head&gt;</code> and right after
              <code className="text-white/90"> &lt;body&gt;</code>.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 bg-white/10 rounded-xl p-3">
          <Switch
            id="ga-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
            data-testid="switch-analytics-enabled"
          />
          <Label htmlFor="ga-enabled" className="text-white font-semibold cursor-pointer">
            {enabled ? "Tracking enabled — codes are injected" : "Tracking disabled — codes are NOT injected"}
          </Label>
        </div>
      </div>

      <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
        <CardContent className="p-4 text-sm flex gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-900 dark:text-amber-200">Safety guard</div>
            <p className="text-amber-800 dark:text-amber-300">
              Code containing <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>, or
              <code> &lt;body&gt;</code> tags is blocked — pasting raw page templates would break
              the app. Only paste the snippet contents (the <code>&lt;script&gt;</code>/
              <code>&lt;noscript&gt;</code> blocks). Bad snippets never crash the app — they are
              skipped silently if injection fails.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-600" /> &lt;head&gt; tracking code
          </CardTitle>
          <CardDescription>
            Paste your Google Analytics 4 / Tag Manager / Search Console verification scripts
            here. Example: the standard
            <code> &lt;script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"&gt;&lt;/script&gt;</code>{" "}
            block.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={headCode}
            onChange={(e) => setHeadCode(e.target.value)}
            placeholder={`<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-XXXXXXXXXX');\n</script>\n\n<!-- Google Tag Manager verification -->\n<meta name="google-site-verification" content="..." />`}
            rows={12}
            className="font-mono text-xs"
            data-testid="textarea-ga-head-code"
          />
          {headInvalid && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              Code contains a forbidden tag (&lt;html&gt;, &lt;head&gt;, or &lt;body&gt;) — it will
              be rejected.
            </div>
          )}
          <div className="text-xs text-muted-foreground">{headCode.length.toLocaleString()} / 50,000 characters</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-violet-600" /> &lt;body&gt; tracking code
          </CardTitle>
          <CardDescription>
            Injected immediately after the opening <code>&lt;body&gt;</code> tag — required by
            Google Tag Manager (the <code>&lt;noscript&gt;</code> &lt;iframe&gt; fallback).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={bodyCode}
            onChange={(e) => setBodyCode(e.target.value)}
            placeholder={`<!-- Google Tag Manager (noscript) -->\n<noscript>\n  <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"\n  height="0" width="0" style="display:none;visibility:hidden"></iframe>\n</noscript>`}
            rows={8}
            className="font-mono text-xs"
            data-testid="textarea-ga-body-code"
          />
          {bodyInvalid && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              Code contains a forbidden tag (&lt;html&gt;, &lt;head&gt;, or &lt;body&gt;) — it will
              be rejected.
            </div>
          )}
          <div className="text-xs text-muted-foreground">{bodyCode.length.toLocaleString()} / 50,000 characters</div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 items-center">
        <Button
          size="lg"
          onClick={() => save.mutate()}
          disabled={save.isPending || headInvalid || bodyInvalid}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          data-testid="button-save-analytics-codes"
        >
          <Save className="w-5 h-5 mr-2" />
          {save.isPending ? "Saving…" : "Save tracking codes"}
        </Button>
        <span className="text-sm text-muted-foreground">
          Changes go live within 30 seconds. Hard-refresh (<kbd>Ctrl/Cmd+Shift+R</kbd>) to verify.
        </span>
      </div>

      <Card className="bg-slate-50 dark:bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base">What this tracks (once GA4/GTM is configured)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm grid sm:grid-cols-2 gap-2">
          <div>• Page views (every route in the SPA)</div>
          <div>• User location (country / city)</div>
          <div>• Bounce rate &amp; engagement</div>
          <div>• Time on page</div>
          <div>• Click events (configurable in GTM)</div>
          <div>• Device type, OS, browser</div>
          <div>• Search Console &amp; site verification</div>
          <div>• Custom events (if added in GTM)</div>
        </CardContent>
      </Card>
    </div>
  );
}
