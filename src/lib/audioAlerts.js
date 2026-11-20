/**
 * Web Audio API Emergency Siren and Notification Chimes
 * Zero external audio file dependencies. Synthesizes medical telemetry alerts directly.
 */

class AudioAlertSystem {
  constructor() {
    this.ctx = null;
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * High-urgency pre-arrival ambulance siren chime:
   * Two-tone pulse: 880Hz (A5) -> 659Hz (E5) -> 880Hz (A5)
   */
  playEmergencySiren() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const now = ctx.currentTime;

      // Pitch modulation: 880Hz -> 659Hz -> 880Hz
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(659.25, now + 0.16);
      osc.frequency.setValueAtTime(880, now + 0.32);

      // Volume envelope
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
      gain.gain.setValueAtTime(0.15, now + 0.32);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.58);
    } catch (err) {
      console.warn("Audio chime could not be played:", err);
    }
  }

  /**
   * Gentle, pleasant confirmation chime when toggling audio enabled:
   * C5 (523Hz) -> G5 (784Hz)
   */
  playToggleChime(isEnabled = true) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;

      if (isEnabled) {
        // Ascending pleasant chord
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(783.99, now + 0.1);
      } else {
        // Descending mute tone
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(392.00, now + 0.1);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (err) {
      console.warn("Audio chime could not be played:", err);
    }
  }
}

export const audioAlerts = new AudioAlertSystem();

