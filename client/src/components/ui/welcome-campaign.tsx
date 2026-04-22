import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, ExternalLink, Rocket, Zap, Sparkles, Loader2 } from "lucide-react";
import { SiTelegram, SiX, SiInstagram, SiYoutube, SiWhatsapp } from "react-icons/si";
import { Link } from "wouter";

const ICON_MAP: Record<string, any> = {
  telegram: SiTelegram,
  twitter: SiX,
  instagram: SiInstagram,
  youtube: SiYoutube,
  whatsapp: SiWhatsapp,
  profile: null,
};

const COLOR_MAP: Record<string, string> = {
  telegram: "text-[#229ED9]",
  twitter: "text-gray-800",
  instagram: "text-[#E1306C]",
  youtube: "text-[#FF0000]",
  whatsapp: "text-[#25D366]",
  profile: "text-purple-600",
};

export function WelcomeCampaign() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Tracks per-task UI state: 'idle' | 'opened' (user clicked the link, now needs to confirm)
  const [opened, setOpened] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/welcome-campaign"],
    enabled: !!user,
  });

  const completeMutation = useMutation({
    mutationFn: async (taskKey: string) => {
      const res = await apiRequest("POST", `/api/welcome-campaign/complete/${taskKey}`);
      return res.json();
    },
    onSuccess: (resp, taskKey) => {
      if (resp?.alreadyDone) {
        toast({ title: "Already completed", description: "You already did this task." });
      } else {
        const pts = resp?.pointsAwarded || resp?.points || data?.tasks?.find((t: any) => t.key === taskKey)?.points;
        toast({
          title: "🎉 Points added!",
          description: pts ? `+${pts} $TDRIP credited to your wallet.` : "Your $TDRIP balance was updated.",
        });
      }
      setOpened((prev) => { const n = { ...prev }; delete n[taskKey]; return n; });
      queryClient.invalidateQueries({ queryKey: ["/api/welcome-campaign"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => toast({ title: "Couldn't credit points", description: "Please try again.", variant: "destructive" }),
  });

  const handleOpenAction = (task: any) => {
    if (task.completed) return;
    if (task.url?.startsWith("/")) return;
    window.open(task.url, "_blank", "noopener,noreferrer");
    setOpened((prev) => ({ ...prev, [task.key]: true }));
  };

  const handleConfirm = (task: any) => {
    if (task.completed) return;
    completeMutation.mutate(task.key);
  };

  if (isLoading || !data) return null;

  const { tasks, earned, totalPossible, percent } = data;

  return (
    <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Rocket className="h-5 w-5 text-purple-600" />
            Welcome Campaign
          </CardTitle>
          <Badge className="bg-purple-600 text-white border-0">
            <Zap className="h-3 w-3 mr-1" /> {earned} / {totalPossible} pts earned
          </Badge>
        </div>
        <p className="text-sm text-purple-700 mt-1">
          🚀 Open each link, do the action, then tap <span className="font-semibold">Confirm</span> to claim your $TDRIP.
        </p>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs text-purple-600">
            <span>Progress</span>
            <span>{percent}%</span>
          </div>
          <Progress value={percent} className="h-2 bg-purple-200" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks?.map((task: any) => {
          const Icon = ICON_MAP[task.icon];
          const colorClass = COLOR_MAP[task.icon] || "text-gray-600";
          const isProfile = task.key === "profile";
          const isOpened = !!opened[task.key];
          const isPending = completeMutation.isPending && (completeMutation.variables as any) === task.key;

          return (
            <div
              key={task.key}
              className={`rounded-xl border transition-all ${
                task.completed
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between p-3 gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {task.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  )}
                  {Icon && <Icon className={`h-4 w-4 flex-shrink-0 ${colorClass}`} />}
                  {!Icon && <Zap className={`h-4 w-4 flex-shrink-0 ${colorClass}`} />}
                  <span className={`text-sm font-medium truncate ${task.completed ? "text-green-700 line-through" : "text-gray-800"}`}>
                    {task.label}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs text-purple-700 border-purple-200 flex-shrink-0">
                  +{task.points} pts
                </Badge>
              </div>

              {!task.completed && (
                <div className="px-3 pb-3 flex items-center gap-2">
                  {isProfile ? (
                    <Link href={task.url} className="flex-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-8 border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={() => handleConfirm(task)}
                        data-testid={`button-welcome-task-${task.key}`}
                      >
                        Complete profile <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant={isOpened ? "outline" : "outline"}
                        className={`flex-1 text-xs h-8 ${isOpened ? "border-purple-200 text-purple-600 bg-purple-50/60" : "border-purple-300 text-purple-700 hover:bg-purple-50"}`}
                        onClick={() => handleOpenAction(task)}
                        data-testid={`button-welcome-open-${task.key}`}
                      >
                        {isOpened ? "Opened — try again" : "Open link"} <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                      <Button
                        size="sm"
                        className={`flex-1 text-xs h-8 ${isOpened ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed hover:bg-gray-200"}`}
                        onClick={() => handleConfirm(task)}
                        disabled={!isOpened || isPending}
                        data-testid={`button-welcome-confirm-${task.key}`}
                      >
                        {isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        {isPending ? "Crediting…" : `Confirm — claim ${task.points}`}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
