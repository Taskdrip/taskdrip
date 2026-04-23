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
        navigate(`/influencers/${userId}`);
      }
    } else if (!isAuthenticated) {
      navigate("/login");
    }
  }, [user, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationFixed />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-14 w-14 border-2 border-purple-200 border-t-purple-600" />
      </div>
    </div>
  );
}
