"use client";

// Global audio notification manager
class NotificationSoundManager {
  private audioContext: AudioContext | null = null;
  private fallbackAudio: HTMLAudioElement | null = null;
  private initialized = false;
  private initHandlers: (() => void)[] = [];
  private isTabActive = true;

  constructor() {
    // Track tab visibility
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        this.isTabActive = !document.hidden;
      });
    }
  }

  // Initialize audio (must be called after user interaction)
  private initAudio() {
    if (this.initialized) return;

    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create beep sound function
      const createBeepSound = () => {
        if (!this.audioContext) return;
        
        try {
          // Resume audio context if suspended
          if (this.audioContext.state === "suspended") {
            this.audioContext.resume();
          }
          
          const oscillator = this.audioContext.createOscillator();
          const gainNode = this.audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          
          oscillator.frequency.value = 800; // 800 Hz tone
          oscillator.type = "sine";
          
          gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
          
          oscillator.start(this.audioContext.currentTime);
          oscillator.stop(this.audioContext.currentTime + 0.3);
        } catch (e) {
          console.debug("Error playing beep:", e);
          // Fallback to HTML5 audio
          this.playFallback();
        }
      };

      // Create fallback HTML5 audio
      this.fallbackAudio = new Audio();
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
      this.fallbackAudio.src = URL.createObjectURL(blob);
      this.fallbackAudio.volume = 0.5;
      this.fallbackAudio.preload = "auto";

      // Store the beep function
      (this as any).playBeep = createBeepSound;
      this.initialized = true;
    } catch (e) {
      console.warn("Could not initialize audio:", e);
      // Fallback to simple HTML5 audio
      this.fallbackAudio = new Audio();
      this.fallbackAudio.volume = 0.5;
      this.initialized = true;
    }
  }

  private playFallback() {
    if (this.fallbackAudio) {
      this.fallbackAudio.currentTime = 0;
      this.fallbackAudio.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }

  // Setup initialization on user interaction
  setup() {
    if (this.initialized) return;

    const events = ["click", "touchstart", "keydown"];
    
    events.forEach(event => {
      const handler = () => {
        this.initAudio();
        // Remove all handlers after first interaction
        events.forEach((e, i) => {
          document.removeEventListener(e, this.initHandlers[i]);
        });
        this.initHandlers = [];
      };
      this.initHandlers.push(handler);
      document.addEventListener(event, handler, { once: true });
    });

    // Also try to initialize immediately (might work if user has interacted before)
    try {
      this.initAudio();
    } catch (e) {
      // Will initialize on next user interaction
    }
  }

  // Play notification sound
  play() {
    // Ensure audio is initialized
    if (!this.initialized) {
      this.setup();
      // Try to initialize now
      try {
        this.initAudio();
      } catch (e) {
        // Will need user interaction
        return;
      }
    }

    try {
      const playBeep = (this as any).playBeep;
      if (playBeep && typeof playBeep === "function") {
        // Web Audio API beep
        playBeep();
      } else {
        // Fallback to HTML5 audio
        this.playFallback();
      }
    } catch (error) {
      console.debug("Error playing notification sound:", error);
      this.playFallback();
    }
  }

  // Cleanup
  cleanup() {
    this.initHandlers.forEach((handler, i) => {
      const events = ["click", "touchstart", "keydown"];
      document.removeEventListener(events[i], handler);
    });
    this.initHandlers = [];
    
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
    }
    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
      this.fallbackAudio.src = "";
    }
  }
}

// Singleton instance
let soundManager: NotificationSoundManager | null = null;

export function getNotificationSoundManager(): NotificationSoundManager {
  if (!soundManager) {
    soundManager = new NotificationSoundManager();
    soundManager.setup();
  }
  return soundManager;
}

export function playNotificationSound() {
  const manager = getNotificationSoundManager();
  manager.play();
}

