"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function CalendarConnectionHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isConnected = searchParams.get("connected") === "true";

  useEffect(() => {
    if (isConnected) {
      // In a real app, use a toast notification
      toast.success("Calendar connected successfully! 📅");
      // Clean up URL
      router.replace("/");
    }
  }, [isConnected, router]);

  return null;
}
