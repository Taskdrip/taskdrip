import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, ShieldCheck, Plus, Users, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface Conversation {
  id: string;
  campaignId: string | null;
  campaign: { id: string; title: string } | null;
  participants: { id: string; firstName: string; lastName: string; userType: string; companyName?: string; profileImageUrl?: string }[];
  lastMessage: { id: string; content: string; senderId: string; createdAt: string; isRead: boolean };
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
  sender: { id: string; firstName: string; lastName: string; userType: string; companyName?: string } | null;
}

const newConvSchema = z.object({
  receiverId: z.string().min(1, "Please select a recipient"),
  campaignId: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message is required"),
});

const adminMsgSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message is required"),
});

export default function MessagesPage() {
  const { toast } = useToast();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isNewMsgOpen, setIsNewMsgOpen] = useState(false);
  const [isAdminMsgOpen, setIsAdminMsgOpen] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery<any>({ queryKey: ["/api/user"], retry: false });
  const isAdmin = (user as any)?.userType === 'admin';
  const isBrand = (user as any)?.userType === 'brand';

  const { data: conversations = [], isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    retry: false,
    enabled: !!user,
    refetchInterval: 15000,
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId) || null;

  const { data: thread = [], isLoading: threadLoading } = useQuery<ThreadMessage[]>({
    queryKey: ["/api/conversations", selectedConv?.campaignId, "thread"],
    queryFn: () => apiRequest("GET", `/api/conversations/${selectedConv!.campaignId}/thread`).then(r => r.json()),
    enabled: !!selectedConv?.campaignId,
    refetchInterval: 8000,
  });

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: isBrand ? ["/api/campaigns/brand", (user as any)?.id] : ["/api/user/campaigns"],
    retry: false,
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/message-recipients"],
    retry: false,
    enabled: !!user,
  });

  // Auto-select conversation from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get('campaign');
    if (campaignId && conversations.length > 0) {
      const match = conversations.find(c => c.campaignId === campaignId);
      if (match) {
        setSelectedConvId(match.id);
      } else {
        // No existing conversation found — open new message dialog with that campaign pre-selected
        setIsNewMsgOpen(true);
        newConvForm.setValue('campaignId', campaignId);
      }
    }
  }, [conversations.length]);

  // Scroll to latest message
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  // Reply in campaign thread
  const replyMutation = useMutation({
    mutationFn: async ({ campaignId, content }: { campaignId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/conversations/${campaignId}/reply`, { content });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConv?.campaignId, "thread"] });
      setReplyText("");
    },
    onError: (e: Error) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  const handleReply = () => {
    if (!replyText.trim() || !selectedConv?.campaignId) return;
    replyMutation.mutate({ campaignId: selectedConv.campaignId, content: replyText.trim() });
  };

  // New conversation (direct message)
  const newConvForm = useForm<z.infer<typeof newConvSchema>>({
    resolver: zodResolver(newConvSchema),
    defaultValues: { receiverId: "", campaignId: "", subject: "", content: "" },
  });

  const sendNewMsgMutation = useMutation({
    mutationFn: async (data: z.infer<typeof newConvSchema>) => {
      const res = await apiRequest("POST", "/api/messages", data);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Message sent!", description: "Your message has been delivered." });
      setIsNewMsgOpen(false);
      newConvForm.reset();
    },
    onError: (e: Error) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  // Message admin
  const adminForm = useForm<z.infer<typeof adminMsgSchema>>({
    resolver: zodResolver(adminMsgSchema),
    defaultValues: { subject: "", content: "" },
  });

  const adminMsgMutation = useMutation({
    mutationFn: async (data: z.infer<typeof adminMsgSchema>) => {
      const res = await apiRequest("POST", "/api/messages/to-admin", data);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Message sent to admin!", description: "The support team will respond shortly." });
      setIsAdminMsgOpen(false);
      adminForm.reset();
    },
    onError: (e: Error) => toast({ title: "Failed to send", description: e.message, variant: "destructive" }),
  });

  const getDisplayName = (participant: any, currentUserId?: string) => {
    if (!participant) return "Unknown";
    if (participant.id === currentUserId) return "You";
    if (participant.userType === 'admin') return "Admin Support";
    if (participant.userType === 'brand') return participant.companyName || `${participant.firstName} ${participant.lastName}`;
    return `${participant.firstName} ${participant.lastName}`;
  };

  const getSenderName = (msg: ThreadMessage) => {
    if (!msg.sender) return "Unknown";
    if (msg.sender.id === user?.id) return "You";
    if (msg.sender.userType === 'admin') return "Admin Support";
    if (msg.sender.userType === 'brand') return msg.sender.companyName || `${msg.sender.firstName} ${msg.sender.lastName}`;
    return `${msg.sender.firstName} ${msg.sender.lastName}`;
  };

  const getConvTitle = (conv: Conversation) => {
    if (conv.campaign) return conv.campaign.title;
    const others = conv.participants.filter(p => p.id !== user?.id);
    if (others.length === 0) return "Conversation";
    return others.map(p => getDisplayName(p)).join(", ");
  };

  const getConvSubtitle = (conv: Conversation) => {
    const others = conv.participants.filter(p => p.id !== user?.id);
    if (conv.campaign) {
      const otherNames = others.map(p => getDisplayName(p)).join(", ");
      return otherNames || "Campaign conversation";
    }
    return conv.lastMessage.content.substring(0, 50);
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Left sidebar: conversation list */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Messages</h1>
              {totalUnread > 0 && (
                <Badge className="bg-blue-600 text-white text-xs">{totalUnread}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {/* New message button */}
            <Dialog open={isNewMsgOpen} onOpenChange={setIsNewMsgOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 gap-1" data-testid="button-new-message">
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                  <DialogDescription>Start a conversation about a campaign</DialogDescription>
                </DialogHeader>
                <Form {...newConvForm}>
                  <form onSubmit={newConvForm.handleSubmit(d => sendNewMsgMutation.mutate(d))} className="space-y-4">
                    <FormField control={newConvForm.control} name="campaignId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign (optional)</FormLabel>
                        <FormControl>
                          <select {...field} className="w-full p-2 border rounded-md text-sm">
                            <option value="">No specific campaign</option>
                            {campaigns.map((c: any) => (
                              <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={newConvForm.control} name="receiverId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient</FormLabel>
                        <FormControl>
                          <select {...field} className="w-full p-2 border rounded-md text-sm">
                            <option value="">Select recipient...</option>
                            {(allUsers as any[]).map((u: any) => (
                              <option key={u.id} value={u.id}>
                                {u.userType === 'brand' ? (u.companyName || `${u.firstName} ${u.lastName}`) : `${u.firstName} ${u.lastName}`}
                                {u.userType === 'admin' ? ' (Admin)' : ''}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={newConvForm.control} name="subject" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl><Input placeholder="What's this about?" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={newConvForm.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl><Textarea placeholder="Type your message..." className="min-h-[100px]" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsNewMsgOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={sendNewMsgMutation.isPending}>
                        {sendNewMsgMutation.isPending ? "Sending..." : "Send Message"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Message Admin button — visible to all non-admin users */}
            {!isAdmin && (
              <Dialog open={isAdminMsgOpen} onOpenChange={setIsAdminMsgOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex-1 gap-1 bg-purple-600 hover:bg-purple-700" data-testid="button-message-admin">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-purple-600" />
                      Contact Admin Support
                    </DialogTitle>
                    <DialogDescription>
                      Need help with a dispute, payment issue, or have a question? Message the admin team directly.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...adminForm}>
                    <form onSubmit={adminForm.handleSubmit(d => adminMsgMutation.mutate(d))} className="space-y-4">
                      <FormField control={adminForm.control} name="subject" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl><Input placeholder="e.g. Payment issue, Dispute, Account question..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={adminForm.control} name="content" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe your issue or question in detail..." className="min-h-[120px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsAdminMsgOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={adminMsgMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                          {adminMsgMutation.isPending ? "Sending..." : "Send to Admin"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Start by clicking "New" or "Admin"</p>
            </div>
          ) : (
            conversations.map(conv => {
              const isSelected = selectedConvId === conv.id;
              const others = conv.participants.filter(p => p.id !== user?.id);
              const hasAdmin = conv.participants.some(p => p.userType === 'admin');
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  data-testid={`conv-${conv.id}`}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {hasAdmin && <ShieldCheck className="h-3 w-3 text-purple-500 flex-shrink-0" />}
                        {others.length > 1 && <Users className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                        <span className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                          {getConvTitle(conv)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{getConvSubtitle(conv)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-gray-300" />
                        <span className="text-xs text-gray-400">
                          {format(new Date(conv.lastMessage.createdAt), "MMM d")}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-blue-600 text-white text-xs h-5 min-w-5 flex items-center justify-center">
                          {conv.unreadCount}
                        </Badge>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: thread view */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConv ? (
          <>
            {/* Thread header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {selectedConv.participants.some(p => p.userType === 'admin') && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">Admin Involved</Badge>
                    )}
                    <h2 className="text-lg font-bold text-gray-900">{getConvTitle(selectedConv)}</h2>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500">
                      {selectedConv.participants.filter(p => p.id !== user?.id).map(p => getDisplayName(p, user?.id)).join(", ")}
                    </span>
                    {selectedConv.participants.length > 2 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Users className="h-3 w-3" />
                        Group conversation
                      </Badge>
                    )}
                  </div>
                </div>
                {!isAdmin && selectedConv.campaignId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                    onClick={() => setIsAdminMsgOpen(true)}
                    data-testid="button-escalate-admin"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Involve Admin
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {threadLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading messages...</p>
                  </div>
                </div>
              ) : thread.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No messages yet</p>
                    <p className="text-sm text-gray-400 mt-1">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                thread.map(msg => {
                  const isMine = msg.senderId === user?.id;
                  const isAdminMsg = msg.messageType === 'admin_group' || msg.sender?.userType === 'admin';
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <span className="text-xs text-gray-500 px-1">
                          {getSenderName(msg)} · {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                        </span>
                        <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                          isAdminMsg
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : isMine
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                        }`}>
                          {isAdminMsg && !isMine && (
                            <div className="flex items-center gap-1 mb-1">
                              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                              <span className="text-xs font-semibold text-purple-700">Admin Support</span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Reply box */}
            {selectedConv.campaignId ? (
              <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                <div className="flex gap-3 items-end">
                  <Textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your message... (all participants will receive it)"
                    className="flex-1 min-h-[60px] max-h-[140px] resize-none text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                    data-testid="input-reply"
                  />
                  <Button
                    onClick={handleReply}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="flex-shrink-0 gap-1 h-10"
                    data-testid="button-send-reply"
                  >
                    <Send className="h-4 w-4" />
                    {replyMutation.isPending ? "..." : "Send"}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Press Enter to send · Shift+Enter for new line</p>
              </div>
            ) : (
              <div className="bg-gray-50 border-t border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500">This is a direct message thread. Use "New" to start a campaign conversation.</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-sm">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Your Messages</h3>
              <p className="text-gray-500 mb-6">
                {isAdmin
                  ? "View and participate in all brand-creator conversations. You can mediate disputes and provide support."
                  : "Select a conversation to read and reply, or start a new one. All parties in a campaign thread receive your message."
                }
              </p>
              {!isAdmin && (
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setIsNewMsgOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Message
                  </Button>
                  <Button onClick={() => setIsAdminMsgOpen(true)} className="gap-2 bg-purple-600 hover:bg-purple-700">
                    <ShieldCheck className="h-4 w-4" />
                    Message Admin
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
