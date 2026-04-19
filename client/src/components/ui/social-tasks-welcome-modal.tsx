import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink, Zap, X } from "lucide-react";

const STORAGE_KEY = "taskdrip_show_social_tasks_modal";

export function SocialTasksWelcomeModal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const flag = localStorage.getItem(STORAGE_KEY);
    if (flag === "1") {
      setOpen(true);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/social-quick-tasks"],
    enabled: open,
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", `/api/social-quick-tasks/${taskId}/complete`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-quick-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      toast({ title: `+${data?.pointsAwarded || 0} $TDRIP earned!`, description: "Keep completing tasks to earn more." });
    },
    onError: (err: any) => {
      toast({ title: "Already completed or error", variant: "destructive" });
    },
  });

  const activeTasks = (tasks as any[]).filter((t: any) => t.isActive);
  const completedCount = activeTasks.filter((t: any) => t.completed).length;
  const totalPts = activeTasks.filter((t: any) => !t.completed).reduce((a: number, t: any) => a + (t.pointsReward || 0), 0);

  if (!user || (user as any).userType === "brand") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg bg-gray-950 border border-violet-900/60 text-white shadow-2xl shadow-violet-900/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Zap className="h-5 w-5 text-violet-400" />
            Welcome to Taskdrip! Earn $TDRIP Now
          </DialogTitle>
        </DialogHeader>

        {/* Header banner */}
        <div className="bg-gradient-to-r from-violet-900/50 to-purple-900/50 rounded-xl p-4 border border-violet-800/50 mb-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            Complete these quick social tasks to earn <span className="text-violet-300 font-bold">$TDRIP points</span> — held for the upcoming native token airdrop.
          </p>
          {totalPts > 0 && (
            <p className="text-violet-400 font-bold mt-1 text-sm">+{totalPts} pts available to earn right now</p>
          )}
        </div>

        {/* Task list */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {activeTasks.length === 0 && (
            <p className="text-gray-500 text-center py-6 text-sm">No tasks available right now. Check back soon!</p>
          )}
          {activeTasks.map((task: any) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
                task.completed
                  ? "bg-emerald-950/40 border-emerald-800/50 opacity-75"
                  : "bg-gray-900 border-gray-800 hover:border-violet-700/50"
              }`}
              data-testid={`welcome-task-${task.id}`}
            >
              <span className="text-2xl flex-shrink-0">{task.iconEmoji || "🔗"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{task.label}</span>
                  <Badge className="bg-violet-900/60 text-violet-300 text-xs">+{task.pointsReward} pts</Badge>
                </div>
                {task.description && (
                  <p className="text-gray-500 text-xs mt-0.5 truncate">{task.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {task.completed ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : (
                  <>
                    <a
                      href={task.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Open link"
                      data-testid={`open-task-link-${task.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-7 px-3"
                      onClick={() => completeMutation.mutate(task.id)}
                      disabled={completeMutation.isPending}
                      data-testid={`complete-task-btn-${task.id}`}
                    >
                      Done
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800 mt-2">
          <p className="text-gray-500 text-xs">
            {completedCount}/{activeTasks.length} completed
          </p>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:text-white text-sm"
            onClick={() => setOpen(false)}
            data-testid="close-welcome-modal"
          >
            {completedCount === activeTasks.length && activeTasks.length > 0 ? "🎉 Done!" : "Skip for now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function triggerSocialTasksModal() {
  localStorage.setItem(STORAGE_KEY, "1");
}
