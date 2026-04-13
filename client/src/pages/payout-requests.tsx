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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { DollarSign, MessageCircle, Clock, CheckCircle2, XCircle, Plus, Send, ChevronDown } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-purple-100 text-purple-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

function ChatThread({ requestId }: { requestId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [msg, setMsg] = useState("");

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: [`/api/payout-requests/${requestId}/messages`],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/payout-requests/${requestId}/messages`, { content: msg });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payout-requests/${requestId}/messages`] });
      setMsg("");
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-3 space-y-3 max-h-64">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">No messages yet. Start the conversation!</p>
        )}
        {messages.map((m: any) => {
          const isMine = m.senderId === (user as any)?.id;
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
              <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${isMine ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                {m.content}
                <div className={`text-xs mt-1 ${isMine ? 'text-purple-200' : 'text-gray-400'}`}>
                  {m.createdAt ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true }) : ""}
                </div>
              </div>
            </div>
          );
        })}
      </ScrollArea>
      <div className="flex gap-2 p-2 border-t">
        <Input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); msg.trim() && sendMutation.mutate(); }}}
          data-testid="payout-chat-input"
        />
        <Button
          size="sm"
          onClick={() => sendMutation.mutate()}
          disabled={!msg.trim() || sendMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="payout-chat-send"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function PayoutRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ amount: "", walletAddress: "", network: "USDT-TRC20", notes: "" });

  const userType = (user as any)?.userType;

  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/payout-requests'],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", '/api/payout-requests', form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payout-requests'] });
      toast({ title: "Payout request submitted! 💸" });
      setNewDialogOpen(false);
      setForm({ amount: "", walletAddress: "", network: "USDT-TRC20", notes: "" });
    },
    onError: () => toast({ title: "Failed to submit request", variant: "destructive" }),
  });

  const adminUpdateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/payout-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payout-requests'] });
      toast({ title: "Status updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              Payout Requests
            </h1>
            <p className="text-gray-500 mt-1">Request and track your earnings withdrawals</p>
          </div>

          {userType !== 'admin' && (
            <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700" data-testid="new-payout-btn">
                  <Plus className="w-4 h-4 mr-2" /> Request Payout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Request a Payout</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Amount (USD) *</Label>
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="e.g. 50.00"
                      min="10"
                      data-testid="payout-amount"
                    />
                  </div>
                  <div>
                    <Label>Network *</Label>
                    <Select value={form.network} onValueChange={v => setForm(f => ({ ...f, network: v }))}>
                      <SelectTrigger data-testid="payout-network">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDT-TRC20">USDT TRC-20 · Tron Network</SelectItem>
                        <SelectItem value="USDT-BEP20">USDT BEP-20 · BNB Chain</SelectItem>
                        <SelectItem value="USDT-ERC20">USDT ERC-20 · Ethereum Network</SelectItem>
                        <SelectItem value="USDT-TON">USDT · TON Network</SelectItem>
                        <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Wallet Address *</Label>
                    <Input
                      value={form.walletAddress}
                      onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))}
                      placeholder="Your crypto wallet address"
                      data-testid="payout-wallet"
                    />
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Any additional information..."
                      rows={3}
                      data-testid="payout-notes"
                    />
                  </div>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!form.amount || !form.walletAddress || createMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                    data-testid="submit-payout-btn"
                  >
                    {createMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading payout requests...</div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No payout requests yet</p>
              <p className="text-gray-400 text-sm">Complete campaigns and request your earnings!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((req: any) => (
              <Card key={req.id} className="overflow-hidden" data-testid={`payout-card-${req.id}`}>
                <CardContent className="p-0">
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">${parseFloat(req.amount || '0').toFixed(2)}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span>{req.network}</span>
                            <span>·</span>
                            <Clock className="w-3 h-3" />
                            {req.createdAt ? formatDistanceToNow(new Date(req.createdAt), { addSuffix: true }) : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={req.status} />
                        {userType === 'admin' && req.status === 'pending' && (
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => adminUpdateMutation.mutate({ id: req.id, status: 'approved' })}
                              data-testid={`approve-payout-${req.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => adminUpdateMutation.mutate({ id: req.id, status: 'rejected' })}
                              data-testid={`reject-payout-${req.id}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === req.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {req.walletAddress && (
                      <div className="mt-3 text-xs text-gray-400 font-mono bg-gray-50 px-3 py-2 rounded-lg break-all">
                        {req.walletAddress}
                      </div>
                    )}
                    {req.notes && (
                      <div className="mt-2 text-sm text-gray-600">{req.notes}</div>
                    )}
                  </div>

                  {/* Chat Thread */}
                  {expandedId === req.id && (
                    <div className="border-t bg-gray-50">
                      <div className="flex items-center gap-2 px-5 py-3 border-b bg-white">
                        <MessageCircle className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-sm text-gray-900">Support Chat</span>
                      </div>
                      <ChatThread requestId={req.id} />
                    </div>
                  )}
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
