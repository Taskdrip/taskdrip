import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearch } from "wouter";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import {
  Send, ArrowLeft, MessageCircle, Search, CheckCheck, Check,
  Paperclip, Smile, MoreVertical, Phone, Video, Info, Zap
} from "lucide-react";

interface Message {
  id: string;
  campaignId: string;
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
  messageType: string;
  isRead: boolean;
  attachments?: any[];
  createdAt: string;
  sender?: { id: string; firstName: string; lastName: string; companyName?: string; userType: string; username?: string; profileImageUrl?: string };
  receiver?: { id: string; firstName: string; lastName: string; companyName?: string; userType: string; username?: string; profileImageUrl?: string };
}

interface Conversation {
  userId: string;
  userName: string;
  userType: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatar?: string;
}

function getDisplayName(u: any) {
  if (!u) return 'Unknown';
  if (u.userType === 'brand' && u.companyName) return u.companyName;
  return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Unknown';
}

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

function formatTimestampFull(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  return format(date, 'MMM d, h:mm a');
}

const messageSchema = z.object({ content: z.string().min(1) });

export default function ChatPage() {
  const { toast } = useToast();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initTo = params.get('to');

  const [selectedConversation, setSelectedConversation] = useState<string | null>(initTo);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useQuery({ queryKey: ["/api/user"], retry: false });
  const isBrand = (user as any)?.userType === 'brand';

  const { data: allMessages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    retry: false,
    refetchInterval: 3000,
  });

  // Build conversations from messages
  useEffect(() => {
    if (!allMessages.length || !user) return;
    const convMap = new Map<string, Conversation>();
    for (const msg of allMessages) {
      const me = (user as any).id;
      const otherId = msg.senderId === me ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === me ? msg.receiver : msg.sender;
      const name = getDisplayName(otherUser);
      if (!convMap.has(otherId)) {
        convMap.set(otherId, { userId: otherId, userName: name, userType: otherUser?.userType || 'creator', lastMessage: msg.content, lastMessageTime: msg.createdAt, unreadCount: (!msg.isRead && msg.receiverId === me) ? 1 : 0, avatar: otherUser?.profileImageUrl });
      } else {
        const c = convMap.get(otherId)!;
        if (new Date(msg.createdAt) > new Date(c.lastMessageTime)) { c.lastMessage = msg.content; c.lastMessageTime = msg.createdAt; }
        if (!msg.isRead && msg.receiverId === me) c.unreadCount++;
      }
    }
    const sorted = Array.from(convMap.values()).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    setConversations(sorted);
  }, [allMessages, user]);

  const conversationMessages = selectedConversation
    ? allMessages
        .filter(m => (m.senderId === selectedConversation || m.receiverId === selectedConversation) && (m.senderId === (user as any)?.id || m.receiverId === (user as any)?.id))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages.length]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const fd = new FormData();
      fd.append('content', text);
      fd.append('receiverId', selectedConversation!);
      fd.append('subject', 'Chat');
      fd.append('messageType', 'chat');
      const res = await fetch('/api/messages', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setContent('');
      inputRef.current?.focus();
    },
    onError: () => toast({ title: 'Failed to send message', variant: 'destructive' }),
  });

  const handleSend = () => {
    const text = content.trim();
    if (!text || !selectedConversation) return;
    sendMutation.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredConversations = conversations.filter(c =>
    !searchQuery || c.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConv = conversations.find(c => c.userId === selectedConversation);
  const profileLink = activeConv?.userType === 'brand' ? `/brand/${selectedConversation}` : `/creators/${selectedConversation}`;

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  for (const msg of conversationMessages) {
    const dateKey = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    let group = groupedMessages.find(g => g.date === dateKey);
    if (!group) { group = { date: dateKey, messages: [] }; groupedMessages.push(group); }
    group.messages.push(msg);
  }

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <NavigationFixed />
      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">

        {/* Sidebar */}
        <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0 ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {/* Sidebar header */}
          <div className="p-4 border-b border-gray-100">
            <h1 className="text-xl font-black text-gray-900 mb-3">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9 bg-gray-50 border-gray-200 text-sm"
                data-testid="chat-search"
              />
            </div>
          </div>

          {/* Conversations list */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-7 h-7 text-purple-300" />
                </div>
                <p className="font-semibold text-gray-700 text-sm mb-1">No conversations yet</p>
                <p className="text-xs text-gray-400">
                  {isBrand ? "Invite creators to campaigns to start chatting" : "Join campaigns to message brands"}
                </p>
              </div>
            ) : (
              <div>
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedConversation(conv.userId)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${selectedConversation === conv.userId ? 'bg-purple-50 border-r-2 border-r-purple-500' : ''}`}
                    data-testid={`conversation-${conv.userId}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-12 w-12 ring-2 ring-gray-100">
                        <AvatarImage src={conv.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold text-sm">
                          {conv.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                          {conv.userName}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatMessageTime(conv.lastMessageTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className={`text-xs truncate flex-1 ${conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="flex-shrink-0 bg-purple-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col overflow-hidden ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
          {selectedConversation && activeConv ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
                <button className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setSelectedConversation(null)}>
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <Link href={profileLink}>
                  <div className="relative cursor-pointer">
                    <Avatar className="h-10 w-10 ring-2 ring-purple-100">
                      <AvatarImage src={activeConv.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold text-sm">
                        {activeConv.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={profileLink}>
                    <div className="font-bold text-gray-900 text-sm hover:text-purple-600 cursor-pointer truncate">{activeConv.userName}</div>
                  </Link>
                  <div className="text-xs text-green-500 font-medium flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={profileLink}>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-purple-600">
                      <Info className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {groupedMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-8 h-8 text-purple-300" />
                      </div>
                      <p className="text-gray-600 font-semibold">Start a conversation!</p>
                      <p className="text-xs text-gray-400 mt-1">Say hi to {activeConv.userName}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pb-2">
                    {groupedMessages.map(({ date, messages }) => (
                      <div key={date}>
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full font-medium">{formatDateLabel(date)}</span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                        <div className="space-y-2">
                          {messages.map((msg, idx) => {
                            const isOwn = msg.senderId === (user as any)?.id;
                            const prevMsg = messages[idx - 1];
                            const showAvatar = !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);
                            return (
                              <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                {!isOwn && (
                                  <div className="w-8 flex-shrink-0">
                                    {showAvatar && (
                                      <Avatar className="h-8 w-8 ring-1 ring-gray-100">
                                        <AvatarImage src={activeConv.avatar} />
                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs font-bold">
                                          {activeConv.userName.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                  </div>
                                )}
                                <div className={`max-w-xs lg:max-w-sm xl:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    isOwn
                                      ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-sm'
                                      : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                                  }`}>
                                    {msg.content}
                                  </div>
                                  <div className={`flex items-center gap-1 mt-1 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <span className="text-[10px] text-gray-400">{formatTimestampFull(msg.createdAt)}</span>
                                    {isOwn && (
                                      msg.isRead
                                        ? <CheckCheck className="w-3.5 h-3.5 text-purple-500" />
                                        : <Check className="w-3.5 h-3.5 text-gray-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Input */}
              <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all px-3 py-2">
                  <button className="text-gray-400 hover:text-purple-500 transition-colors p-1 flex-shrink-0">
                    <Smile className="w-5 h-5" />
                  </button>
                  <Input
                    ref={inputRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeConv.userName}...`}
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-sm py-1 px-0"
                    disabled={sendMutation.isPending}
                    data-testid="message-input"
                  />
                  <button className="text-gray-400 hover:text-purple-500 transition-colors p-1 flex-shrink-0" onClick={() => (document.getElementById('chat-files') as HTMLInputElement)?.click()}>
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <Button
                    onClick={handleSend}
                    size="sm"
                    disabled={sendMutation.isPending || !content.trim()}
                    className={`flex-shrink-0 rounded-xl px-3 py-2 transition-all ${content.trim() ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25' : 'bg-gray-200 text-gray-400'}`}
                    data-testid="send-message-btn"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <input id="chat-files" type="file" multiple className="hidden" />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-xs">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mx-auto mb-5">
                  <MessageCircle className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Your Messages</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {isBrand
                    ? "Start a conversation with a creator by visiting their profile"
                    : "Chat with brands after joining their campaigns"}
                </p>
                <Link href={isBrand ? "/creators" : "/campaigns"}>
                  <Button className="mt-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg" data-testid="go-browse-btn">
                    {isBrand ? "Browse Creators" : "Browse Campaigns"}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
