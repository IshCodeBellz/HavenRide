"use client";
import { useState, useEffect } from "react";

interface UserData {
  role: string | null;
  isAdmin: boolean;
}

export function useUserData() {
  const [userData, setUserData] = useState<UserData>({
    role: null,
    isAdmin: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          setUserData({
            role: data.role || null,
            isAdmin: data.isAdmin || false,
          });
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, []);

  return { ...userData, loading };
}
