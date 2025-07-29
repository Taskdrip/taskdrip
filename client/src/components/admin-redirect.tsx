import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function AdminRedirect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && (user as any).userType === 'admin') {
      setLocation('/admin');
    }
  }, [user, setLocation]);

  return null;
}