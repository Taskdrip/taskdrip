import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, ExternalLink, Rocket, Zap } from "lucide-react";
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

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/welcome-campaign"],
    enabled: !!user,
  });

  const completeMutation = useMutation({
    mutationFn: async (taskKey: string) => {
      const res = await apiRequest("POST", `/api/welcome-campaign/complete/${taskKey}`);
      return res.json();
    },
    onSuccess: (data, taskKey) => {
      if (data?.alreadyDone) {
        toast({ title: "Already completed!", description: "You already did this task." });
      } else {
        toast({ title: "Task Completed! 🎉", description: `You earned points for this task!` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/welcome-campaign"] });
      queryClient.invalidateQueries({ queryKey: ["/api/points/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => toast({ title: "Failed", description: "Could not complete task.", variant: "destructive" }),
  });

  const handleTaskClick = (task: any) => {
    if (task.completed) return;
    if (task.url.startsWith("/")) {
      return;
    }
    window.open(task.url, "_blank");
    setTimeout(() => completeMutation.mutate(task.key), 2000);
  };

  const handleProfileTask = (task: any) => {
    if (!task.completed) completeMutation.mutate(task.key);
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
          🚀 Complete social tasks to earn your first $TDRIP points!
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

          return (
            <div
              key={task.key}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                task.completed
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200 hover:border-purple-300"
              }`}
            >
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
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <Badge variant="outline" className="text-xs text-purple-700 border-purple-200">
                  +{task.points} pts
                </Badge>
                {!task.completed && (
                  isProfile ? (
                    <Link href={task.url}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={() => handleProfileTask(task)}
                      >
                        Go <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={() => handleTaskClick(task)}
                      disabled={completeMutation.isPending}
                    >
                      Do it <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
