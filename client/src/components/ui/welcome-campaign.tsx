import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, ExternalLink, Rocket, Zap, Sparkles, Loader2, Trophy } from "lucide-react";
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

interface WelcomeCampaignProps {
  variant?: "creator" | "brand";
}

const MOTIVATION: Record<string, { title: string; subtitle: string; perk: string }> = {
  creator: {
    title: "Unlock Your First $TDRIP Boost",
    subtitle:
      "Every social you follow grows your reach AND your wallet. Finish all 6 tasks, stack instant $TDRIP, and climb the creator leaderboard faster.",
    perk: "Top creators who complete this in week one earn 3x more from brand campaigns.",
  },
  brand: {
    title: "Power Up Your Brand Launch",
    subtitle:
      "Tap into the Taskdrip community before your first campaign. Each task plugs your brand into a creator network that will amplify your launch by 5x.",
    perk: "Brands that complete welcome tasks see faster creator applications and higher campaign ROI.",
  },
};

export function WelcomeCampaign({ variant }: WelcomeCampaignProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Tracks per-task UI state: 'idle' | 'opened' (user clicked the link, now needs to confirm)
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const pendingFocusKey = useRef<string | null>(null);

  const userType = (user as any)?.userType;
  const resolvedVariant: "creator" | "brand" =
    variant ?? (userType === "brand" ? "brand" : "creator");
  const motivation = MOTIVATION[resolvedVariant];

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

  // Auto-credit when the user returns to the tab after opening a link.
  useEffect(() => {
    const handleFocus = () => {
      const key = pendingFocusKey.current;
      if (!key) return;
      pendingFocusKey.current = null;
      const task = data?.tasks?.find((t: any) => t.key === key);
      if (!task || task.completed) return;
      // Small delay to let the user settle back, then credit.
      setTimeout(() => completeMutation.mutate(key), 600);
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [data, completeMutation]);

  const handleOpenAction = (task: any) => {
    if (task.completed) return;
    if (task.url?.startsWith("/")) return;
    window.open(task.url, "_blank", "noopener,noreferrer");
    setOpened((prev) => ({ ...prev, [task.key]: true }));
    pendingFocusKey.current = task.key;
    // Auto-credit points immediately when the user opens the link.
    // The user can also tap "Task completed" later when they return.
    setTimeout(() => {
      if (!completeMutation.isPending) completeMutation.mutate(task.key);
    }, 400);
  };

  const handleConfirm = (task: any) => {
    if (task.completed) return;
    completeMutation.mutate(task.key);
  };

  if (isLoading || !data) return null;

  const { tasks, earned, totalPossible, percent } = data;
  const remaining = totalPossible - earned;

  return (
    <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="h-5 w-5 text-yellow-300" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/90">
            Welcome Mission
          </span>
        </div>
        <h3 className="text-lg sm:text-xl font-black leading-tight" data-testid="text-welcome-title">
          {motivation.title}
        </h3>
        <p className="text-sm text-white/90 mt-1 leading-relaxed" data-testid="text-welcome-subtitle">
          {motivation.subtitle}
        </p>
        <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-semibold backdrop-blur w-fit">
          <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
          <span>{motivation.perk}</span>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Rocket className="h-5 w-5 text-purple-600" />
            Your Welcome Tasks
          </CardTitle>
          <Badge className="bg-purple-600 text-white border-0" data-testid="badge-welcome-points">
            <Zap className="h-3 w-3 mr-1" /> {earned} / {totalPossible} pts earned
          </Badge>
        </div>
        <p className="text-sm text-purple-700 mt-1">
          🚀 Open a link, take the action, then come back — points are credited automatically.
        </p>
        {remaining > 0 && (
          <p className="text-xs text-purple-600 mt-1 font-semibold">
            Just {remaining} $TDRIP left to unlock the full reward.
          </p>
        )}
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
                <div className="px-3 pb-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                        variant="outline"
                        className={`flex-1 text-xs h-8 min-w-0 ${isOpened ? "border-purple-200 text-purple-600 bg-purple-50/60" : "border-purple-300 text-purple-700 hover:bg-purple-50"}`}
                        onClick={() => handleOpenAction(task)}
                        data-testid={`button-welcome-open-${task.key}`}
                      >
                        <span className="truncate">{isOpened ? "Opened" : "Open link"}</span>
                        <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs h-8 min-w-0 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                        onClick={() => handleConfirm(task)}
                        disabled={isPending}
                        data-testid={`button-welcome-confirm-${task.key}`}
                      >
                        {isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin flex-shrink-0" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1 flex-shrink-0" />
                        )}
                        <span className="truncate">{isPending ? "Crediting…" : `Task completed · +${task.points}`}</span>
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
