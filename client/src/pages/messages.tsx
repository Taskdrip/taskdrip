import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Upload, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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
}

interface TaskSubmission {
  id: string;
  campaignId: string;
  participationId: string;
  title: string;
  description: string;
  status: string;
  proofUrls?: string[];
  screenshots?: any[];
  reviewNotes?: string;
  submittedAt: string;
}

interface Campaign {
  id: string;
  title: string;
  brandName: string;
  reward: string;
}

const messageSchema = z.object({
  campaignId: z.string(),
  receiverId: z.string(),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message content is required"),
  messageType: z.string().optional(),
});

const taskSubmissionSchema = z.object({
  campaignId: z.string(),
  participationId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  proofUrls: z.string().optional(),
});

export default function MessagesPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<"messages" | "submissions">("messages");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSubmitTaskOpen, setIsSubmitTaskOpen] = useState(false);

  // Fetch user messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    retry: false,
  });

  // Fetch user task submissions
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<TaskSubmission[]>({
    queryKey: ["/api/task-submissions"],
    retry: false,
  });

  // Fetch user participations to get campaigns they can message about
  const { data: participations = [] } = useQuery({
    queryKey: ["/api/participations"],
    retry: false,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof messageSchema> & { files?: FileList }) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'files' && value !== undefined) {
          formData.append(key, value);
        }
      });
      
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
      toast({
        title: "Message sent!",
        description: "Your message has been sent successfully.",
      });
      setIsComposeOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit task mutation
  const submitTaskMutation = useMutation({
    mutationFn: async (data: z.infer<typeof taskSubmissionSchema> & { files?: FileList }) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'files' && value !== undefined) {
          formData.append(key, value);
        }
      });
      
      if (data.files) {
        Array.from(data.files).forEach(file => {
          formData.append('files', file);
        });
      }

      const res = await fetch('/api/task-submissions', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-submissions"] });
      toast({
        title: "Task submitted!",
        description: "Your task submission has been sent for review.",
      });
      setIsSubmitTaskOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const messageForm = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      campaignId: "",
      receiverId: "",
      subject: "",
      content: "",
      messageType: "general",
    },
  });

  const taskForm = useForm<z.infer<typeof taskSubmissionSchema>>({
    resolver: zodResolver(taskSubmissionSchema),
    defaultValues: {
      campaignId: "",
      participationId: "",
      title: "",
      description: "",
      proofUrls: "",
    },
  });

  const onSendMessage = (data: z.infer<typeof messageSchema>) => {
    const files = (document.getElementById('message-files') as HTMLInputElement)?.files;
    sendMessageMutation.mutate({ ...data, files: files || undefined });
  };

  const onSubmitTask = (data: z.infer<typeof taskSubmissionSchema>) => {
    const files = (document.getElementById('task-files') as HTMLInputElement)?.files;
    const proofUrls = data.proofUrls ? data.proofUrls.split('\n').filter(url => url.trim()) : [];
    submitTaskMutation.mutate({ 
      ...data, 
      proofUrls: JSON.stringify(proofUrls),
      files: files || undefined 
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'under_review':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Messages & Tasks</h1>
            <p className="text-gray-600 mt-2">Communicate with brands and submit your completed work</p>
          </div>
          <div className="flex gap-4">
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Compose Message
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Send Message to Brand</DialogTitle>
                  <DialogDescription>
                    Send a message about one of your active campaigns
                  </DialogDescription>
                </DialogHeader>
                <Form {...messageForm}>
                  <form onSubmit={messageForm.handleSubmit(onSendMessage)} className="space-y-4">
                    <FormField
                      control={messageForm.control}
                      name="campaignId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full p-2 border rounded-md">
                              <option value="">Select campaign...</option>
                              {participations.map((p: any) => (
                                <option key={p.campaignId} value={p.campaignId}>
                                  {p.campaign?.title || p.campaignId}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={messageForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Message subject..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={messageForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Type your message..." 
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <label className="block text-sm font-medium mb-2">Attachments</label>
                      <input
                        id="message-files"
                        type="file"
                        multiple
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsComposeOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={sendMessageMutation.isPending}>
                        {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isSubmitTaskOpen} onOpenChange={setIsSubmitTaskOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Submit Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Submit Completed Task</DialogTitle>
                  <DialogDescription>
                    Submit proof of your completed campaign work for review
                  </DialogDescription>
                </DialogHeader>
                <Form {...taskForm}>
                  <form onSubmit={taskForm.handleSubmit(onSubmitTask)} className="space-y-4">
                    <FormField
                      control={taskForm.control}
                      name="campaignId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign</FormLabel>
                          <FormControl>
                            <select 
                              {...field} 
                              className="w-full p-2 border rounded-md"
                              onChange={(e) => {
                                field.onChange(e);
                                const participation = participations.find((p: any) => p.campaignId === e.target.value);
                                if (participation) {
                                  taskForm.setValue('participationId', participation.id);
                                }
                              }}
                            >
                              <option value="">Select campaign...</option>
                              {participations.map((p: any) => (
                                <option key={p.campaignId} value={p.campaignId}>
                                  {p.campaign?.title || p.campaignId}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={taskForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Submission Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Brief title for your submission..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={taskForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe what you completed and how it meets the campaign requirements..." 
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={taskForm.control}
                      name="proofUrls"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proof URLs</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add links to your posts, videos, or other proof (one per line)..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <label className="block text-sm font-medium mb-2">Screenshots & Files</label>
                      <input
                        id="task-files"
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        className="w-full p-2 border rounded-md"
                      />
                      <p className="text-sm text-gray-500 mt-1">Upload screenshots, documents, or other proof files</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsSubmitTaskOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitTaskMutation.isPending}>
                        {submitTaskMutation.isPending ? "Submitting..." : "Submit Task"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setSelectedTab("messages")}
            className={`px-6 py-3 font-medium ${
              selectedTab === "messages"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Messages ({messages.length})
          </button>
          <button
            onClick={() => setSelectedTab("submissions")}
            className={`px-6 py-3 font-medium ${
              selectedTab === "submissions"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Task Submissions ({submissions.length})
          </button>
        </div>

        {/* Messages Tab */}
        {selectedTab === "messages" && (
          <div className="space-y-4">
            {messagesLoading ? (
              <div className="text-center py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-500 mb-4">Start a conversation with brands about your campaigns</p>
                <Button onClick={() => setIsComposeOpen(true)}>Send Your First Message</Button>
              </div>
            ) : (
              messages.map((message) => (
                <Card key={message.id} className={`${!message.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{message.subject}</CardTitle>
                        <CardDescription>
                          {format(new Date(message.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </CardDescription>
                      </div>
                      {!message.isRead && (
                        <Badge variant="secondary">Unread</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Attachments:</h4>
                        <div className="space-y-1">
                          {message.attachments.map((attachment: any, idx: number) => (
                            <div key={idx} className="text-sm text-blue-600 hover:underline">
                              📎 {attachment.filename}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Task Submissions Tab */}
        {selectedTab === "submissions" && (
          <div className="space-y-4">
            {submissionsLoading ? (
              <div className="text-center py-8">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No task submissions yet</h3>
                <p className="text-gray-500 mb-4">Submit your completed campaign work for review and payment</p>
                <Button onClick={() => setIsSubmitTaskOpen(true)}>Submit Your First Task</Button>
              </div>
            ) : (
              submissions.map((submission) => (
                <Card key={submission.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(submission.status)}
                          <CardTitle className="text-lg">{submission.title}</CardTitle>
                        </div>
                        <CardDescription>
                          Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(submission.status)}>
                        {submission.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">{submission.description}</p>
                    
                    {submission.proofUrls && submission.proofUrls.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Proof URLs:</h4>
                        <div className="space-y-1">
                          {submission.proofUrls.map((url: string, idx: number) => (
                            <a 
                              key={idx} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline block"
                            >
                              🔗 {url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {submission.screenshots && submission.screenshots.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Screenshots:</h4>
                        <div className="text-sm text-gray-600">
                          {submission.screenshots.length} file(s) uploaded
                        </div>
                      </div>
                    )}

                    {submission.reviewNotes && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Review Notes:</h4>
                        <p className="text-gray-700">{submission.reviewNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}