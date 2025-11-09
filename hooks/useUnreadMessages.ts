"use client";
import { useEffect, useState, useCallback } from "react";
import { getChannel } from "@/lib/realtime/ably";

export function useUnreadMessages(
  bookingId: string,
  sender: "RIDER" | "DRIVER" | "DISPATCHER"
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(
    Date.now()
  );

  // Fetch messages and count unread
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/messages`);
      if (res.ok) {
        const messages = await res.json();
        // Count messages from others that are newer than last read
        const unread = messages.filter(
          (m: any) =>
            m.sender !== sender &&
            new Date(m.createdAt).getTime() > lastReadTimestamp
        ).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [bookingId, sender, lastReadTimestamp]);

  // Subscribe to real-time updates
  useEffect(() => {
    let ch: any = null;
    let subscribed = false;
    let pollingInterval: NodeJS.Timeout | null = null;

    const handler = (msg: any) => {
      if (msg.name === "message" && msg.data.sender !== sender) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    try {
      ch = getChannel(`booking:${bookingId}`);
      if (ch && !ch.isMock && typeof ch.subscribe === "function") {
        ch.subscribe(handler);
        subscribed = true;
      }
    } catch {
      // Fallback to polling
    }

    // Polling fallback
    if (!subscribed) {
      fetchUnreadCount();
      pollingInterval = setInterval(fetchUnreadCount, 5000);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (subscribed && ch && typeof ch.unsubscribe === "function") {
        try {
          ch.unsubscribe(handler);
        } catch (error) {
          console.warn("Cleanup error:", error);
        }
      }
    };
  }, [bookingId, sender, fetchUnreadCount]);

  // Mark as read
  const markAsRead = useCallback(() => {
    setLastReadTimestamp(Date.now());
    setUnreadCount(0);
  }, []);

  return { unreadCount, markAsRead };
}
