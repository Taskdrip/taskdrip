import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { NavigationFixed } from "@/components/ui/navigation-fixed";

export default function UserProfile() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      const userId = (user as any).id;
      const userType = (user as any).userType;
      if (userType === "brand") {
        navigate(`/brand/${userId}`);
      } else {
        navigate(`/creators/${userId}`);
      }
    } else if (!isAuthenticated) {
      navigate("/login");
    }
  }, [user, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <NavigationFixed />
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-2 border-purple-500/30 border-t-purple-500" />
          <div className="absolute inset-0 rounded-full blur-md bg-purple-500/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
