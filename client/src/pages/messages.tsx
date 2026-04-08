import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle, Send, ShieldCheck, Plus, Users, Ticket,
  User, Search, Megaphone, ArrowLeft
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { NavigationFixed } from "@/components/ui/navigation-fixed";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  userType: string;
  companyName?: string;
  profileImageUrl?: string;
}

interface Conversation {
  id: string;
  campaignId: string | null;
  campaign: { id: string; title: string } | null;
  participants: Participant[];
  lastMessage: { id: string; content: string; senderId: string; createdAt: string; isRead: boolean; messageType?: string };
  unreadCount: number;
}

interface ThreadMessage {
  id: string;
  campaignId: string | null;
  senderId: string;
  receiverId: string;
  subject: string | null;
  content: string;
  messageType: string | null;
  isRead: boolean;
  createdAt: string;
  sender: Participant | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function displayName(p: Participant | null | undefined, currentUserId?: string): string {
  if (!p) return "Unknown";
  if (p.id === currentUserId) return "You";
  if (p.userType === "admin") return "Admin Support";
  if (p.userType === "brand") return p.companyName || `${p.firstName} ${p.lastName}`;
  return `${p.firstName} ${p.lastName}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function initials(p: Participant): string {
  return `${p.firstName?.[0] || ""}${p.lastName?.[0] || ""}`.toUpperCase();
}

function convKind(conv: Conversation): "campaign" | "support" | "direct" {
  if (conv.campaignId) return "campaign";
  if (conv.participants.some(p => p.userType === "admin")) return "support";
  return "direct";
}

// ─── Participant Avatar Stack ─────────────────────────────────────────────────
function AvatarStack({ participants, currentUserId, max = 3 }: { participants: Participant[]; currentUserId: string; max?: number }) {
  const others = participants.filter(p => p.id !== currentUserId).slice(0, max);
  return (
    <div className="flex -space-x-2">
      {others.map(p => (
        <Avatar key={p.id} className="h-8 w-8 border-2 border-white">
          <AvatarImage src={p.profileImageUrl} />
          <AvatarFallback className={`text-xs font-bold ${p.userType === "admin" ? "bg-violet-600 text-white" : p.userType === "brand" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}`}>
            {initials(p)}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { toast } = useToast();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");
  const [isNewConvOpen, setIsNewConvOpen] = useState(false);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<string>("all");
  const [newRecipientId, setNewRecipientId] = useState("");
  const [newCampaignId, setNewCampaignId] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketContent, setTicketContent] = useState("");
  const [ticketPriority, setTicketPriority] = useState("normal");
  const [showSidebar, setShowSidebar] = useState(true);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const { data: user } = useQuery<any>({ queryKey: ["/api/user"], retry: false });
  const isAdmin = user?.userType === "admin";
  const isBrand = user?.userType === "brand";

  const { data: conversations = [], isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
    refetchInterval: 10000,
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId) ?? null;

  // Thread — works for both campaign AND direct conversation keys
  const { data: thread = [], isLoading: threadLoading } = useQuery<ThreadMessage[]>({
    queryKey: ["/api/conversations", selectedConvId, "thread"],
    queryFn: () => apiRequest("GET", `/api/conversations/${selectedConvId}/thread`).then(r => r.json()),
    enabled: !!selectedConvId,
    refetchInterval: 6000,
  });

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: isBrand ? ["/api/campaigns/brand", user?.id] : ["/api/user/campaigns"],
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/message-recipients"],
    enabled: !!user,
  });

  // Auto-select from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get("campaign");
    if (campaignId && conversations.length > 0) {
      const match = conversations.find(c => c.campaignId === campaignId);
      if (match) setSelectedConvId(match.id);
      else { setIsNewConvOpen(true); setNewCampaignId(campaignId); }
    }
  }, [conversations.length]);

  // Auto-scroll
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  // Campaign participants for broadcast target
  const selectedCampaignParticipants = selectedConv?.participants.filter(p => p.id !== user?.id && p.userType !== "admin") ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const replyMutation = useMutation({
    mutationFn: async ({ convKey, content, targetUserId }: { convKey: string; content: string; targetUserId?: string }) => {
      const body: any = { content };
      if (targetUserId) body.targetUserId = targetUserId;
      const res = await apiRequest("POST", `/api/conversations/${convKey}/reply`, body);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConvId, "thread"] });
      setReplyText("");
      sendingRef.current = false;
    },
    onError: (e: Error) => {
      sendingRef.current = false;
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    },
  });

  const sendReply = useCallback(() => {
    if (!replyText.trim() || !selectedConvId || replyMutation.isPending || sendingRef.current) return;
    sendingRef.current = true;
    const targetUserId = (isBrand && broadcastTarget !== "all") ? broadcastTarget : undefined;
    replyMutation.mutate({ convKey: selectedConvId, content: replyText.trim(), targetUserId });
  }, [replyText, selectedConvId, isBrand, broadcastTarget, replyMutation]);

  const newConvMutation = useMutation({
    mutationFn: async () => {
      if (!newRecipientId || !newContent.trim()) throw new Error("Recipient and message are required");
      const res = await apiRequest("POST", "/api/messages", {
        receiverId: newRecipientId,
        campaignId: newCampaignId || undefined,
        subject: newSubject || "New Message",
        content: newContent.trim(),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Message sent!" });
      setIsNewConvOpen(false);
      setNewRecipientId(""); setNewCampaignId(""); setNewSubject(""); setNewContent("");
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const ticketMutation = useMutation({
    mutationFn: async () => {
      if (!ticketContent.trim()) throw new Error("Please describe your issue");
      const res = await apiRequest("POST", "/api/support-tickets", {
        subject: ticketSubject || "Support Request",
        content: ticketContent.trim(),
        priority: ticketPriority,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Support ticket created!", description: "Admin will respond shortly." });
      setIsTicketOpen(false);
      setTicketSubject(""); setTicketContent(""); setTicketPriority("normal");
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter(conv => {
    if (!search) return true;
    const title = conv.campaign?.title ?? conv.participants.filter(p => p.id !== user?.id).map(p => displayName(p)).join(" ");
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <NavigationFixed />

      <div className="flex flex-1 overflow-hidden pt-16">

        {/* ── Left Sidebar ─────────────────────────────────────────────── */}
        <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-80 flex-shrink-0 bg-white border-r border-slate-200`}>

          {/* Sidebar header */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <h1 className="text-base font-bold text-slate-900">Messages</h1>
                {totalUnread > 0 && (
                  <Badge className="bg-blue-600 text-white text-xs h-5 px-1.5">{totalUnread}</Badge>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="pl-8 h-9 text-sm bg-slate-50"
                data-testid="input-search-conversations"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsNewConvOpen(true)}
                className="flex-1 gap-1.5 h-8 text-xs" data-testid="button-new-conversation">
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
              {!isAdmin && (
                <Button size="sm" onClick={() => setIsTicketOpen(true)}
                  className="flex-1 gap-1.5 h-8 text-xs bg-violet-600 hover:bg-violet-700" data-testid="button-support-ticket">
                  <Ticket className="h-3.5 w-3.5" /> Support
                </Button>
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="p-3 space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">
                  {search ? "No matching conversations" : "No conversations yet"}
                </p>
                {!search && <p className="text-xs text-slate-400 mt-1">Click "New" to start one</p>}
              </div>
            ) : (
              <div className="py-1">
                {filteredConvs.map(conv => {
                  const isSelected = selectedConvId === conv.id;
                  const others = conv.participants.filter(p => p.id !== user?.id);
                  const kind = convKind(conv);
                  const lastContent = conv.lastMessage?.content ?? "";
                  const preview = lastContent.length > 50 ? lastContent.slice(0, 50) + "…" : lastContent;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => { setSelectedConvId(conv.id); setShowSidebar(false); setBroadcastTarget("all"); }}
                      data-testid={`conv-item-${conv.id}`}
                      className={`w-full text-left px-3 py-3 flex items-start gap-3 transition-all border-l-2 ${
                        isSelected
                          ? "bg-blue-50 border-l-blue-500"
                          : "border-l-transparent hover:bg-slate-50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0 mt-0.5">
                        {kind === "support" ? (
                          <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-violet-600" />
                          </div>
                        ) : others.length === 1 ? (
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={others[0].profileImageUrl} />
                            <AvatarFallback className={`text-xs font-bold ${others[0].userType === "brand" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                              {initials(others[0])}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center">
                            <Users className="h-4 w-4 text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <span className={`text-sm font-semibold leading-tight truncate ${isSelected ? "text-blue-700" : "text-slate-900"}`}>
                            {(conv.campaign?.title ?? others.map(p => displayName(p)).join(", ")) || "Conversation"}
                          </span>
                          <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{formatTime(conv.lastMessage.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {kind === "support" && <Badge className="bg-violet-100 text-violet-700 text-[10px] px-1 py-0 h-4 font-normal">Support</Badge>}
                          {kind === "campaign" && <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1 py-0 h-4 font-normal">Campaign</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{preview || "No messages yet"}</p>
                      </div>

                      {/* Unread */}
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-blue-600 text-white text-xs h-5 min-w-5 px-1 flex-shrink-0">{conv.unreadCount}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Thread View ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConv ? (
            <>
              {/* Thread Header */}
              <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {/* Back button on mobile */}
                  <button onClick={() => { setSelectedConvId(null); setShowSidebar(true); }}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <AvatarStack participants={selectedConv.participants} currentUserId={user?.id} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {convKind(selectedConv) === "support" && (
                        <Badge className="bg-violet-100 text-violet-700 text-xs gap-1">
                          <ShieldCheck className="h-3 w-3" /> Support
                        </Badge>
                      )}
                      {convKind(selectedConv) === "campaign" && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">Campaign</Badge>
                      )}
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {(selectedConv.campaign?.title ?? selectedConv.participants.filter(p => p.id !== user?.id).map(p => displayName(p)).join(", ")) || "Conversation"}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {selectedConv.participants.filter(p => p.id !== user?.id).map(p => displayName(p, user?.id)).join(", ")}
                    </p>
                  </div>

                  {/* Brand: broadcast target selector */}
                  {isBrand && selectedConv.campaignId && selectedCampaignParticipants.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-slate-400" />
                      <select
                        value={broadcastTarget}
                        onChange={e => setBroadcastTarget(e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        data-testid="select-broadcast-target"
                      >
                        <option value="all">All participants</option>
                        {selectedCampaignParticipants.map(p => (
                          <option key={p.id} value={p.id}>{displayName(p)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Thread Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {threadLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Loading messages…</p>
                    </div>
                  </div>
                ) : thread.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No messages yet</p>
                      <p className="text-sm text-slate-400 mt-1">Send the first message below</p>
                    </div>
                  </div>
                ) : (
                  thread.map((msg, idx) => {
                    const isMine = msg.senderId === user?.id;
                    const isSupport = msg.messageType === "support_ticket";
                    const isAdminMsg = msg.sender?.userType === "admin" || msg.messageType === "admin_group";
                    const showSender = idx === 0 || thread[idx - 1]?.senderId !== msg.senderId;

                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                        {/* Avatar — show only on sender change */}
                        {showSender && !isMine ? (
                          <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
                            <AvatarImage src={msg.sender?.profileImageUrl} />
                            <AvatarFallback className={`text-xs font-bold ${isAdminMsg ? "bg-violet-600 text-white" : msg.sender?.userType === "brand" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}`}>
                              {initials(msg.sender as Participant)}
                            </AvatarFallback>
                          </Avatar>
                        ) : !isMine ? (
                          <div className="w-7 flex-shrink-0" />
                        ) : null}

                        <div className={`max-w-[72%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                          {showSender && (
                            <span className="text-[11px] text-slate-500 px-1 mb-0.5">
                              {isMine ? "You" : displayName(msg.sender, user?.id)} · {formatTime(msg.createdAt)}
                            </span>
                          )}
                          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isSupport
                              ? "bg-amber-50 border border-amber-200 text-amber-900"
                              : isAdminMsg && !isMine
                                ? "bg-violet-50 border border-violet-200 text-violet-900"
                                : isMine
                                  ? "bg-blue-600 text-white"
                                  : "bg-white border border-slate-200 text-slate-900"
                          }`}>
                            {isSupport && !isMine && (
                              <div className="flex items-center gap-1 mb-1">
                                <Ticket className="h-3 w-3 text-amber-600" />
                                <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Support Ticket</span>
                              </div>
                            )}
                            {isAdminMsg && !isMine && (
                              <div className="flex items-center gap-1 mb-1">
                                <ShieldCheck className="h-3 w-3 text-violet-600" />
                                <span className="text-[10px] font-semibold text-violet-700 uppercase tracking-wide">Admin</span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          {!showSender && (
                            <span className="text-[10px] text-slate-400 px-1 mt-0.5">{formatTime(msg.createdAt)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Reply Input */}
              <div className="bg-white border-t border-slate-200 p-3 flex-shrink-0">
                {isBrand && selectedConv.campaignId && broadcastTarget !== "all" && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    <span>Sending only to <strong className="text-slate-700">{displayName(selectedCampaignParticipants.find(p => p.id === broadcastTarget))}</strong></span>
                  </div>
                )}
                {isBrand && selectedConv.campaignId && broadcastTarget === "all" && selectedCampaignParticipants.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-500">
                    <Megaphone className="h-3.5 w-3.5" />
                    <span>Broadcasting to all {selectedCampaignParticipants.length} participant{selectedCampaignParticipants.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 min-h-[44px] max-h-[120px] resize-none text-sm py-2.5"
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    data-testid="input-message-reply"
                  />
                  <Button
                    onClick={sendReply}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="h-[44px] px-4 gap-1.5 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                    data-testid="button-send-reply"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          ) : (
            /* No conversation selected */
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center max-w-xs px-4">
                <MessageCircle className="h-14 w-14 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  {isAdmin ? "Platform Messages" : "Your Messages"}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {isAdmin
                    ? "View all brand-creator conversations and support tickets."
                    : "Select a conversation, or start a new one. Use Support to reach the admin team."}
                </p>
                {!isAdmin && (
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => setIsNewConvOpen(true)} variant="outline" className="gap-2 w-full">
                      <Plus className="h-4 w-4" /> New Conversation
                    </Button>
                    <Button onClick={() => setIsTicketOpen(true)} className="gap-2 w-full bg-violet-600 hover:bg-violet-700">
                      <Ticket className="h-4 w-4" /> Open Support Ticket
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New Conversation Dialog ─────────────────────────────────────── */}
      <Dialog open={isNewConvOpen} onOpenChange={setIsNewConvOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" /> New Conversation
            </DialogTitle>
            <DialogDescription>Send a message to any user you've interacted with</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Recipient *</label>
              <select
                value={newRecipientId}
                onChange={e => setNewRecipientId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="select-recipient"
              >
                <option value="">Select a person…</option>
                {(allUsers as any[]).map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.userType === "brand" ? (u.companyName || `${u.firstName} ${u.lastName}`) : `${u.firstName} ${u.lastName}`}
                    {u.userType === "admin" ? " (Admin)" : u.userType === "brand" ? " (Brand)" : " (Creator)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Campaign (optional)</label>
              <select
                value={newCampaignId}
                onChange={e => setNewCampaignId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="select-campaign"
              >
                <option value="">No specific campaign</option>
                {(campaigns as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Subject *</label>
              <Input
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="What's this about?"
                className="text-sm"
                data-testid="input-new-subject"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Message *</label>
              <Textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Type your message…"
                className="min-h-[100px] text-sm resize-none"
                data-testid="input-new-content"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setIsNewConvOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 gap-2"
                disabled={!newRecipientId || !newContent.trim() || newConvMutation.isPending}
                onClick={() => newConvMutation.mutate()}
                data-testid="button-send-new-message"
              >
                <Send className="h-4 w-4" />
                {newConvMutation.isPending ? "Sending…" : "Send Message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Support Ticket Dialog ─────────────────────────────────────────── */}
      <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-violet-600" /> Open a Support Ticket
            </DialogTitle>
            <DialogDescription>
              Our admin team will respond as soon as possible. Use this for disputes, payment issues, or account questions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Priority</label>
              <div className="flex gap-2">
                {["normal", "urgent"].map(p => (
                  <button key={p} onClick={() => setTicketPriority(p)}
                    className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      ticketPriority === p
                        ? p === "urgent" ? "bg-red-600 text-white border-red-600" : "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {p === "urgent" ? "🚨 Urgent" : "📋 Normal"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Subject</label>
              <Input
                value={ticketSubject}
                onChange={e => setTicketSubject(e.target.value)}
                placeholder="e.g. Payment issue, Campaign dispute…"
                className="text-sm"
                data-testid="input-ticket-subject"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Description *</label>
              <Textarea
                value={ticketContent}
                onChange={e => setTicketContent(e.target.value)}
                placeholder="Describe the issue in detail. Include any relevant campaign or payment information…"
                className="min-h-[120px] text-sm resize-none"
                data-testid="input-ticket-content"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setIsTicketOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700"
                disabled={!ticketContent.trim() || ticketMutation.isPending}
                onClick={() => ticketMutation.mutate()}
                data-testid="button-submit-ticket"
              >
                <ShieldCheck className="h-4 w-4" />
                {ticketMutation.isPending ? "Submitting…" : "Submit Ticket"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
