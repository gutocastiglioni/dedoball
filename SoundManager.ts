/**
 * SoundManager.ts
 * Premium, Zero-Latency Sound Engine for Dedobol (Tableball)
 * Coordinates settings, LocalStorage integration, and routes synthesized
 * and ambiance audios to sub-managers.
 */

import { SoundSynth } from './sound/SoundSynth';
import { SoundAmbiance } from './sound/SoundAmbiance';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volumeLevel: number = 0.5; // range 0 to 1
  private sfxVolume: number = 0.5;
  private crowdVolume: number = 0.5;

  private ambiance: SoundAmbiance = new SoundAmbiance();

  private readonly CROWD_CHEER_URL = 'https://assets.mixkit.co/active_storage/sfx/2016/2016-84.wav';
  private readonly CROWD_SIGH_URL = 'https://assets.mixkit.co/active_storage/sfx/2018/2018-84.wav';

  constructor() {
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('dedobol_sound_muted');
      const storedVolume = localStorage.getItem('dedobol_sound_volume');
      const storedSFX = localStorage.getItem('dedobol_sound_sfx_volume');
      const storedCrowd = localStorage.getItem('dedobol_sound_crowd_volume');
      
      this.isMuted = storedMute === 'true';
      this.volumeLevel = storedVolume !== null ? parseFloat(storedVolume) : 0.5;
      this.sfxVolume = storedSFX !== null ? parseFloat(storedSFX) : this.volumeLevel;
      this.crowdVolume = storedCrowd !== null ? parseFloat(storedCrowd) : this.volumeLevel;
    }
  }

  public init = (): void => {
    if (this.ctx) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[SoundManager] Web Audio API is not supported in this browser.');
        return;
      }

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.setValueAtTime(this.isMuted ? 0 : this.crowdVolume, this.ctx.currentTime);
      this.crowdGain.connect(this.ctx.destination);

      console.log(
        `%c[SoundManager] 🔊 Audio Engine Initialized. Muted: ${this.isMuted} | SFX: ${(this.sfxVolume * 100).toFixed(0)}% | Crowd: ${(this.crowdVolume * 100).toFixed(0)}%`,
        'color: #00d2ff; font-weight: bold; background: #070a0e; padding: 3px 6px; border-radius: 4px;'
      );

      this.ambiance.init(this.isMuted, this.crowdVolume);
    } catch (e) {
      console.error('[SoundManager] Failed to initialize AudioContext:', e);
    }
  };

  private resumeContext = async (): Promise<boolean> => {
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return true;
  };

  public setVolume = (level: number): void => {
    this.volumeLevel = Math.max(0, Math.min(1, level));
    if (typeof window !== 'undefined') {
      localStorage.setItem('dedobol_sound_volume', this.volumeLevel.toString());
    }
    this.setSFXVolume(level);
    this.setCrowdVolume(level);
  };

  public getVolume = (): number => this.volumeLevel;

  public setSFXVolume = (level: number): void => {
    this.sfxVolume = Math.max(0, Math.min(1, level));
    if (typeof window !== 'undefined') {
      localStorage.setItem('dedobol_sound_sfx_volume', this.sfxVolume.toString());
    }

    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  };

  public getSFXVolume = (): number => this.sfxVolume;

  public setCrowdVolume = (level: number): void => {
    this.crowdVolume = Math.max(0, Math.min(1, level));
    if (typeof window !== 'undefined') {
      localStorage.setItem('dedobol_sound_crowd_volume', this.crowdVolume.toString());
    }

    this.ambiance.syncMuteVolume(this.isMuted, this.crowdVolume);

    if (this.crowdGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.crowdVolume;
      this.crowdGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }

    this.ambiance.setVolume(this.ctx, this.crowdGain, this.isMuted, this.crowdVolume, 1.0);
  };

  public getCrowdVolume = (): number => this.crowdVolume;

  public toggleMute = (): boolean => {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  };

  public setMuted = (muted: boolean): void => {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dedobol_sound_muted', this.isMuted.toString());
    }

    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.sfxVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }

    if (this.crowdGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.crowdVolume;
      this.crowdGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }

    this.ambiance.syncMuteVolume(this.isMuted, this.crowdVolume);

    console.log(`%c[SoundManager] Mute state toggled: ${this.isMuted ? 'MUTED 🔇' : 'UNMUTED 🔊'}`, 'color: #f1c40f; font-weight: bold;');
  };

  public getMuted = (): boolean => this.isMuted;

  // Synthesizers
  public playUIClick = async (): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;
    SoundSynth.playUIClick(this.ctx, this.masterGain);
  };

  public playTimerTick = async (isUrgent: boolean = false): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;
    SoundSynth.playTimerTick(this.ctx, this.masterGain, isUrgent);
  };

  public playKick = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;
    SoundSynth.playKick(this.ctx, this.masterGain, force);
  };

  public playWoodBorder = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;
    SoundSynth.playWoodBorder(this.ctx, this.masterGain, force);
  };

  public playGoalpost = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;
    SoundSynth.playGoalpost(this.ctx, this.masterGain, force);
  };

  public playRebound = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;
    SoundSynth.playRebound(this.ctx, this.masterGain, force);
  };

  public playKeeperSave = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;
    SoundSynth.playKeeperSave(this.ctx, this.masterGain, force);
  };

  public playGrassBounce = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;
    SoundSynth.playGrassBounce(this.ctx, this.masterGain, force);
  };

  public playRefereeWhistle = async (type: 'kickoff' | 'foul' | 'goal' | 'gameover' | 'half' | 'full'): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;
    SoundSynth.playRefereeWhistle(this.ctx, this.masterGain, type);
  };

  // Ambiance Loop delegation
  public startCrowdAmbiance = async (): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.crowdGain) return;
    this.ambiance.start(this.ctx, this.crowdGain, this.isMuted, this.crowdVolume);
  };

  public stopCrowdAmbiance = (): void => {
    this.ambiance.stop();
  };

  public setCrowdAmbianceVolume = (relativeVol: number): void => {
    this.ambiance.setVolume(this.ctx, this.crowdGain, this.isMuted, this.crowdVolume, relativeVol);
  };

  public playCrowdCheer = async (): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.crowdGain) return;
    if (this.isMuted) return;

    try {
      const cheer = new Audio(this.CROWD_CHEER_URL);
      cheer.volume = this.crowdVolume * 0.85;
      cheer.play()
        .then(() => {
          console.log('%c[Audio] Torcida Comemora: GOOOOL! 🎉', 'color: #e74c3c; font-weight: bold;');
        })
        .catch(() => {
          SoundSynth.playSynthesizedRoar(this.ctx!, this.crowdGain!);
        });
    } catch {
      SoundSynth.playSynthesizedRoar(this.ctx, this.crowdGain);
    }
  };

  public playCrowdSigh = async (): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.crowdGain) return;
    if (this.isMuted) return;

    try {
      const sigh = new Audio(this.CROWD_SIGH_URL);
      sigh.volume = this.crowdVolume * 0.55;
      sigh.play()
        .then(() => {
          console.log('%c[Audio] Torcida Lamenta: Uuuuhhh! 😩', 'color: #e67e22;');
        })
        .catch(() => {
          SoundSynth.playSynthesizedSigh(this.ctx!, this.crowdGain!);
        });
    } catch {
      SoundSynth.playSynthesizedSigh(this.ctx, this.crowdGain);
    }
  };
}

export default new SoundManager();
