import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Flag } from "lucide-react";

const REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "scam", label: "Scam or fraud" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "copyright", label: "Copyright violation" },
  { value: "other", label: "Other" },
];

interface ReportDialogProps {
  contentType: "campaign" | "product" | "course" | "user" | "post" | "listing";
  contentId: string;
  trigger?: React.ReactNode;
}

export function ReportDialog({ contentType, contentId, trigger }: ReportDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports", { contentType, contentId, reason, details });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report submitted", description: "Thanks — our team will review it shortly." });
      setOpen(false); setDetails(""); setReason("spam");
    },
    onError: (err: any) => toast({ title: "Couldn't submit report", description: err?.message || "Try again", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="button-open-report"><Flag className="w-4 h-4 mr-2" /> Report</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report this {contentType}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium">Why are you reporting this?</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="mt-2 space-y-1.5">
              {REASONS.map(r => (
                <label key={r.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value={r.value} id={`r-${r.value}`} data-testid={`radio-reason-${r.value}`} />
                  <span className="text-sm text-slate-700">{r.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label className="text-sm font-medium">Additional details (optional)</Label>
            <Textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Tell us more so we can investigate." rows={4} className="mt-1.5" data-testid="input-report-details" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="bg-rose-600 hover:bg-rose-700 text-white" data-testid="button-submit-report">
            {submitMutation.isPending ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
