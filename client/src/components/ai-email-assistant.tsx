import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, RefreshCw, ChevronDown, ChevronUp, Check,
  Wand2, AlignLeft, Lightbulb, Eye, ArrowRight,
} from "lucide-react";

interface AiEmailAssistantProps {
  /** Which modal context this lives in */
  mode: "template" | "campaign" | "auto-responder";
  /** Passed to AI for contextual generation */
  category?: string;
  audience?: string;
  triggerType?: string;
  triggerLabel?: string;
  /** Current editor state — used by "Improve" tab */
  currentHtml?: string;
  currentSubject?: string;
  /** Called when the user accepts generated content */
  onApplyContent: (data: { subject: string; html: string }) => void;
  /** Called when the user clicks a single subject suggestion */
  onApplySubject?: (subject: string) => void;
}

type AiTab = "generate" | "subjects" | "improve";

export function AiEmailAssistant({
  mode,
  category = "general",
  audience = "creators and brands",
  triggerType,
  triggerLabel,
  currentHtml = "",
  currentSubject = "",
  onApplyContent,
  onApplySubject,
}: AiEmailAssistantProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AiTab>("generate");

  // ── Generate tab state
  const [prompt, setPrompt] = useState(triggerLabel ? `Auto-responder for: ${triggerLabel}` : "");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ subject: string; html: string; summary?: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState(false);

  // ── Subjects tab state
  const [subjectContent, setSubjectContent] = useState("");
  const [subjectGoal, setSubjectGoal] = useState("");
  const [generatingSubjects, setGeneratingSubjects] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [sendTimeSuggestion, setSendTimeSuggestion] = useState("");
  const [loadingSendTime, setLoadingSendTime] = useState(false);

  // ── Improve tab state
  const [improveFeedback, setImproveFeedback] = useState("");
  const [improving, setImproving] = useState(false);
  const [improveResult, setImproveResult] = useState<{ subject: string; html: string; summary: string } | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a description for the email", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const endpoint =
        mode === "auto-responder"
          ? "/api/admin/email/ai/auto-responder"
          : "/api/admin/email/ai/generate";

      const body =
        mode === "auto-responder"
          ? { trigger: triggerType, triggerLabel: triggerLabel ?? prompt, userType: audience, extraContext: prompt }
          : { prompt, category, audience };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? "AI generation failed");
      setResult(data);
      toast({ title: "✨ Email generated successfully!" });
    } catch (err: any) {
      toast({ title: `AI Error: ${err.message}`, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSubjects = async () => {
    const content = subjectContent || currentHtml;
    if (!content.trim()) {
      toast({ title: "Enter email content or switch to a modal that has content", variant: "destructive" });
      return;
    }
    setGeneratingSubjects(true);
    setSubjects([]);
    try {
      const res = await fetch("/api/admin/email/ai/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content,
          audience,
          goal: subjectGoal || undefined,
          existingSubject: currentSubject || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? "Failed");
      setSubjects(data.subjects ?? []);
    } catch (err: any) {
      toast({ title: `AI Error: ${err.message}`, variant: "destructive" });
    } finally {
      setGeneratingSubjects(false);
    }
  };

  const handleRecommendSendTime = async () => {
    setLoadingSendTime(true);
    try {
      const res = await fetch("/api/admin/email/ai/send-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ audience, emailType: category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Recommendation failed");
      setSendTimeSuggestion(data.recommendation || "");
    } catch (err: any) {
      toast({ title: `AI Error: ${err.message}`, variant: "destructive" });
    } finally {
      setLoadingSendTime(false);
    }
  };

  const handleImprove = async () => {
    if (!currentHtml.trim()) {
      toast({ title: "Nothing to improve yet — write or generate some HTML first", variant: "destructive" });
      return;
    }
    setImproving(true);
    setImproveResult(null);
    try {
      const res = await fetch("/api/admin/email/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          html: currentHtml,
          subject: currentSubject,
          feedback: improveFeedback || undefined,
          audience,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? "Failed");
      setImproveResult(data);
      toast({ title: "✨ Template improved!" });
    } catch (err: any) {
      toast({ title: `AI Error: ${err.message}`, variant: "destructive" });
    } finally {
      setImproving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-purple-100/60 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
          <span className="text-sm font-semibold text-purple-900">AI Email Assistant</span>
          <Badge className="bg-purple-600 text-white border-0 text-xs px-2 py-0">Powered by Groq</Badge>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-purple-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-purple-500" />
        )}
      </button>

      {/* Panel body */}
      {open && (
        <div className="border-t border-purple-200 bg-white">
          <Tabs value={tab} onValueChange={(v) => setTab(v as AiTab)}>
            <div className="px-4 pt-3 pb-0 border-b border-purple-100">
              <TabsList className="h-8 bg-purple-50 border border-purple-200 p-0.5 gap-0.5">
                <TabsTrigger value="generate" className="h-7 text-xs px-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-none rounded gap-1">
                  <Wand2 className="h-3.5 w-3.5" />Generate
                </TabsTrigger>
                <TabsTrigger value="subjects" className="h-7 text-xs px-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-none rounded gap-1">
                  <AlignLeft className="h-3.5 w-3.5" />Subject Lines
                </TabsTrigger>
                <TabsTrigger value="improve" className="h-7 text-xs px-3 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-none rounded gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />Improve
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── Generate tab ── */}
            <TabsContent value="generate" className="m-0 p-4 space-y-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                  {mode === "auto-responder"
                    ? "Additional context for the auto-responder"
                    : "Describe the email you want to create"}
                </Label>
                <Textarea
                  rows={3}
                  className="text-sm resize-none"
                  placeholder={
                    mode === "auto-responder"
                      ? `e.g. "Warm and celebratory tone, mention their earnings potential, link to dashboard"`
                      : mode === "campaign"
                      ? `e.g. "Monthly newsletter highlighting 3 new campaigns, encourage creators to apply, mention USDT rewards"`
                      : `e.g. "Welcome email for new influencers with tips to get their first campaign approved"`
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="bg-purple-600 hover:bg-purple-700 gap-2 w-full"
              >
                {generating ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" />Generating with Groq AI…</>
                ) : (
                  <><Sparkles className="h-4 w-4" />Generate Email</>
                )}
              </Button>

              {result && (
                <div className="border border-purple-200 rounded-lg overflow-hidden">
                  <div className="bg-purple-50 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-semibold text-gray-700">Generated</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2 gap-1"
                        onClick={() => setPreviewHtml((v) => !v)}
                      >
                        <Eye className="h-3 w-3" />{previewHtml ? "Code" : "Preview"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-6 text-xs px-2 bg-purple-600 hover:bg-purple-700 gap-1"
                        onClick={() => { onApplyContent(result); toast({ title: "Applied to editor ✓" }); }}
                      >
                        <ArrowRight className="h-3 w-3" />Use this
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 bg-white">
                    <p className="text-xs font-medium text-gray-500 mb-1">Subject:</p>
                    <p className="text-sm font-semibold text-gray-900 mb-3">{result.subject}</p>
                    {previewHtml ? (
                      <iframe
                        srcDoc={result.html}
                        className="w-full rounded border"
                        style={{ height: 300 }}
                        sandbox="allow-same-origin"
                        title="AI Preview"
                      />
                    ) : (
                      <pre className="text-xs font-mono bg-gray-50 rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap text-gray-700">
                        {result.html.slice(0, 1200)}{result.html.length > 1200 ? "\n…" : ""}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Subjects tab ── */}
            <TabsContent value="subjects" className="m-0 p-4 space-y-3">
              <p className="text-xs text-gray-600">
                {currentHtml
                  ? "AI will analyze your current email content. Add a goal below to refine the suggestions."
                  : "Paste a summary of your email content to generate subject line options."}
              </p>
              {!currentHtml && (
                <Textarea
                  rows={3}
                  className="text-sm resize-none"
                  placeholder="Brief description of the email content…"
                  value={subjectContent}
                  onChange={(e) => setSubjectContent(e.target.value)}
                />
              )}
              <Input
                className="text-sm"
                placeholder="Conversion goal (optional) — e.g. 'maximize open rate' or 'drive signups'"
                value={subjectGoal}
                onChange={(e) => setSubjectGoal(e.target.value)}
              />
              <Button
                type="button"
                onClick={handleGenerateSubjects}
                disabled={generatingSubjects}
                className="bg-purple-600 hover:bg-purple-700 gap-2 w-full"
              >
                {generatingSubjects ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" />Generating…</>
                ) : (
                  <><Sparkles className="h-4 w-4" />Generate 5 Subject Lines</>
                )}
              </Button>
              {mode === "campaign" && (
                <div>
                  <Button type="button" variant="outline" className="w-full gap-2" onClick={handleRecommendSendTime} disabled={loadingSendTime}>
                    {loadingSendTime ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                    {loadingSendTime ? "Checking…" : "Recommend a send time"}
                  </Button>
                  {sendTimeSuggestion && <p className="mt-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">{sendTimeSuggestion}</p>}
                </div>
              )}

              {subjects.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">Click to use:</p>
                  {subjects.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onApplySubject?.(s);
                        toast({ title: "Subject applied ✓" });
                      }}
                      className="w-full text-left text-sm px-3 py-2.5 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-lg text-gray-800 hover:text-purple-800 transition-colors group flex items-start gap-2"
                    >
                      <span className="text-xs font-bold text-gray-400 group-hover:text-purple-400 mt-0.5 shrink-0">{i + 1}.</span>
                      <span className="flex-1">{s}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-purple-500 shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Improve tab ── */}
            <TabsContent value="improve" className="m-0 p-4 space-y-3">
              {!currentHtml ? (
                <div className="text-center py-6 text-gray-400">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Write or generate some HTML first, then come back here to improve it.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-600">AI will rewrite your current template with improved copy, design, and conversions.</p>
                  <Input
                    className="text-sm"
                    placeholder="Specific feedback (optional) — e.g. 'more urgency', 'warmer tone', 'shorter'"
                    value={improveFeedback}
                    onChange={(e) => setImproveFeedback(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleImprove}
                    disabled={improving}
                    className="bg-indigo-600 hover:bg-indigo-700 gap-2 w-full"
                  >
                    {improving ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" />Improving with AI…</>
                    ) : (
                      <><Lightbulb className="h-4 w-4" />Improve Current Template</>
                    )}
                  </Button>

                  {improveResult && (
                    <div className="border border-indigo-200 rounded-lg overflow-hidden">
                      <div className="bg-indigo-50 px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-semibold text-gray-700">Improved</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-6 text-xs px-2 bg-indigo-600 hover:bg-indigo-700 gap-1"
                          onClick={() => { onApplyContent({ subject: improveResult.subject, html: improveResult.html }); toast({ title: "Improvement applied ✓" }); }}
                        >
                          <ArrowRight className="h-3 w-3" />Use improved version
                        </Button>
                      </div>
                      {improveResult.summary && (
                        <div className="px-3 py-2 bg-white border-b border-indigo-100">
                          <p className="text-xs font-semibold text-gray-600 mb-1">What changed:</p>
                          <p className="text-xs text-gray-700 whitespace-pre-line">{improveResult.summary}</p>
                        </div>
                      )}
                      <div className="p-3 bg-white">
                        <p className="text-xs font-medium text-gray-500 mb-1">New subject:</p>
                        <p className="text-sm font-semibold text-gray-900">{improveResult.subject}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
