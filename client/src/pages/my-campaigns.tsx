import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NavigationFixed } from "@/components/ui/navigation-fixed";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Trophy, Upload, Send, ExternalLink, CheckCircle2, Clock, Star } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
    completed: "bg-green-100 text-green-800",
    active: "bg-purple-100 text-purple-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function SubmitWorkDialog({ participation }: { participation: any }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [notes, setNotes] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/campaigns/${participation.campaignId}/participate/${participation.id}`, {
        deliverableUrl,
        notes,
        status: 'completed',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-campaigns'] });
      toast({ title: "Work submitted! ✅", description: "The brand will review your submission." });
      setOpen(false);
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700" data-testid={`submit-work-${participation.id}`}>
          <Upload className="w-4 h-4 mr-2" /> Submit Work
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Your Work</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Deliverable URL *</Label>
            <Input
              value={deliverableUrl}
              onChange={e => setDeliverableUrl(e.target.value)}
              placeholder="https://instagram.com/p/... or YouTube link"
              data-testid="deliverable-url"
            />
            <p className="text-xs text-gray-500 mt-1">Link to your post, video, or content</p>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything you'd like to tell the brand..."
              rows={3}
              data-testid="submit-notes"
            />
          </div>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!deliverableUrl || submitMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
            data-testid="confirm-submit-work"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MyCampaignsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "pending">("active");

  const { data: participations = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/my-campaigns'],
  });

  const filtered = participations.filter((p: any) => {
    if (activeTab === "active") return p.status === 'approved' || p.status === 'active';
    if (activeTab === "completed") return p.status === 'completed';
    return p.status === 'pending';
  });

  const activeCount = participations.filter((p: any) => p.status === 'approved' || p.status === 'active').length;
  const completedCount = participations.filter((p: any) => p.status === 'completed').length;
  const pendingCount = participations.filter((p: any) => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" /> My Campaigns
          </h1>
          <p className="text-gray-500 mt-1">Track your campaign participations and submit deliverables</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Active", count: activeCount, color: "from-purple-500 to-blue-500", tab: "active" as const },
            { label: "Completed", count: completedCount, color: "from-green-500 to-teal-500", tab: "completed" as const },
            { label: "Pending", count: pendingCount, color: "from-yellow-500 to-orange-500", tab: "pending" as const },
          ].map(({ label, count, color, tab }) => (
            <button
              key={label}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl p-4 bg-gradient-to-br ${color} text-white text-left transition-opacity ${activeTab === tab ? 'opacity-100 ring-4 ring-white shadow-lg' : 'opacity-70 hover:opacity-90'}`}
              data-testid={`tab-${tab}`}
            >
              <div className="text-3xl font-bold">{count}</div>
              <div className="text-sm text-white/80">{label}</div>
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading your campaigns...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No {activeTab} campaigns</p>
              {activeTab === "active" && (
                <p className="text-gray-400 text-sm mt-1">
                  <Link href="/campaigns" className="text-purple-600 hover:underline">Browse campaigns</Link> to find opportunities
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((p: any) => (
              <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`campaign-card-${p.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Campaign Image */}
                      {p.campaign?.featuredImage && (
                        <img
                          src={p.campaign.featuredImage}
                          alt={p.campaign?.title}
                          className="w-full h-32 object-cover rounded-xl mb-4"
                        />
                      )}

                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg truncate">
                            {p.campaign?.title || `Campaign #${p.campaignId?.slice(-6)}`}
                          </h3>
                          {p.campaign?.brand && (
                            <p className="text-sm text-gray-500">
                              by {p.campaign.brand?.companyName || `${p.campaign.brand?.firstName} ${p.campaign.brand?.lastName}`}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={p.status} />
                      </div>

                      {p.campaign?.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{p.campaign.description}</p>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        {p.campaign?.budget && (
                          <span className="font-semibold text-green-700">${parseFloat(p.campaign.budget).toFixed(2)} budget</span>
                        )}
                        {p.campaign?.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due {new Date(p.campaign.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {p.createdAt && (
                          <span>Joined {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</span>
                        )}
                      </div>

                      {p.deliverableUrl && (
                        <a
                          href={p.deliverableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-500 hover:underline text-sm mt-3"
                        >
                          <ExternalLink className="w-3 h-3" /> View Submission
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link href={`/campaigns/${p.campaignId}`}>
                        <Button size="sm" variant="outline" data-testid={`view-campaign-${p.id}`}>
                          <ExternalLink className="w-4 h-4 mr-1" /> View
                        </Button>
                      </Link>
                      {(p.status === 'approved' || p.status === 'active') && !p.deliverableUrl && (
                        <SubmitWorkDialog participation={p} />
                      )}
                      {p.status === 'completed' && (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Done
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
