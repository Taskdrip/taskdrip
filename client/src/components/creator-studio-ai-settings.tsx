import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BookOpen, Check, Loader2, RefreshCw, Save, Settings2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const SETTINGS_URL = "/api/admin/creator-studio/ai-settings";
const CREATE_COLORING_BOOK_URL = "/api/admin/creator-studio/books/children-bible-coloring";
const SETTINGS_QUERY_KEY = [SETTINGS_URL];

export interface CreatorStudioAiSettingsProps {
  onBookCreated: (book: CreatedBook) => void;
}

export interface CreatedBook {
  id: string;
  title: string;
}

export interface CreatorStudioAiSettings {
  defaultChapterCount: number;
  childAgeBand: string;
  includeParentNotes: boolean;
  illustrationStyle: string;
  generationPrompt: string;
  resourceNotes: string;
  toolPrompts: Record<string, string>;
  toolSettings: Record<string, { temperature: number; maxTokens: number }>;
}

interface AiSettingsResponse {
  aiAvailable: boolean;
  provider: "groq" | "openai-compatible" | "ollama";
  endpointUrl: string;
  model: string;
  settings: CreatorStudioAiSettings;
}

const TOOL_PROMPTS = [
  { key: "complete-book", title: "Complete book", note: "Generate a complete manuscript and book structure." },
  { key: "outline", title: "Outline", note: "Build the book's chapter-by-chapter plan." },
  { key: "chapter", title: "Chapter", note: "Draft or revise a single chapter." },
  { key: "metadata", title: "Metadata", note: "Prepare publication details and discoverability copy." },
  { key: "writing-assistant", title: "Writing assistant", note: "Support focused writing and editorial tasks." },
  { key: "title-ideas", title: "Title ideas", note: "Suggest book title and subtitle options." },
  { key: "blurb", title: "Book description", note: "Write the back-cover and store description." },
  { key: "proofread", title: "Proofreader", note: "Improve clarity and correctness while preserving meaning." },
  { key: "expand", title: "Chapter expansion", note: "Develop a saved chapter without inventing sources." },
  { key: "keywords", title: "Keyword suggestions", note: "Suggest relevant store-search phrases." },
] as const;

const defaultSettings: CreatorStudioAiSettings = {
  defaultChapterCount: 6,
  childAgeBand: "6–8",
  includeParentNotes: true,
  illustrationStyle: "",
  generationPrompt: "",
  resourceNotes: "",
  toolPrompts: {},
  toolSettings: {
    "complete-book": { temperature: 0.55, maxTokens: 3600 },
    outline: { temperature: 0.6, maxTokens: 2400 },
    chapter: { temperature: 0.7, maxTokens: 2400 },
    metadata: { temperature: 0.65, maxTokens: 2400 },
    "writing-assistant": { temperature: 0.7, maxTokens: 2400 },
    "title-ideas": { temperature: 0.7, maxTokens: 1400 },
    blurb: { temperature: 0.65, maxTokens: 1800 },
    proofread: { temperature: 0.2, maxTokens: 4000 },
    expand: { temperature: 0.65, maxTokens: 4000 },
    keywords: { temperature: 0.5, maxTokens: 1200 },
  },
};

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...options });
  if (!response.ok) {
    let message = "The request could not be completed.";
    try {
      message = (await response.json()).message || message;
    } catch {
      // Keep the concise fallback for non-JSON responses.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function mergeSettings(settings?: Partial<CreatorStudioAiSettings> | null): CreatorStudioAiSettings {
  return {
    ...defaultSettings,
    ...settings,
    toolPrompts: { ...(settings?.toolPrompts || {}) },
    toolSettings: {
      ...defaultSettings.toolSettings,
      ...(settings?.toolSettings || {}),
    },
  };
}

function settingsSnapshot(provider: string, endpointUrl: string, model: string, settings: CreatorStudioAiSettings) {
  return JSON.stringify({ provider, endpointUrl, model, settings });
}

export default function CreatorStudioAiSettingsPanel({ onBookCreated }: CreatorStudioAiSettingsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [provider, setProvider] = useState<AiSettingsResponse["provider"]>("groq");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [model, setModel] = useState("");
  const [settings, setSettings] = useState<CreatorStudioAiSettings>(defaultSettings);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const onBookCreatedRef = useRef(onBookCreated);
  onBookCreatedRef.current = onBookCreated;

  const settingsQuery = useQuery<AiSettingsResponse>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => requestJson<AiSettingsResponse>(SETTINGS_URL),
  });

  const hasLocalChanges = useMemo(
    () => !!savedSnapshot && settingsSnapshot(provider, endpointUrl, model, settings) !== savedSnapshot,
    [provider, endpointUrl, model, settings, savedSnapshot],
  );

  useEffect(() => {
    if (!settingsQuery.data || hasLocalChanges) return;
    const nextProvider = settingsQuery.data.provider || "groq";
    const nextEndpointUrl = settingsQuery.data.endpointUrl || "";
    const nextModel = settingsQuery.data.model || "";
    const nextSettings = mergeSettings(settingsQuery.data.settings);
    setProvider(nextProvider);
    setEndpointUrl(nextEndpointUrl);
    setModel(nextModel);
    setSettings(nextSettings);
    setSavedSnapshot(settingsSnapshot(nextProvider, nextEndpointUrl, nextModel, nextSettings));
  }, [settingsQuery.data, hasLocalChanges]);

  const saveMutation = useMutation({
    mutationFn: () => requestJson<AiSettingsResponse>(SETTINGS_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, endpointUrl: endpointUrl.trim(), model: model.trim(), settings }),
    }),
    onSuccess: (response) => {
      const savedProvider = response?.provider ?? provider;
      const savedEndpointUrl = response?.endpointUrl ?? endpointUrl.trim();
      const savedModel = response?.model ?? model.trim();
      const savedSettings = mergeSettings(response?.settings ?? settings);
      setProvider(savedProvider);
      setEndpointUrl(savedEndpointUrl);
      setModel(savedModel);
      setSettings(savedSettings);
      setSavedSnapshot(settingsSnapshot(savedProvider, savedEndpointUrl, savedModel, savedSettings));
      queryClient.setQueryData<AiSettingsResponse>(SETTINGS_QUERY_KEY, (previous) => ({
        aiAvailable: response?.aiAvailable ?? previous?.aiAvailable ?? false,
        provider: savedProvider,
        endpointUrl: savedEndpointUrl,
        model: savedModel,
        settings: savedSettings,
      }));
      toast({ title: "AI publishing settings saved" });
    },
    onError: (error: Error) => toast({
      title: "Could not save AI settings",
      description: error.message,
      variant: "destructive",
    }),
  });

  const createBookMutation = useMutation({
    mutationFn: () => requestJson<{ book: CreatedBook; pageCount?: number; upgraded?: boolean }>(CREATE_COLORING_BOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replaceExisting: true }),
    }),
    onSuccess: ({ book, pageCount, upgraded }) => {
      toast({
        title: upgraded ? "God’s Big Story upgraded" : "Children’s Bible coloring book created",
        description: `${book.title} · ${pageCount || "More than 120"} designed pages`,
      });
      onBookCreatedRef.current(book);
    },
    onError: (error: Error) => toast({
      title: "Could not create the coloring book",
      description: error.message,
      variant: "destructive",
    }),
  });

  const updateSettings = <K extends keyof CreatorStudioAiSettings>(
    key: K,
    value: CreatorStudioAiSettings[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const updateToolPrompt = (key: string, value: string) => {
    setSettings((current) => ({
      ...current,
      toolPrompts: { ...current.toolPrompts, [key]: value },
    }));
  };
  const updateToolSetting = (key: string, field: "temperature" | "maxTokens", value: number) => {
    setSettings((current) => ({
      ...current,
      toolSettings: {
        ...current.toolSettings,
        [key]: {
          ...(current.toolSettings[key] || defaultSettings.toolSettings[key]),
          [field]: value,
        },
      },
    }));
  };

  const providerAvailable = Boolean(settingsQuery.data?.aiAvailable);
  const isModelConfigured = Boolean(providerAvailable
    && provider === settingsQuery.data?.provider
    && endpointUrl.trim() === (settingsQuery.data?.endpointUrl || "").trim()
    && settingsQuery.data?.model.trim()
    && model.trim() === settingsQuery.data.model.trim());
  const modelStatus = !providerAvailable
    ? "Provider not configured"
    : isModelConfigured
      ? "Model configured"
      : "Save to apply model";

  if (settingsQuery.isLoading) {
    return (
      <Card className="overflow-hidden border-slate-200 shadow-sm" aria-label="Loading AI publishing settings" aria-busy="true">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-6 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-full max-w-lg animate-pulse rounded bg-slate-100" />
        </CardHeader>
        <CardContent className="space-y-5 p-5 sm:p-6">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-3 rounded-xl border border-slate-100 p-4">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
          <span className="sr-only">Loading model-backed publishing settings</span>
        </CardContent>
      </Card>
    );
  }

  if (settingsQuery.isError) {
    return (
      <Card className="border-rose-200 shadow-sm">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-700">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">AI settings could not be loaded</h2>
            <p className="mt-1 text-sm text-slate-600">{(settingsQuery.error as Error).message}</p>
          </div>
          <Button variant="outline" onClick={() => settingsQuery.refetch()} disabled={settingsQuery.isFetching}>
            {settingsQuery.isFetching
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              : <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />}
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf0ec] text-[#36584a]">
              <Settings2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Creator Studio · AI controls</p>
              <CardTitle className="mt-1 text-xl tracking-tight text-slate-900">Ebook generation settings</CardTitle>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
                Set the model and defaults used by the writing tools. Changes here apply to future generations.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={isModelConfigured
              ? "w-fit border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800"
              : "w-fit border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800"}
            role="status"
            aria-live="polite"
          >
            <span className={`mr-2 h-1.5 w-1.5 rounded-full ${isModelConfigured ? "bg-emerald-600" : "bg-amber-500"}`} />
            {modelStatus}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-4 sm:p-6">
        <section aria-labelledby="model-config-heading" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="model-config-heading" className="font-semibold text-slate-900">Model connection</h2>
              <p className="mt-1 text-sm text-slate-500">Choose the model identifier used by the server-side publishing tools.</p>
            </div>
            <span className="hidden rounded-lg bg-slate-100 p-2 text-slate-500 sm:block">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="creator-ai-provider">Provider</Label>
              <select
                id="creator-ai-provider"
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={provider}
                onChange={(event) => setProvider(event.target.value as AiSettingsResponse["provider"])}
              >
                <option value="groq">Groq · hosted open-weight models</option>
                <option value="openai-compatible">OpenAI-compatible endpoint</option>
                <option value="ollama">Ollama-compatible endpoint</option>
              </select>
            </div>
            <div>
              <Label htmlFor="creator-ai-model">Model name</Label>
              <Input
                id="creator-ai-model"
                className="mt-1.5"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder={provider === "groq" ? "llama-3.3-70b-versatile" : "Model identifier for your endpoint"}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {provider !== "groq" && (
              <div className="sm:col-span-2">
                <Label htmlFor="creator-ai-endpoint">Provider endpoint URL</Label>
                <Input
                  id="creator-ai-endpoint"
                  className="mt-1.5"
                  value={endpointUrl}
                  onChange={(event) => setEndpointUrl(event.target.value)}
                  placeholder={provider === "ollama" ? "http://localhost:11434/v1" : "https://your-provider.example/v1"}
                  autoComplete="url"
                  spellCheck={false}
                />
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  The endpoint must be reachable from the deployed server and support the OpenAI chat-completions API.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3.5 text-xs leading-5 text-sky-950">
            <p className="font-semibold">Keep API keys in deployment variables—not in this form.</p>
            <p className="mt-1">For Groq, add <code>GROQ_API_KEY</code>. For an OpenAI-compatible provider, add <code>BOOK_AI_API_KEY</code> and <code>BOOK_AI_BASE_URL</code>. For Ollama, enter a reachable compatible endpoint URL here; do not enter a key unless your endpoint requires one.</p>
            <p className="mt-1">In Railway, open your project → service → Variables, add the required variable names and values, then redeploy the service. In Replit, use Secrets for the same names. Never paste a key into the Model name or endpoint fields.</p>
            <p className="mt-1">Only models whose license and terms permit your intended use should be selected. AI output is a draft for human review; availability, cost, context limits, and licenses vary.</p>
          </div>
        </section>

        <section aria-labelledby="book-defaults-heading" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h2 id="book-defaults-heading" className="font-semibold text-slate-900">Book defaults</h2>
            <p className="mt-1 text-sm text-slate-500">Shared direction for generated ebook manuscripts and illustrated projects.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="creator-default-chapters">Default chapter count</Label>
              <select
                id="creator-default-chapters"
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={settings.defaultChapterCount}
                onChange={(event) => updateSettings("defaultChapterCount", Number(event.target.value))}
              >
                {[4, 6, 8, 10, 12, 16, 20].map((count) => <option key={count} value={count}>{count} chapters</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="creator-child-age-band">Child age band</Label>
              <select
                id="creator-child-age-band"
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={settings.childAgeBand}
                onChange={(event) => updateSettings("childAgeBand", event.target.value)}
              >
                {["3–5", "6–8", "9–12"].map((ageBand) => <option key={ageBand} value={ageBand}>Ages {ageBand}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="creator-illustration-style">Illustration style</Label>
              <Input
                id="creator-illustration-style"
                className="mt-1.5"
                value={settings.illustrationStyle}
                onChange={(event) => updateSettings("illustrationStyle", event.target.value)}
                placeholder="Describe the visual style for illustrations"
              />
            </div>
            <label
              htmlFor="creator-parent-notes"
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:col-span-2"
            >
              <input
                id="creator-parent-notes"
                type="checkbox"
                checked={settings.includeParentNotes}
                onChange={(event) => updateSettings("includeParentNotes", event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#36584a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#36584a]"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">Include parent notes</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">Ask book generation to include short guidance for parents or caregivers.</span>
              </span>
            </label>
          </div>
        </section>

        <section aria-labelledby="generation-prompt-heading" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h2 id="resource-notes-heading" className="font-semibold text-slate-900">Reference resources</h2>
            <p className="mt-1 text-sm text-slate-500">Optional source notes and approved references added to the AI tools’ context.</p>
          </div>
          <Label htmlFor="creator-resource-notes">Source and reference notes</Label>
          <Textarea
            id="creator-resource-notes"
            className="mt-1.5 min-h-28 resize-y leading-6"
            value={settings.resourceNotes}
            maxLength={5000}
            onChange={(event) => updateSettings("resourceNotes", event.target.value)}
            placeholder="Add source passages, approved terminology, style-guide notes, or other material the tools should follow."
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">These notes are sent with book, outline, chapter, metadata, and writing-tool prompts. Do not put API keys or passwords here.</p>
        </section>

        <section aria-labelledby="generation-prompt-heading" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h2 id="generation-prompt-heading" className="font-semibold text-slate-900">Full-book prompt</h2>
            <p className="mt-1 text-sm text-slate-500">Core instructions applied when the complete-book tool creates a manuscript.</p>
          </div>
          <Label htmlFor="creator-generation-prompt">Generation instructions</Label>
          <Textarea
            id="creator-generation-prompt"
            className="mt-1.5 min-h-36 resize-y leading-6"
            value={settings.generationPrompt}
            onChange={(event) => updateSettings("generationPrompt", event.target.value)}
            placeholder="Set the voice, structure, audience, and quality bar for a complete book."
          />
        </section>

        <section aria-labelledby="tool-prompts-heading" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h2 id="tool-prompts-heading" className="font-semibold text-slate-900">Tool prompts</h2>
            <p className="mt-1 text-sm text-slate-500">Tune the instructions for each individual writing tool.</p>
          </div>
          <div className="space-y-4">
            {TOOL_PROMPTS.map((tool, index) => {
              const id = `creator-tool-prompt-${tool.key}`;
              return (
                <div key={tool.key} className="grid gap-2 border-t border-slate-100 pt-4 first:border-0 first:pt-0 sm:grid-cols-[minmax(145px,.34fr)_minmax(0,1fr)] sm:gap-5">
                  <div>
                    <Label htmlFor={id}>{tool.title}</Label>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{tool.note}</p>
                  </div>
                  <Textarea
                    id={id}
                    className="min-h-24 resize-y leading-6"
                    value={settings.toolPrompts[tool.key] || ""}
                    onChange={(event) => updateToolPrompt(tool.key, event.target.value)}
                    placeholder={`Instructions for the ${tool.title.toLowerCase()} tool`}
                    aria-label={`${tool.title} tool prompt`}
                  />
                  <div className="grid grid-cols-2 gap-3 sm:col-start-2">
                    <div>
                      <Label htmlFor={`${id}-temperature`} className="text-xs">Temperature</Label>
                      <Input
                        id={`${id}-temperature`}
                        className="mt-1.5"
                        type="number"
                        min={0}
                        max={2}
                        step={0.05}
                        value={settings.toolSettings[tool.key]?.temperature ?? defaultSettings.toolSettings[tool.key].temperature}
                        onChange={(event) => updateToolSetting(tool.key, "temperature", Number(event.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${id}-tokens`} className="text-xs">Maximum output tokens</Label>
                      <Input
                        id={`${id}-tokens`}
                        className="mt-1.5"
                        type="number"
                        min={512}
                        max={8000}
                        step={256}
                        value={settings.toolSettings[tool.key]?.maxTokens ?? defaultSettings.toolSettings[tool.key].maxTokens}
                        onChange={(event) => updateToolSetting(tool.key, "maxTokens", Number(event.target.value))}
                      />
                    </div>
                  </div>
                  <span className="sr-only">Tool prompt {index + 1} of {TOOL_PROMPTS.length}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="coloring-book-heading" className="flex flex-col gap-4 rounded-xl border border-[#dce5df] bg-[#f4f7f4] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#36584a] shadow-sm">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="coloring-book-heading" className="font-semibold text-slate-900">Children’s Bible coloring book</h2>
              <p className="mt-1 max-w-xl text-sm leading-5 text-slate-600">Create or upgrade the editable 20-story edition: a 147-page A4 portrait print interior, with scripture references, illustrated read-alouds, family questions, assignments, dimensional color examples, and matching coloring pages.</p>
            </div>
          </div>
          <Button
            type="button"
            className="shrink-0 bg-[#36584a] text-white hover:bg-[#2d4a3e]"
            onClick={() => {
              const confirmed = window.confirm(
                "Create or upgrade God’s Big Story? If a draft already exists, this replaces its manuscript and page designs with the new 20-story edition.",
              );
              if (confirmed) createBookMutation.mutate();
            }}
            disabled={createBookMutation.isPending}
          >
            {createBookMutation.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              : <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />}
            {createBookMutation.isPending ? "Preparing your book…" : "Create or upgrade book"}
          </Button>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex min-h-5 items-center gap-2 text-xs text-slate-500" role="status" aria-live="polite">
            {saveMutation.isSuccess && !hasLocalChanges && (
              <><Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />Settings saved</>
            )}
            {hasLocalChanges && <span>Unsaved changes</span>}
            {!hasLocalChanges && !saveMutation.isSuccess && <span>Changes are saved only when you choose Save settings.</span>}
          </p>
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={!hasLocalChanges || saveMutation.isPending}
            className="w-full bg-[#36584a] text-white hover:bg-[#2d4a3e] sm:w-auto"
          >
            {saveMutation.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
            {saveMutation.isPending ? "Saving settings…" : "Save settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
