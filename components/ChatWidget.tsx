"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getChannel } from "@/lib/realtime/ably";
import { playNotificationSound } from "@/lib/notifications/sound";
import { stopFlashingTabTitle } from "@/lib/notifications/tabTitle";

type Message = {
  id: string;
  bookingId: string;
  sender: "RIDER" | "DRIVER" | "DISPATCHER";
  text: string;
  createdAt: string;
};

export default function ChatWidget({
  bookingId,
  sender,
  onMarkAsRead,
}: {
  bookingId: string;
  sender: "RIDER" | "DRIVER" | "DISPATCHER";
  onMarkAsRead?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const endRef = useRef<HTMLDivElement | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousMessageCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isTabActiveRef = useRef(true);

  // Track tab visibility and stop flashing when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
      // Stop flashing when user returns to the tab
      if (!document.hidden) {
        stopFlashingTabTitle();
      }
    };

    const handleFocus = () => {
      // Stop flashing when window gains focus
      stopFlashingTabTitle();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Initialize audio context (must be done after user interaction due to autoplay policies)
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let fallbackAudio: HTMLAudioElement | null = null;

    // Create audio context on first user interaction
    const initAudio = () => {
      if (audioContext) return; // Already initialized

      try {
        // Initialize Web Audio API
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create a simple beep sound function
        const createBeepSound = () => {
          if (!audioContext) return;
          
          try {
            // Resume audio context if suspended (required by some browsers)
            if (audioContext.state === "suspended") {
              audioContext.resume();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800; // 800 Hz tone
            oscillator.type = "sine";
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
          } catch (e) {
            console.debug("Error playing beep:", e);
            // Fallback to HTML5 audio
            if (fallbackAudio) {
              fallbackAudio.currentTime = 0;
              fallbackAudio.play().catch(() => {});
            }
          }
        };

        // Create fallback HTML5 audio
        fallbackAudio = new Audio();
        // Generate a simple beep using data URL
        const sampleRate = 44100;
        const duration = 0.3;
        const frequency = 800;
        const samples = Math.floor(sampleRate * duration);
        const buffer = new ArrayBuffer(44 + samples * 2);
        const view = new DataView(buffer);
        
        // WAV header
        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };
        writeString(0, "RIFF");
        view.setUint32(4, 36 + samples * 2, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, "data");
        view.setUint32(40, samples * 2, true);
        
        // Generate sine wave
        for (let i = 0; i < samples; i++) {
          const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
          const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767 * 0.3)));
          view.setInt16(44 + i * 2, intSample, true);
        }
        
        const blob = new Blob([buffer], { type: "audio/wav" });
        fallbackAudio.src = URL.createObjectURL(blob);
        fallbackAudio.volume = 0.5;
        fallbackAudio.preload = "auto";

        // Store the beep function
        (audioRef as any).current = { 
          play: createBeepSound,
          fallback: fallbackAudio,
          audioContext: audioContext
        };
      } catch (e) {
        console.warn("Could not initialize audio:", e);
        // Fallback to simple HTML5 audio
        fallbackAudio = new Audio();
        fallbackAudio.volume = 0.5;
        (audioRef as any).current = { fallback: fallbackAudio };
      }
    };

    // Initialize on any user interaction
    const events = ["click", "touchstart", "keydown"];
    const initHandlers: (() => void)[] = [];
    
    events.forEach(event => {
      const handler = () => {
        initAudio();
        // Remove all handlers after first interaction
        events.forEach((e, i) => {
          document.removeEventListener(e, initHandlers[i]);
        });
      };
      initHandlers.push(handler);
      document.addEventListener(event, handler, { once: true });
    });

    // Also try to initialize immediately (might work if user has interacted before)
    try {
      initAudio();
    } catch (e) {
      // Will initialize on next user interaction
    }

    return () => {
      events.forEach((event, i) => {
        document.removeEventListener(event, initHandlers[i]);
      });
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
      if (fallbackAudio) {
        fallbackAudio.pause();
        fallbackAudio.src = "";
      }
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);

      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Fetch initial messages
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/messages`);
        if (res.ok && mounted) {
          const data = await res.json();
          setMessages(data);
          previousMessageCountRef.current = data.length;
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [bookingId]);

  // Function to show notification for new messages
  const showNotification = useCallback(
    (message: Message) => {
      // Don't notify for own messages
      if (message.sender === sender) return;

      // Play notification sound (always play, even if tab is inactive or chat is closed)
      playNotificationSound();

      // Show browser notification (especially important when tab is inactive)
      if (notificationPermission === "granted") {
        const senderName =
          message.sender === "RIDER"
            ? "Rider"
            : message.sender === "DRIVER"
            ? "Driver"
            : "Dispatcher";
        
        // Show notification even if tab is active (for sound + visual feedback)
        const notification = new Notification(`New message from ${senderName}`, {
          body: message.text.length > 100 ? message.text.substring(0, 100) + "..." : message.text,
          icon: "/favicon.ico",
          tag: `message-${message.id}`,
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
      } else if (!isTabActiveRef.current && notificationPermission === "default") {
        // If tab is inactive and permission not yet granted, try requesting again
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
          if (permission === "granted") {
            showNotification(message);
          }
        });
      }
    },
    [sender, notificationPermission]
  );

  // Set up Ably subscription OR polling fallback
  useEffect(() => {
    let ch: any = null;
    let subscribed = false;

    const handler = (msg: any) => {
      if (msg.name === "message") {
        setMessages((prev) => {
          // Avoid duplicates - check by ID
          const exists = prev.some((m) => m.id === msg.data.id);
          if (exists) return prev;

          // Also check if this might replace a temp message with same text
          const tempIndex = prev.findIndex(
            (m) =>
              m.id.startsWith("temp-") &&
              m.text === msg.data.text &&
              m.sender === msg.data.sender
          );

          if (tempIndex !== -1) {
            // Replace the temp message with the real one
            const newMessages = [...prev];
            newMessages[tempIndex] = msg.data;
            return newMessages;
          }

          // Show notification for new message from others
          if (msg.data.sender !== sender) {
            showNotification(msg.data);
          }

          return [...prev, msg.data];
        });
      }
    };

    try {
      ch = getChannel(`booking:${bookingId}`);

      // Safe subscription with error handling - check if it's not a mock
      if (ch && !ch.isMock && typeof ch.subscribe === "function") {
        ch.subscribe(handler);
        subscribed = true;
        setRealtimeEnabled(true);
      }
    } catch {
      console.warn("Ably subscription failed, falling back to polling");
      setRealtimeEnabled(false);
    }

    // If Ably didn't work, use polling as fallback
    if (!subscribed) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/bookings/${bookingId}/messages`);
          if (res.ok) {
            const data = await res.json();

            // Check for new messages and show notifications
            if (data.length > previousMessageCountRef.current) {
              const newMessages = data.slice(previousMessageCountRef.current);
              newMessages.forEach((msg: Message) => {
                if (msg.sender !== sender) {
                  showNotification(msg);
                }
              });
            }

            previousMessageCountRef.current = data.length;
            setMessages(data);
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      try {
        // Clear polling interval
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        // Safe unsubscription
        if (subscribed && ch && typeof ch.unsubscribe === "function") {
          ch.unsubscribe(handler);
        }
      } catch (error) {
        console.warn("Cleanup error (ignoring):", error);
      }
    };
  }, [bookingId, sender, showNotification]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark messages as read when component mounts or messages change
  useEffect(() => {
    if (messages.length > 0 && onMarkAsRead) {
      onMarkAsRead();
      // Stop flashing tab title when chat is open and messages are visible
      stopFlashingTabTitle();
    }
  }, [messages.length, onMarkAsRead]);

  const send = useCallback(async () => {
    if (!input.trim()) return;

    const messageText = input.trim();
    setInput(""); // Clear input immediately for better UX

    // Optimistic update - add message immediately to UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      bookingId,
      sender,
      text: messageText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender, text: messageText }),
      });

      if (res.ok) {
        // Get the actual message from server
        const actualMessage = await res.json();

        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMessage.id ? actualMessage : m))
        );
      } else {
        // If failed, remove the optimistic message and restore input
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
        setInput(messageText);
        console.error("Failed to send message");
      }
    } catch (error) {
      // If failed, remove the optimistic message and restore input
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setInput(messageText);
      console.error("Error sending message:", error);
    }
  }, [input, bookingId, sender]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block p-3 bg-white rounded-full shadow-sm mb-3">
                <svg
                  className="w-6 h-6 text-[#00796B] animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 text-sm">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-full shadow-sm mb-3">
                <svg
                  className="w-8 h-8 text-[#00796B]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 text-sm font-medium">
                No messages yet
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.sender === sender ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                  m.sender === sender
                    ? "bg-[#00796B] text-white rounded-br-sm"
                    : "bg-white text-gray-800 rounded-bl-sm"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold ${
                      m.sender === sender ? "text-[#E0F2F1]" : "text-[#00796B]"
                    }`}
                  >
                    {m.sender === "RIDER"
                      ? "Rider"
                      : m.sender === "DRIVER"
                      ? "Driver"
                      : "Dispatcher"}
                  </span>
                  <span
                    className={`text-xs ${
                      m.sender === sender
                        ? "text-[#E0F2F1]/70"
                        : "text-gray-500"
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm break-words">{m.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <div className="p-4 bg-white border-t border-gray-200">
        {notificationPermission === "denied" && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <svg
              className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <div className="flex-1">
              <p className="text-xs text-amber-800">
                Notifications are blocked. Enable them in your browser settings
                to get message alerts.
              </p>
            </div>
          </div>
        )}
        {notificationPermission === "default" && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <svg
              className="w-5 h-5 text-blue-600 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <div className="flex-1">
              <p className="text-xs text-blue-800 mb-2">
                Enable notifications to get alerts when new messages arrive
              </p>
              <button
                onClick={() => {
                  Notification.requestPermission().then((permission) => {
                    setNotificationPermission(permission);
                  });
                }}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#00796B] focus:ring-2 focus:ring-[#00796B]/20 transition-colors"
            placeholder="Type a message..."
            autoComplete="off"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="px-6 py-3 bg-[#00796B] text-white rounded-xl hover:bg-[#00695C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-sm"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            Send
          </button>
        </div>
        {!realtimeEnabled && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Messages update every 3 seconds
          </p>
        )}
        {realtimeEnabled && notificationPermission === "granted" && (
          <p className="text-xs text-green-600 mt-2 text-center flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Real-time messages & notifications enabled
          </p>
        )}
      </div>
    </div>
  );
}
