import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, ArrowLeft, Paperclip, User, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";

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
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    userType: 'brand' | 'creator';
    username?: string;
    profileImageUrl?: string;
  };
  receiver?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    userType: 'brand' | 'creator';
    username?: string;
    profileImageUrl?: string;
  };
}

interface Conversation {
  userId: string;
  userName: string;
  userType: 'brand' | 'creator';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatar?: string;
}

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
});

export default function ChatPage() {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user data
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  const isBrand = (user as any)?.userType === 'brand';

  // Fetch all messages
  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    retry: false,
  });

  // Form for new message
  const messageForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
    },
  });

  // Group messages into conversations
  useEffect(() => {
    if (!allMessages.length || !user) return;

    const conversationMap = new Map<string, Conversation>();

    allMessages.forEach((message) => {
      const currentUserId = (user as any).id;
      const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
      const otherUser = message.senderId === currentUserId ? message.receiver : message.sender;
      
      if (!conversationMap.has(otherUserId)) {
        const displayName = otherUser?.userType === 'brand' 
          ? (otherUser?.companyName || `${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.trim() || 'Unknown Brand')
          : (`${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.trim() || otherUser?.username || 'Unknown User');

        conversationMap.set(otherUserId, {
          userId: otherUserId,
          userName: displayName || 'Unknown User',
          userType: otherUser?.userType || 'creator',
          lastMessage: message.content,
          lastMessageTime: message.createdAt,
          unreadCount: message.isRead ? 0 : 1,
          avatar: otherUser?.profileImageUrl,
        });
      } else {
        const conv = conversationMap.get(otherUserId)!;
        if (new Date(message.createdAt) > new Date(conv.lastMessageTime)) {
          conv.lastMessage = message.content;
          conv.lastMessageTime = message.createdAt;
        }
        if (!message.isRead && message.receiverId === (user as any).id) {
          conv.unreadCount++;
        }
      }
    });

    const sortedConversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    setConversations(sortedConversations);
  }, [allMessages, user]);

  // Get messages for selected conversation
  const conversationMessages = selectedConversation 
    ? allMessages.filter(msg => 
        (msg.senderId === selectedConversation || msg.receiverId === selectedConversation) &&
        (msg.senderId === (user as any)?.id || msg.receiverId === (user as any)?.id)
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; files?: FileList }) => {
      const formData = new FormData();
      formData.append('content', data.content);
      formData.append('receiverId', selectedConversation!);
      formData.append('subject', 'Chat Message');
      formData.append('messageType', 'chat');

      if (data.files) {
        Array.from(data.files).forEach(file => {
          formData.append('attachments', file);
        });
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      messageForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSendMessage = (data: z.infer<typeof messageSchema>) => {
    if (!selectedConversation) return;
    
    const fileInput = document.getElementById('message-files') as HTMLInputElement;
    const files = fileInput?.files || undefined;
    
    sendMessageMutation.mutate({ ...data, files });
  };

  if (messagesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex h-screen">
          {/* Conversations List */}
          <div className={`w-full md:w-1/3 bg-white border-r border-gray-200 ${selectedConversation ? 'hidden md:block' : 'block'}`}>
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
              <p className="text-sm text-gray-600">
                {isBrand ? "Chat with creators" : "Chat with brands"}
              </p>
            </div>
            
            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                  <p className="text-gray-500">Start chatting with {isBrand ? 'creators' : 'brands'}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {conversations.map((conv) => (
                    <div
                      key={conv.userId}
                      onClick={() => setSelectedConversation(conv.userId)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation === conv.userId ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.avatar} />
                          <AvatarFallback>
                            {conv.userType === 'brand' ? '🏢' : '👤'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conv.userName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(conv.lastMessageTime), "MMM d")}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {conv.lastMessage}
                          </p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-blue-500 text-white text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${selectedConversation ? 'block' : 'hidden md:flex'}`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 bg-white border-b border-gray-200 flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {(() => {
                    const conv = conversations.find(c => c.userId === selectedConversation);
                    const profileLink = conv?.userType === 'brand' ? `/brand/${selectedConversation}` : `/creators/${selectedConversation}`;
                    return (
                      <>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={conv?.avatar} />
                          <AvatarFallback>
                            {conv?.userType === 'brand' ? '🏢' : (conv?.userName?.charAt(0) || '👤')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <a href={profileLink} className="font-medium text-gray-900 hover:underline">
                            {conv?.userName || 'Unknown User'}
                          </a>
                          <p className="text-xs text-gray-500">
                            {conv?.userType === 'brand' ? 'Brand' : 'Creator'} · <a href={profileLink} className="text-blue-500 hover:underline">View profile</a>
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4 space-y-4">
                  {conversationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === (user as any)?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === (user as any)?.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderId === (user as any)?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {format(new Date(message.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 bg-white border-t border-gray-200">
                  <Form {...messageForm}>
                    <form onSubmit={messageForm.handleSubmit(onSendMessage)} className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => {
                          const fileInput = document.getElementById('message-files') as HTMLInputElement;
                          fileInput?.click();
                        }}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <FormField
                        control={messageForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Type a message..."
                                className="border-0 bg-gray-100 focus:bg-white"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    messageForm.handleSubmit(onSendMessage)();
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={sendMessageMutation.isPending}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </Form>
                  <input
                    id="message-files"
                    type="file"
                    multiple
                    className="hidden"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                  <p className="text-gray-500">Choose a conversation from the sidebar to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}