import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Send, Search, Phone, Video, MoreVertical, Paperclip } from "lucide-react";

export default function Messages() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState(1);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const conversations = [
    {
      id: 1,
      name: "TechCorp Marketing",
      lastMessage: "Thanks for completing the app testing task!",
      timestamp: "2m ago",
      unread: 2,
      avatar: null,
      online: true
    },
    {
      id: 2,
      name: "Sarah Chen",
      lastMessage: "How was the event hosting gig?",
      timestamp: "1h ago",
      unread: 0,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=40&h=40&fit=crop&crop=face",
      online: true
    },
    {
      id: 3,
      name: "CryptoTrading Co",
      lastMessage: "New trading campaign available",
      timestamp: "3h ago",
      unread: 1,
      avatar: null,
      online: false
    },
    {
      id: 4,
      name: "Local Events Team",
      lastMessage: "Great work on the community meetup!",
      timestamp: "1d ago",
      unread: 0,
      avatar: null,
      online: false
    },
    {
      id: 5,
      name: "Alex Rodriguez",
      lastMessage: "Want to collaborate on the next campaign?",
      timestamp: "2d ago",
      unread: 0,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      online: false
    }
  ];

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  const messages = [
    {
      id: 1,
      sender: "TechCorp Marketing",
      content: "Hi! We have a new app testing opportunity that matches your profile perfectly.",
      timestamp: "10:30 AM",
      isCurrentUser: false
    },
    {
      id: 2,
      sender: "You",
      content: "Sounds interesting! Could you share more details about the testing requirements?",
      timestamp: "10:32 AM",
      isCurrentUser: true
    },
    {
      id: 3,
      sender: "TechCorp Marketing",
      content: "It's a fintech mobile app that needs comprehensive testing across different devices. The task pays $45 and should take about 3-4 hours.",
      timestamp: "10:35 AM",
      isCurrentUser: false
    },
    {
      id: 4,
      sender: "You",
      content: "Perfect! I have experience with fintech apps. When do you need this completed?",
      timestamp: "10:37 AM",
      isCurrentUser: true
    },
    {
      id: 5,
      sender: "TechCorp Marketing",
      content: "By Friday would be ideal. I'll send you the testing guidelines and access credentials.",
      timestamp: "10:40 AM",
      isCurrentUser: false
    },
    {
      id: 6,
      sender: "TechCorp Marketing",
      content: "Thanks for completing the app testing task! Your feedback was incredibly detailed and helpful.",
      timestamp: "2:15 PM",
      isCurrentUser: false
    }
  ];

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // In real app, this would send to API
      console.log("Sending message:", newMessage);
      setNewMessage("");
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Messages</span>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer border-l-4 transition-colors ${
                      selectedConversation === conversation.id
                        ? "bg-blue-50 border-l-blue-500"
                        : "border-l-transparent"
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conversation.avatar} alt={conversation.name} />
                        <AvatarFallback>
                          {conversation.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.name}
                        </h3>
                        <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                    </div>
                    
                    {conversation.unread > 0 && (
                      <div className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unread}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {currentConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={currentConversation.avatar} alt={currentConversation.name} />
                          <AvatarFallback>
                            {currentConversation.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {currentConversation.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{currentConversation.name}</h3>
                        <p className="text-sm text-gray-500">
                          {currentConversation.online ? "Online" : "Last seen recently"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isCurrentUser
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {message.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p>Choose a conversation from the sidebar to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}