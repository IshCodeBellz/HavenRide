"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { getChannel } from "@/lib/realtime/ably";
import { playNotificationSound } from "@/lib/notifications/sound";
import { updateTabTitleCount, stopFlashingTabTitle } from "@/lib/notifications/tabTitle";

export function useUnreadMessages(
  bookingId: string,
  sender: "RIDER" | "DRIVER" | "DISPATCHER"
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(
    Date.now()
  );
  const previousUnreadCountRef = useRef(0);
  const notificationPermissionRef = useRef<NotificationPermission>("default");

  // Fetch messages and count unread
  const fetchUnreadCount = useCallback(async () => {
    if (!bookingId) {
      return; // Don't fetch if bookingId is invalid
    }
    
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
      } else {
        // Don't log errors for 404s or other expected errors
        if (res.status !== 404) {
          console.error("Failed to fetch unread count:", res.status, res.statusText);
        }
      }
    } catch (error) {
      // Only log if it's not a network error (which might be expected)
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        // Network error - might be offline or API down, don't spam console
        return;
      }
      console.error("Failed to fetch unread count:", error);
    }
  }, [bookingId, sender, lastReadTimestamp]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      notificationPermissionRef.current = Notification.permission;
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          notificationPermissionRef.current = permission;
        });
      }
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    let ch: any = null;
    let subscribed = false;
    let pollingInterval: NodeJS.Timeout | null = null;

    const handler = (msg: any) => {
      if (msg.name === "message" && msg.data.sender !== sender) {
        setUnreadCount((prev) => {
          const newCount = prev + 1;
          
          // Play sound notification for new message
          playNotificationSound();
          
          // Flash tab title to alert user
          updateTabTitleCount(newCount);
          
          // Show browser notification if tab is inactive or chat is closed
          if (notificationPermissionRef.current === "granted") {
            const senderName =
              msg.data.sender === "RIDER"
                ? "Rider"
                : msg.data.sender === "DRIVER"
                ? "Driver"
                : "Dispatcher";
            
            const notification = new Notification(`New message from ${senderName}`, {
              body: msg.data.text?.length > 100 
                ? msg.data.text.substring(0, 100) + "..." 
                : msg.data.text || "New message",
              icon: "/favicon.ico",
              tag: `message-${msg.data.id}`,
              requireInteraction: false,
              badge: "/favicon.ico",
            });

            // Auto-close notification after 5 seconds
            setTimeout(() => {
              notification.close();
            }, 5000);

            // Focus window when notification is clicked
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }
          
          return newCount;
        });
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

  // Play sound and flash tab title when unread count increases (for polling fallback and when chat is closed)
  useEffect(() => {
    if (unreadCount > previousUnreadCountRef.current) {
      // New unread message detected - play sound even if chat is closed
      playNotificationSound();
      
      // Flash tab title to alert user
      updateTabTitleCount(unreadCount);
      
      // Show browser notification (especially when tab is inactive or chat is closed)
      if (notificationPermissionRef.current === "granted" && typeof document !== "undefined") {
        const isTabActive = !document.hidden;
        // Show notification especially if tab is inactive
        if (!isTabActive) {
          const notification = new Notification("New message", {
            body: `You have ${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`,
            icon: "/favicon.ico",
            tag: `unread-${bookingId}`,
            requireInteraction: false,
            badge: "/favicon.ico",
          });

          setTimeout(() => {
            notification.close();
          }, 5000);

          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      }
    } else if (unreadCount === 0 && previousUnreadCountRef.current > 0) {
      // All messages read - stop flashing
      stopFlashingTabTitle();
    } else if (unreadCount > 0) {
      // Update count if it changed
      updateTabTitleCount(unreadCount);
    }
    
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount, bookingId]);

  // Mark as read
  const markAsRead = useCallback(() => {
    setLastReadTimestamp(Date.now());
    setUnreadCount(0);
    // Stop flashing tab title when messages are marked as read
    stopFlashingTabTitle();
  }, []);

  return { unreadCount, markAsRead };
}
