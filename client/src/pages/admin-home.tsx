import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import AdminMaster from "./admin-master";

function hasAdminDashboardAccess(user: any) {
  return user?.userType === "admin" || ["admin", "content_editor", "moderator", "store_manager"].includes(user?.role);
}

export default function AdminHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && hasAdminDashboardAccess(user)) {
      // Show admin dashboard directly
      return;
    } else if (user) {
      // Redirect non-admin users to regular dashboard
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  if (user && hasAdminDashboardAccess(user)) {
    return <AdminMaster />;
  }

  return null;
}