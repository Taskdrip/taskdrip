import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import AdminMaster from "./admin-master";

export default function AdminHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && (user as any).userType === 'admin') {
      // Show admin dashboard directly
      return;
    } else if (user) {
      // Redirect non-admin users to regular dashboard
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  if (user && (user as any).userType === 'admin') {
    return <AdminMaster />;
  }

  return null;
}