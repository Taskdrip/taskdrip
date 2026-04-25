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
  User, Search, Megaphone, ArrowLeft, Ban, UserCheck, AlertCircle
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

interface MessageAttachment {
  url: string;
  name?: string;
  type?: string;
  size?: number;
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
  attachments?: MessageAttachment[] | null;
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
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketContent, setTicketContent] = useState("");
  const [ticketPriority, setTicketPriority] = useState("normal");
  const [showSidebar, setShowSidebar] = useState(true);
  // Direct compose state (when clicking message icon on a profile)
  const [directComposeText, setDirectComposeText] = useState("");
  const [directComposing, setDirectComposing] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const { data: user } = useQuery<any>({ queryKey: ["/api/user"], retry: false });
  const isAdmin = user?.userType === "admin";
  const isBrand = user?.userType === "brand";

  const { data: conversations = [], isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
    refetchInterval: 2500,
    refetchIntervalInBackground: false,
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId) ?? null;

  // Thread — poll frequently while a conversation is open so new messages feel instant.
  const { data: thread = [], isLoading: threadLoading } = useQuery<ThreadMessage[]>({
    queryKey: ["/api/conversations", selectedConvId, "thread"],
    queryFn: () => apiRequest("GET", `/api/conversations/${selectedConvId}/thread`).then(r => r.json()),
    enabled: !!selectedConvId,
    refetchInterval: 1000,
    refetchIntervalInBackground: false,
  });

  // Optimistic outgoing messages — show instantly while server confirms.
  const [optimisticMsgs, setOptimisticMsgs] = useState<Record<string, ThreadMessage[]>>({});
  const optimisticForConv = selectedConvId ? (optimisticMsgs[selectedConvId] ?? []) : [];
  // Drop optimistic messages once server thread already contains them (matched by content + close timestamp)
  useEffect(() => {
    if (!selectedConvId || optimisticForConv.length === 0) return;
    const remaining = optimisticForConv.filter(opt => {
      return !thread.some(real => real.senderId === opt.senderId && real.content === opt.content);
    });
    if (remaining.length !== optimisticForConv.length) {
      setOptimisticMsgs(prev => ({ ...prev, [selectedConvId]: remaining }));
    }
  }, [thread, selectedConvId]);
  const displayThread = [...thread, ...optimisticForConv];

  // Typing indicator — peer presence
  const peerId = selectedConv ? (selectedConv.participants?.find((p: any) => p.id !== user?.id)?.id) : null;
  const { data: peerTyping } = useQuery<{ typing: boolean }>({
    queryKey: ['/api/typing', peerId],
    queryFn: () => fetch(`/api/typing/${peerId}`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!peerId,
    refetchInterval: 1500,
    refetchIntervalInBackground: false,
  });

  // Quick-chat sidebar: who am I following? (brands for influencers, anyone for brands/admins)
  const { data: following = [] } = useQuery<any[]>({
    queryKey: ["/api/users", user?.id, "following"],
    queryFn: () => fetch(`/api/users/${user?.id}/following`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const pingTyping = () => {
    if (!peerId) return;
    fetch('/api/typing', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId: peerId }) }).catch(() => {});
  };

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: isBrand ? ["/api/campaigns/brand", user?.id] : ["/api/user/campaigns"],
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/message-recipients"],
    enabled: !!user && isNewConvOpen,
  });

  // URL ?to= param
  const urlToId = new URLSearchParams(window.location.search).get("to") || "";
  const { data: preselectedUser } = useQuery<any>({
    queryKey: ["/api/users", urlToId, "profile"],
    queryFn: () => fetch(`/api/users/${urlToId}/profile`, { credentials: "include" }).then(r => r.json()),
    enabled: !!urlToId && !!user,
  });

  // Block status — for the other participant in a direct conversation
  const otherUserId = (() => {
    if (selectedConv && convKind(selectedConv) === "direct") {
      return selectedConv.participants.find(p => p.id !== user?.id)?.id ?? null;
    }
    if (directComposing && urlToId) return urlToId;
    return null;
  })();

  const { data: blockStatus, refetch: refetchBlockStatus } = useQuery<{ iBlockedThem: boolean; theyBlockedMe: boolean }>({
    queryKey: ["/api/users", otherUserId, "block-status"],
    queryFn: () => fetch(`/api/users/${otherUserId}/block-status`, { credentials: "include" }).then(r => r.json()),
    enabled: !!otherUserId && !!user,
    staleTime: 10000,
  });

  // Auto-select from URL param (?to=userId)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get("campaign");
    const toUserId = params.get("to");

    if (toUserId && conversations !== undefined) {
      const existing = (conversations as Conversation[]).find(c =>
        !c.campaignId && c.participants.some(p => p.id === toUserId)
      );
      if (existing) {
        setSelectedConvId(existing.id);
        setDirectComposing(false);
      } else if (!selectedConvId) {
        // No existing conversation — show inline direct compose
        setDirectComposing(true);
        setSelectedConvId(null);
      }
      return;
    }

    if (campaignId && conversations.length > 0) {
      const match = conversations.find(c => c.campaignId === campaignId);
      if (match) setSelectedConvId(match.id);
      else { setIsNewConvOpen(true); setNewCampaignId(campaignId); }
    }
  }, [conversations.length, urlToId]);

  // Auto-scroll
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

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
    const content = replyText.trim();
    const targetUserId = (isBrand && broadcastTarget !== "all") ? broadcastTarget : undefined;
    // Optimistic message — appears in thread instantly, replaced when server returns
    if (user?.id) {
      const optimistic: ThreadMessage = {
        id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        senderId: user.id,
        content,
        createdAt: new Date().toISOString(),
        sender: { id: user.id, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, userType: user.userType, companyName: user.companyName } as Participant,
      } as ThreadMessage;
      setOptimisticMsgs(prev => ({ ...prev, [selectedConvId]: [...(prev[selectedConvId] ?? []), optimistic] }));
    }
    setReplyText("");
    replyMutation.mutate({ convKey: selectedConvId, content, targetUserId });
  }, [replyText, selectedConvId, isBrand, broadcastTarget, replyMutation, user]);

  // Direct compose: send first message to a user (from profile link)
  const directSendMutation = useMutation({
    mutationFn: async () => {
      if (!urlToId || !directComposeText.trim()) throw new Error("Message is required");
      const res = await apiRequest("POST", "/api/messages", {
        receiverId: urlToId,
        subject: "Direct Message",
        content: directComposeText.trim(),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Message sent!" });
      setDirectComposeText("");
      setDirectComposing(false);
    },
    onError: (e: Error) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  // New conversation (generic — from "+ New" button)
  const newConvMutation = useMutation({
    mutationFn: async () => {
      if (!newRecipientId) throw new Error("Recipient is required");
      const res = await apiRequest("POST", "/api/messages", {
        receiverId: newRecipientId,
        campaignId: newCampaignId || undefined,
        subject: "New Message",
        content: "👋 Hey there!",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Conversation started!" });
      setIsNewConvOpen(false);
      setNewRecipientId(""); setNewCampaignId("");
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

  // Block/Unblock mutations
  const blockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/users/${userId}/block`, {});
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      refetchBlockStatus();
      toast({ title: "User blocked", description: "You won't receive messages from this user." });
    },
    onError: (e: Error) => toast({ title: "Failed to block", description: e.message, variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}/block`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      refetchBlockStatus();
      toast({ title: "User unblocked", description: "You can now receive messages from this user." });
    },
    onError: (e: Error) => toast({ title: "Failed to unblock", description: e.message, variant: "destructive" }),
  });

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter(conv => {
    if (!search) return true;
    const title = conv.campaign?.title ?? conv.participants.filter(p => p.id !== user?.id).map(p => displayName(p)).join(" ");
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  // ── Direct Compose Panel ────────────────────────────────────────────────────
  const DirectComposePanel = () => {
    const recipientName = preselectedUser
      ? (preselectedUser.companyName || `${preselectedUser.firstName} ${preselectedUser.lastName}`)
      : "this user";
    const recipientAvatar = preselectedUser?.profileImageUrl;
    const recipientInitials = preselectedUser
      ? `${preselectedUser.firstName?.[0] || ""}${preselectedUser.lastName?.[0] || ""}`.toUpperCase()
      : "?";

    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setDirectComposing(false); setShowSidebar(true); }}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Avatar className="h-9 w-9">
              <AvatarImage src={recipientAvatar} />
              <AvatarFallback className="text-xs font-bold bg-blue-100 text-blue-700">{recipientInitials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{recipientName}</h2>
              <p className="text-xs text-slate-500">Send a direct message</p>
            </div>
          </div>
        </div>

        {/* Compose area */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6">
          <div className="w-full max-w-lg text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Start a conversation with {recipientName}</h3>
            <p className="text-sm text-slate-500">Your message will land directly in their inbox. They can reply, keep it, or block further messages.</p>
          </div>
          <div className="w-full max-w-lg space-y-3">
            <Textarea
              value={directComposeText}
              onChange={e => setDirectComposeText(e.target.value)}
              placeholder={`Write your message to ${recipientName}…`}
              className="min-h-[120px] text-sm resize-none bg-white"
              data-testid="input-direct-message"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (directComposeText.trim()) directSendMutation.mutate();
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setDirectComposing(false); setShowSidebar(true); }}
                data-testid="button-cancel-direct-message"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={!directComposeText.trim() || directSendMutation.isPending}
                onClick={() => directSendMutation.mutate()}
                data-testid="button-send-direct-message"
              >
                <Send className="h-4 w-4" />
                {directSendMutation.isPending ? "Sending…" : "Send Message"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    );
  };

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
                placeholder="Search conversations…"
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

          {/* Following — Quick Chat: 1-click chat with brands/people you follow */}
          {following.length > 0 && (
            <div className="px-3 py-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-transparent">
              <div className="flex items-center gap-1.5 px-1 mb-2">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Quick Chat · Following</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" data-testid="quick-chat-strip">
                {following.slice(0, 12).map((u: any) => {
                  const existingConv = (conversations as Conversation[]).find(c =>
                    !c.campaignId && c.participants.some(p => p.id === u.id)
                  );
                  const name = u.companyName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "User";
                  const inits = `${u.firstName?.[0] ?? name[0] ?? "?"}${u.lastName?.[0] ?? ""}`.toUpperCase();
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        if (existingConv) {
                          setSelectedConvId(existingConv.id);
                          setDirectComposing(false);
                        } else {
                          // Update URL so DirectComposePanel + preselectedUser pick it up
                          window.history.pushState({}, "", `/messages?to=${u.id}`);
                          setSelectedConvId(null);
                          setDirectComposing(true);
                        }
                        setShowSidebar(false);
                      }}
                      className="flex-shrink-0 flex flex-col items-center gap-1 group focus:outline-none"
                      title={`Chat with ${name}`}
                      data-testid={`quick-chat-${u.id}`}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-white ring-2 ring-transparent group-hover:ring-blue-400 transition-all">
                          <AvatarImage src={u.profileImageUrl} />
                          <AvatarFallback className={`text-xs font-bold ${u.userType === "brand" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                            {inits}
                          </AvatarFallback>
                        </Avatar>
                        {u.userType === "brand" && (
                          <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white text-[8px] font-bold rounded-full px-1 leading-tight border border-white">B</span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-slate-600 group-hover:text-blue-600 truncate max-w-[60px] leading-tight">
                        {name.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                      onClick={() => { setSelectedConvId(conv.id); setDirectComposing(false); setShowSidebar(false); setBroadcastTarget("all"); }}
                      data-testid={`conv-item-${conv.id}`}
                      className={`w-full text-left px-3 py-3 flex items-start gap-3 transition-all border-l-2 ${
                        isSelected
                          ? "bg-blue-50 border-l-blue-500"
                          : "border-l-transparent hover:bg-slate-50"
                      }`}
                    >
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

        {/* ── Right Panel ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Direct compose (from clicking message icon on a profile) */}
          {directComposing && !selectedConvId ? (
            <DirectComposePanel />
          ) : selectedConv ? (
            <>
              {/* Thread Header */}
              <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0">
                <div className="flex items-center gap-3">
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

                  {/* Brand broadcast selector */}
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

                  {/* Block/Unblock — only for direct conversations */}
                  {convKind(selectedConv) === "direct" && otherUserId && (
                    blockStatus?.iBlockedThem ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8 border-slate-200 text-slate-600 hover:text-green-700 hover:border-green-400"
                        onClick={() => unblockMutation.mutate(otherUserId)}
                        disabled={unblockMutation.isPending}
                        data-testid="button-unblock-user"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Unblock
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8 border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300"
                        onClick={() => blockMutation.mutate(otherUserId)}
                        disabled={blockMutation.isPending}
                        data-testid="button-block-user"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Block
                      </Button>
                    )
                  )}
                </div>
              </div>

              {/* Blocked notice banner */}
              {blockStatus?.iBlockedThem && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800 flex-shrink-0">
                  <Ban className="h-4 w-4 flex-shrink-0" />
                  <span>You have blocked this user. They cannot send you new messages. <button className="underline font-medium" onClick={() => unblockMutation.mutate(otherUserId!)}>Unblock</button> to allow messages again.</span>
                </div>
              )}
              {blockStatus?.theyBlockedMe && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-2 text-sm text-red-700 flex-shrink-0">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>This user has blocked you. You cannot send them messages.</span>
                </div>
              )}

              {/* Thread Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {threadLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Loading messages…</p>
                    </div>
                  </div>
                ) : displayThread.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No messages yet</p>
                      <p className="text-sm text-slate-400 mt-1">Send the first message below</p>
                    </div>
                  </div>
                ) : (
                  displayThread.map((msg, idx) => {
                    const isMine = msg.senderId === user?.id;
                    const isSupport = msg.messageType === "support_ticket";
                    const isAdminMsg = msg.sender?.userType === "admin" || msg.messageType === "admin_group";
                    const showSender = idx === 0 || displayThread[idx - 1]?.senderId !== msg.senderId;
                    const isOptimistic = typeof msg.id === "string" && msg.id.startsWith("optimistic-");

                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
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
                            {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                              <div className={`mt-2 flex flex-col gap-2 ${msg.content ? '' : '-m-1'}`} data-testid={`attachments-${msg.id}`}>
                                {msg.attachments.map((att, i) => {
                                  const isImage = /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(att.url) || att.type?.startsWith('image/');
                                  const isPdf = /\.pdf(\?|$)/i.test(att.url) || att.type === 'application/pdf';
                                  const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(att.url) || att.type?.startsWith('video/');
                                  if (isImage) {
                                    return (
                                      <a key={i} href={att.url} target="_blank" rel="noreferrer" className="block">
                                        <img src={att.url} alt={att.name || 'attachment'} loading="lazy"
                                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                          className="max-h-64 max-w-full rounded-lg object-cover" />
                                      </a>
                                    );
                                  }
                                  if (isVideo) {
                                    return <video key={i} src={att.url} controls className="max-h-64 max-w-full rounded-lg" />;
                                  }
                                  if (isPdf) {
                                    return (
                                      <a key={i} href={att.url} target="_blank" rel="noreferrer"
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isMine ? 'bg-blue-700/40 border-blue-300/40 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                                        <span className="text-xs font-medium truncate max-w-[180px]">{att.name || 'PDF document'}</span>
                                      </a>
                                    );
                                  }
                                  return (
                                    <a key={i} href={att.url} target="_blank" rel="noreferrer"
                                      className={`text-xs underline ${isMine ? 'text-blue-100' : 'text-blue-600'}`}>
                                      {att.name || att.url.split('/').pop()}
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {!showSender && (
                            <span className="text-[10px] text-slate-400 px-1 mt-0.5">{formatTime(msg.createdAt)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {peerTyping?.typing && (
                  <div className="flex gap-2" data-testid="typing-indicator">
                    <div className="w-7 flex-shrink-0" />
                    <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Reply Input */}
              <div className="bg-white border-t border-slate-200 p-3 flex-shrink-0">
                {blockStatus?.theyBlockedMe ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-400">
                    <Ban className="h-4 w-4" />
                    <span>You cannot send messages to this user.</span>
                  </div>
                ) : (
                  <>
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
                    {peerTyping?.typing && convKind(selectedConv) === "direct" && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs text-blue-600 font-medium" data-testid="typing-pill">
                        <span className="flex items-center gap-0.5">
                          <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                        <span>{displayName(selectedConv.participants.find(p => p.id !== user?.id))} is typing…</span>
                      </div>
                    )}
                    <div className="flex gap-2 items-end">
                      <Textarea
                        value={replyText}
                        onChange={e => { setReplyText(e.target.value); pingTyping(); }}
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
                  </>
                )}
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
                    ? "View all brand-influencer conversations and support tickets."
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

      {/* ── New Conversation Dialog (generic — from + New button) ──────── */}
      <Dialog open={isNewConvOpen} onOpenChange={setIsNewConvOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" /> New Conversation
            </DialogTitle>
            <DialogDescription>Choose who you want to message</DialogDescription>
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
                    {u.userType === "admin" ? " (Admin)" : u.userType === "brand" ? " (Brand)" : " (Influencer)"}
                  </option>
                ))}
              </select>
            </div>

            {campaigns.length > 0 && (
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
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setIsNewConvOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 gap-2"
                disabled={!newRecipientId || newConvMutation.isPending}
                onClick={() => newConvMutation.mutate()}
                data-testid="button-start-conversation"
              >
                <MessageCircle className="h-4 w-4" />
                {newConvMutation.isPending ? "Starting…" : "Start Chat"}
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
                placeholder="Describe the issue in detail…"
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
