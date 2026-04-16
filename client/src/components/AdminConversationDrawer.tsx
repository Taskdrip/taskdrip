import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare, Users, Clock, ExternalLink, Shield,
  AlertTriangle, CheckCircle, Briefcase, User,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  type: "campaign" | "direct_hire";
  id: string | null;
  title?: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(first?: string, last?: string) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    active: { label: "Active", className: "bg-green-100 text-green-800" },
    completed: { label: "Completed", className: "bg-blue-100 text-blue-800" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
    cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700" },
    work_submitted: { label: "Work Submitted", className: "bg-purple-100 text-purple-800" },
    payment_submitted: { label: "Payment Submitted", className: "bg-indigo-100 text-indigo-800" },
    accepted: { label: "Accepted", className: "bg-teal-100 text-teal-800" },
    approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  };
  const s = map[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.className}`}>{s.label}</span>;
}

function MessageBubble({ msg, viewerId }: { msg: any; viewerId: string }) {
  const isSenderAdmin = msg.sender?.userType === "admin";
  const isSenderBrand = msg.sender?.userType === "brand";
  const senderLabel = isSenderAdmin ? "Admin" : isSenderBrand ? "Brand" : "Influencer";

  return (
    <div className="flex gap-3 group py-2">
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarFallback className={`text-xs font-bold ${isSenderAdmin ? "bg-purple-100 text-purple-700" : isSenderBrand ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
          {initials(msg.sender?.firstName, msg.sender?.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-gray-900">{msg.sender?.firstName} {msg.sender?.lastName}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isSenderAdmin ? "bg-purple-100 text-purple-700" : isSenderBrand ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
            {senderLabel}
          </span>
          <span className="text-[10px] text-gray-400">{timeAgo(msg.createdAt)}</span>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl rounded-tl-sm px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
          {msg.content}
        </div>
        {msg.subject && (
          <p className="text-[10px] text-gray-400 mt-1">Subject: {msg.subject}</p>
        )}
      </div>
    </div>
  );
}

export function AdminConversationDrawer({ open, onClose, type, id, title }: Props) {
  const [activeTab, setActiveTab] = useState("messages");

  const { data: campaignThread, isLoading: loadingCampaign } = useQuery<any>({
    queryKey: ["/api/admin/campaigns", id, "thread"],
    queryFn: () => fetch(`/api/admin/campaigns/${id}/thread`).then((r) => r.json()),
    enabled: open && type === "campaign" && !!id,
  });

  const { data: dhThread, isLoading: loadingDH } = useQuery<any>({
    queryKey: ["/api/admin/direct-hire", id, "thread"],
    queryFn: () => fetch(`/api/admin/direct-hire/${id}/thread`).then((r) => r.json()),
    enabled: open && type === "direct_hire" && !!id,
  });

  const isLoading = type === "campaign" ? loadingCampaign : loadingDH;
  const thread = type === "campaign" ? campaignThread : dhThread;

  const messages = (thread?.messages || []).sort((a: any, b: any) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const participations = thread?.participations || [];
  const campaign = thread?.campaign;
  const offer = thread?.offer;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b bg-gray-50">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${type === "campaign" ? "bg-violet-100" : "bg-blue-100"}`}>
              {type === "campaign" ? <Briefcase className="w-5 h-5 text-violet-600" /> : <Users className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-bold text-gray-900 truncate">
                {title || (type === "campaign" ? campaign?.title : offer?.title) || "Conversation Thread"}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-2 py-0">
                  {type === "campaign" ? "Campaign Thread" : "Direct Hire Thread"}
                </Badge>
                {(campaign?.status || offer?.status) && <StatusBadge status={campaign?.status || offer?.status} />}
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-purple-400" /> Admin View
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading thread...</p>
            </div>
          </div>
        ) : !thread ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No thread data found</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-3 mb-0 grid grid-cols-2 h-8">
              <TabsTrigger value="messages" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" /> Messages ({messages.length})
              </TabsTrigger>
              <TabsTrigger value="participants" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {type === "campaign" ? `Participants (${participations.length})` : "Parties (2)"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="messages" className="flex-1 overflow-hidden mt-0">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                  <MessageSquare className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No messages in this thread yet</p>
                  <p className="text-xs text-gray-400">Messages between brand and influencer will appear here</p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="px-4 py-3 space-y-1">
                    {messages.map((msg: any, i: number) => {
                      const prevMsg = messages[i - 1];
                      const showDateDivider = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
                      return (
                        <div key={msg.id}>
                          {showDateDivider && (
                            <div className="flex items-center gap-3 my-3">
                              <Separator className="flex-1" />
                              <span className="text-[10px] text-gray-400 font-medium shrink-0">
                                {new Date(msg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              <Separator className="flex-1" />
                            </div>
                          )}
                          <MessageBubble msg={msg} viewerId="admin" />
                        </div>
                      );
                    })}
                    <div className="pt-2 pb-4 text-center">
                      <span className="text-[10px] text-gray-300 bg-gray-50 px-3 py-1 rounded-full border">
                        End of thread · Admin read-only view
                      </span>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="participants" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="px-4 py-3 space-y-3">
                  {type === "campaign" ? (
                    <>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Campaign Participants</div>
                      {participations.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">No participants yet</div>
                      ) : participations.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={p.user?.profileImageUrl} />
                            <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
                              {initials(p.user?.firstName, p.user?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{p.user?.firstName} {p.user?.lastName}</p>
                            <p className="text-xs text-gray-500">{p.user?.email}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge status={p.status} />
                            {p.user?.creatorTier && (
                              <span className="text-[10px] text-gray-400">{p.user.creatorTier}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Direct Hire Parties</div>
                      {[
                        { label: "Brand", data: offer?.brand, color: "bg-blue-100 text-blue-700" },
                        { label: "Influencer", data: offer?.influencer, color: "bg-orange-100 text-orange-700" },
                      ].map(({ label, data, color }) => (
                        <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className={`${color} text-xs font-bold`}>
                              {initials(data?.firstName, data?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {data?.firstName} {data?.lastName}
                              {data?.companyName ? ` (${data.companyName})` : ""}
                            </p>
                            <p className="text-xs text-gray-500">{data?.email}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${color}`}>{label}</span>
                        </div>
                      ))}
                      {offer && (
                        <div className="mt-4 p-3 bg-violet-50 rounded-xl border border-violet-100">
                          <p className="text-xs font-semibold text-violet-700 mb-2">Offer Details</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div><span className="text-gray-400">Budget:</span> ${parseFloat(offer.budget || 0).toFixed(2)}</div>
                            <div><span className="text-gray-400">Payout:</span> ${parseFloat(offer.influencerPayout || 0).toFixed(2)}</div>
                            <div><span className="text-gray-400">Status:</span> <StatusBadge status={offer.status} /></div>
                            <div><span className="text-gray-400">Deadline:</span> {offer.deadline ? new Date(offer.deadline).toLocaleDateString() : "N/A"}</div>
                          </div>
                          {offer.workSubmissionUrl && (
                            <a href={offer.workSubmissionUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-violet-600 hover:underline">
                              <ExternalLink className="w-3 h-3" /> View Submitted Work
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
