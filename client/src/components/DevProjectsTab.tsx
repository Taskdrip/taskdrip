import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Code2, Send, Clock, CheckCircle, AlertTriangle, Loader2,
  ExternalLink, ChevronRight, MessageSquare, DollarSign,
  Calendar, RefreshCw, Inbox
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; step: number }> = {
  pending:            { label: "Submitted — Awaiting Response", color: "bg-yellow-100 text-yellow-800",  step: 1 },
  accepted:           { label: "Accepted — Awaiting Payment",  color: "bg-blue-100 text-blue-800",      step: 2 },
  payment_submitted:  { label: "Payment Under Review",          color: "bg-purple-100 text-purple-800",  step: 3 },
  active:             { label: "In Development",               color: "bg-green-100 text-green-800",    step: 4 },
  work_submitted:     { label: "Ready for Review",             color: "bg-indigo-100 text-indigo-800",  step: 5 },
  revision_requested: { label: "Revisions Requested",          color: "bg-orange-100 text-orange-800",  step: 4 },
  completed:          { label: "Completed ✓",                  color: "bg-gray-100 text-gray-800",      step: 6 },
  rejected:           { label: "Declined",                     color: "bg-red-100 text-red-800",        step: 0 },
  cancelled:          { label: "Cancelled",                    color: "bg-gray-100 text-gray-500",      step: 0 },
};

const STEPS = [
  { n: 1, label: "Submitted" },
  { n: 2, label: "Accepted" },
  { n: 3, label: "Payment" },
  { n: 4, label: "In Dev" },
  { n: 5, label: "Review" },
  { n: 6, label: "Done" },
];

function StatusStep({ current }: { current: number }) {
  if (current === 0) return null;
  return (
    <div className="flex items-center gap-1 mt-3 mb-1">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? "bg-green-500 text-white" : active ? "bg-purple-600 text-white ring-2 ring-purple-200" : "bg-gray-200 text-gray-500"
              }`}>
                {done ? "✓" : s.n}
              </div>
              <span className={`text-[9px] mt-0.5 hidden sm:block ${active ? "text-purple-700 font-semibold" : "text-gray-400"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-4 sm:w-8 mb-3 ${done ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Chat panel ─────────────────────────────────────────────────────────────────
function ChatPanel({ offerId, offerTitle }: { offerId: string; offerTitle: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");

  const { data: msgs = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/direct-hire/${offerId}/messages`],
    refetchInterval: 12000,
    enabled: !!offerId,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/direct-hire/${offerId}/messages`, { content: msg }).then(r => r.json()),
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: [`/api/direct-hire/${offerId}/messages`] });
    },
    onError: (e: Error) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (msg.trim()) sendMutation.mutate();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 min-h-[220px] max-h-[340px]">
        <div className="p-3 space-y-2">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}
          {!isLoading && msgs.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No messages yet.</p>
              <p className="text-xs text-gray-400">Send a message to the developer below.</p>
            </div>
          )}
          {msgs.map((m: any) => {
            const mine = m.senderId === (user as any)?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-purple-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-900 rounded-bl-sm"
                }`}>
                  {!mine && (
                    <p className="text-[10px] font-semibold text-purple-600 mb-0.5">Developer</p>
                  )}
                  <p className="leading-relaxed">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${mine ? "text-purple-200" : "text-gray-400"}`}>
                    {m.createdAt
                      ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })
                      : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t pt-3 px-3 pb-3">
        <div className="flex gap-2">
          <Input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message the developer…"
            className="flex-1 text-sm"
          />
          <Button
            size="sm"
            onClick={() => sendMutation.mutate()}
            disabled={!msg.trim() || sendMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 px-3"
          >
            {sendMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">Press Enter to send</p>
      </div>
    </div>
  );
}

// ── Project detail panel ───────────────────────────────────────────────────────
function ProjectDetail({ project }: { project: any }) {
  const statusCfg = STATUS[project.status] || { label: project.status, color: "bg-gray-100 text-gray-700", step: 0 };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-900 text-base leading-snug">{project.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Submitted {project.createdAt ? format(new Date(project.createdAt), "MMM d, yyyy") : "—"}
            </p>
          </div>
          <Badge className={`${statusCfg.color} text-xs font-semibold`}>{statusCfg.label}</Badge>
        </div>

        {/* Progress stepper */}
        <StatusStep current={statusCfg.step} />
      </div>

      {/* Project info */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
            <DollarSign className="w-3 h-3" /> Budget
          </p>
          <p className="font-semibold text-gray-900">
            {Number(project.budget) > 0 ? `$${Number(project.budget).toLocaleString()}` : "TBD"}
          </p>
        </div>
        {project.deadline && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
              <Calendar className="w-3 h-3" /> Deadline
            </p>
            <p className="font-semibold text-gray-900">
              {format(new Date(project.deadline), "MMM d, yyyy")}
            </p>
          </div>
        )}
      </div>

      {project.description && (
        <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 max-h-28 overflow-y-auto">
          {project.description}
        </div>
      )}

      {/* Invoice notice */}
      {project.invoiceNumber && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Invoice <strong>{project.invoiceNumber}</strong> ready — due {project.invoiceDueDate ? format(new Date(project.invoiceDueDate), "MMM d") : "—"}</span>
        </div>
      )}

      {project.status === 'work_submitted' && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-sm text-indigo-800">
          <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>Work has been submitted for your review.</span>
          {project.workSubmissionUrl && (
            <a href={project.workSubmissionUrl} target="_blank" rel="noreferrer"
              className="ml-auto text-indigo-700 underline text-xs flex items-center gap-1">
              View <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      <a
        href={`/direct-hire/${project.id}`}
        className="flex items-center gap-1.5 text-xs text-purple-700 font-medium hover:underline w-fit"
      >
        <ExternalLink className="w-3 h-3" /> Open full project page
      </a>

      {/* Chat */}
      <Card className="flex-1 border shadow-sm overflow-hidden">
        <CardHeader className="py-2.5 px-3 border-b bg-gray-50">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-600" />
            Chat with Developer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex flex-col">
          <ChatPanel offerId={project.id} offerTitle={project.title} />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main exported tab ──────────────────────────────────────────────────────────
export function DevProjectsTab() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: projects = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/hire-developer/my-requests"],
    enabled: !!(user as any)?.id,
  });

  const selected = projects.find(p => p.id === selectedId) ?? null;

  // Auto-select first project
  if (!selectedId && projects.length > 0 && !selected) {
    setSelectedId(projects[0].id);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <Code2 className="w-8 h-8 text-purple-300" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No developer projects yet</p>
          <p className="text-sm text-gray-500 mb-5">
            Submit a request and track it here along with your conversation with the developer.
          </p>
          <a href="/hire-developer">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              Hire a Developer
            </Button>
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: projects.length, icon: Inbox, color: "text-gray-700" },
          { label: "Active", value: projects.filter(p => ["active", "payment_submitted", "work_submitted", "revision_requested"].includes(p.status)).length, icon: RefreshCw, color: "text-green-600" },
          { label: "Done", value: projects.filter(p => p.status === "completed").length, icon: CheckCircle, color: "text-blue-600" },
        ].map(s => (
          <Card key={s.label} className="border shadow-none bg-gray-50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Project list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Projects</p>
            <button
              onClick={() => refetch()}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {projects.map(project => {
            const cfg = STATUS[project.status] || { label: project.status, color: "bg-gray-100 text-gray-700", step: 0 };
            const isSelected = project.id === selectedId;
            return (
              <button
                key={project.id}
                onClick={() => setSelectedId(project.id)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-purple-400 bg-purple-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-purple-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isSelected ? "text-purple-900" : "text-gray-900"}`}>
                      {project.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {project.createdAt ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true }) : ""}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isSelected ? "text-purple-500" : "text-gray-300"}`} />
                </div>
                <Badge className={`mt-2 text-[10px] px-2 py-0.5 ${cfg.color}`}>
                  {cfg.label}
                </Badge>
              </button>
            );
          })}

          <a href="/hire-developer" className="block">
            <Button variant="outline" size="sm" className="w-full mt-1 text-xs">
              + New Project Request
            </Button>
          </a>
        </div>

        {/* Detail panel */}
        {selected ? (
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <ProjectDetail project={selected} />
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Select a project to view details
          </div>
        )}
      </div>
    </div>
  );
}
