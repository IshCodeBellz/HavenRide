"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getChannel } from "@/lib/realtime/ably";

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
}: {
  bookingId: string;
  sender: "RIDER" | "DRIVER" | "DISPATCHER";
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial messages
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/messages`);
        if (res.ok && mounted) {
          const data = await res.json();
          setMessages(data);
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
  }, [bookingId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
              <p className="text-gray-600 text-sm font-medium">No messages yet</p>
              <p className="text-gray-500 text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === sender ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                  m.sender === sender
                    ? "bg-[#00796B] text-white rounded-br-sm"
                    : "bg-white text-gray-800 rounded-bl-sm"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold ${
                    m.sender === sender ? "text-[#E0F2F1]" : "text-[#00796B]"
                  }`}>
                    {m.sender === "RIDER" ? "Rider" : m.sender === "DRIVER" ? "Driver" : "Dispatcher"}
                  </span>
                  <span className={`text-xs ${
                    m.sender === sender ? "text-[#E0F2F1]/70" : "text-gray-500"
                  }`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      </div>
    </div>
  );
}
