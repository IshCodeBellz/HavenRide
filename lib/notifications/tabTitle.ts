"use client";

// Tab title notification manager
class TabTitleManager {
  private originalTitle: string = "";
  private flashInterval: NodeJS.Timeout | null = null;
  private unreadCount: number = 0;
  private isFlashing: boolean = false;

  constructor() {
    if (typeof document !== "undefined") {
      this.originalTitle = document.title;
      
      // Stop flashing when user focuses the window
      const handleFocus = () => {
        this.stopFlashing();
      };
      
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          this.stopFlashing();
        }
      };
      
      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
  }

  // Start flashing tab title with unread count
  startFlashing(count: number) {
    if (this.isFlashing && this.unreadCount === count) {
      return; // Already flashing with same count
    }

    this.unreadCount = count;
    this.isFlashing = true;

    // Clear any existing interval
    if (this.flashInterval) {
      clearInterval(this.flashInterval);
    }

    // Store original title if not already stored
    if (!this.originalTitle) {
      this.originalTitle = document.title;
    }

    let showNotification = true;
    const notificationText = count > 0 
      ? `(${count}) ${this.originalTitle}`
      : `New Message - ${this.originalTitle}`;

    // Flash between original title and notification
    this.flashInterval = setInterval(() => {
      if (typeof document !== "undefined") {
        document.title = showNotification ? notificationText : this.originalTitle;
        showNotification = !showNotification;
      }
    }, 1000); // Flash every second
  }

  // Stop flashing and restore original title
  stopFlashing() {
    if (this.flashInterval) {
      clearInterval(this.flashInterval);
      this.flashInterval = null;
    }
    this.isFlashing = false;
    this.unreadCount = 0;

    if (typeof document !== "undefined" && this.originalTitle) {
      document.title = this.originalTitle;
    }
  }

  // Update unread count (continues flashing if already active)
  updateCount(count: number) {
    if (count > 0) {
      this.startFlashing(count);
    } else {
      this.stopFlashing();
    }
  }

  // Get current unread count
  getCount(): number {
    return this.unreadCount;
  }
}

// Singleton instance
let tabTitleManager: TabTitleManager | null = null;

export function getTabTitleManager(): TabTitleManager {
  if (!tabTitleManager) {
    tabTitleManager = new TabTitleManager();
  }
  return tabTitleManager;
}

export function flashTabTitle(count: number) {
  const manager = getTabTitleManager();
  manager.startFlashing(count);
}

export function stopFlashingTabTitle() {
  const manager = getTabTitleManager();
  manager.stopFlashing();
}

export function updateTabTitleCount(count: number) {
  const manager = getTabTitleManager();
  manager.updateCount(count);
}

