/**
 * SoundManager.ts
 * Premium, Zero-Latency Sound Engine for Dedobol (Tableball)
 * Uses the Web Audio API to synthesize responsive gameplay sound effects
 * and streams immersive crowd ambiance and goal celebration audios.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volumeLevel: number = 0.5; // range 0 to 1
  private sfxVolume: number = 0.5;
  private crowdVolume: number = 0.5;

  // Crowd ambiance properties
  private crowdAudio: HTMLAudioElement | null = null;
  private crowdSource: MediaElementAudioSourceNode | null = null;
  private crowdGain: GainNode | null = null;
  private isCrowdPlaying: boolean = false;
  
  // High-fidelity synthesized crowd fallback nodes
  private synthCrowdNode: ScriptProcessorNode | null = null;
  private synthCrowdGain: GainNode | null = null;

  // URLs for high-quality royalty-free crowd audio streams (Pixabay / stable open CDNs)
  private readonly CROWD_AMBIANCE_URL = 'https://assets.mixkit.co/active_storage/sfx/2034/2034-84.wav'; // Stadium background crowd
  private readonly CROWD_CHEER_URL = 'https://assets.mixkit.co/active_storage/sfx/2016/2016-84.wav'; // Crowds cheering / roaring
  private readonly CROWD_SIGH_URL = 'https://assets.mixkit.co/active_storage/sfx/2018/2018-84.wav'; // Disappointment sigh

  constructor() {
    // Retrieve persistent settings from LocalStorage
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

  /**
   * Initializes the Web Audio Context and master nodes.
   * Safe to call multiple times; will only initialize once.
   * MUST be triggered by a user interaction gesture (click/touch/flick).
   */
  public init = (): void => {
    if (this.ctx) return; // Already initialized

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

      // Pre-load background crowd loop
      this.initCrowdAmbiance();
    } catch (e) {
      console.error('[SoundManager] Failed to initialize AudioContext:', e);
    }
  };

  /**
   * Resumes the audio context if it was suspended (autoplay policy)
   */
  private resumeContext = async (): Promise<boolean> => {
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return true;
  };

  /**
   * Set Master Volume (0.0 to 1.0)
   */
  public setVolume = (level: number): void => {
    this.volumeLevel = Math.max(0, Math.min(1, level));
    if (typeof window !== 'undefined') {
      localStorage.setItem('dedobol_sound_volume', this.volumeLevel.toString());
    }
    // Backward compatibility sets both
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

    // Update active crowd stream volume directly
    if (this.crowdAudio && !this.isMuted) {
      this.crowdAudio.volume = this.crowdVolume * 0.35 * (this.isCrowdPlaying ? 1.0 : 0.35);
    }

    if (this.crowdGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.crowdVolume;
      this.crowdGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }

    if (this.synthCrowdGain && this.ctx) {
      const targetSynthGain = 0.08 * (this.isCrowdPlaying ? 1.0 : 0.35);
      this.synthCrowdGain.gain.setTargetAtTime(targetSynthGain, this.ctx.currentTime, 0.1);
    }
  };

  public getCrowdVolume = (): number => this.crowdVolume;

  /**
   * Toggle Mute State
   */
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

    if (this.crowdAudio) {
      if (this.isMuted) {
        this.crowdAudio.volume = 0;
      } else {
        this.crowdAudio.volume = this.crowdVolume * 0.35 * (this.isCrowdPlaying ? 1.0 : 0.35);
      }
    }

    console.log(`%c[SoundManager] Mute state toggled: ${this.isMuted ? 'MUTED 🔇' : 'UNMUTED 🔊'}`, 'color: #f1c40f; font-weight: bold;');
  };

  public getMuted = (): boolean => this.isMuted;

  // ──────────────────────────────────────────────────────────────────────────
  // DYNAMIC PHYSICAL SOUND SYNTHESIZERS (Web Audio API)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Synthesize a clean, short UI Click beep
   */
  public playUIClick = async (): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  };

  /**
   * Synthesizes a kick (chute) sound
   * Frequency sweep + noise click. Volume depends on kick force.
   */
  public playKick = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;

    const volume = Math.min(0.8, (force / 35.0) * 0.5 + 0.1); // Normalize force [0-35] to gain
    const now = this.ctx.currentTime;

    // 1. Bass thump oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    oscGain.gain.setValueAtTime(volume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    // 2. High-pass noise for leather impact click
    const bufferSize = this.ctx.sampleRate * 0.02; // 20ms click
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.18);
    noise.start(now);
    noise.stop(now + 0.03);

    console.log(`%c[Audio] Played Kick | Force: ${force.toFixed(1)} | Volume: ${volume.toFixed(2)}`, 'color: #2ecc71;');
  };

  /**
   * Synthesizes a wood block bounce (wooden table boundary rebound)
   */
  public playWoodBorder = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;

    const volume = Math.min(0.7, (force / 20.0) * 0.45 + 0.05);
    const now = this.ctx.currentTime;

    // Sub-bass knock
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.linearRampToValueAtTime(80, now + 0.06);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(225, now);
    osc2.frequency.linearRampToValueAtTime(130, now + 0.06);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.08);
    osc2.stop(now + 0.08);

    console.log(`%c[Audio] Played Wood Border Rebound | Force: ${force.toFixed(1)}`, 'color: #964B00;');
  };

  /**
   * Synthesizes a premium metallic clang for goalpost & crossbar hits ("traves")
   * Combines multiple non-harmonic sine waves with high resonance and long decay!
   */
  public playGoalpost = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;

    const volume = Math.min(1.0, (force / 20.0) * 0.6 + 0.25);
    const now = this.ctx.currentTime;
    const decay = Math.min(0.8, (force / 20.0) * 0.35 + 0.45); // Harder hits ring longer!

    // Additive non-harmonic metal frequencies
    const freqs = [485, 712, 920, 1145, 1530];
    const amplitudes = [0.4, 0.3, 0.25, 0.15, 0.1];
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(350, now);
    
    const mainGain = this.ctx.createGain();
    mainGain.gain.setValueAtTime(volume, now);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Spawn oscillators for metal ring
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      // Introduce a microscopic pitch drop over time (like a real metal vibration)
      osc.frequency.linearRampToValueAtTime(freq * 0.98, now + decay);

      // Higher frequencies decay slightly faster
      const oscDecay = decay * (1 - idx * 0.12);
      oscGain.gain.setValueAtTime(amplitudes[idx], now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + oscDecay);

      osc.connect(oscGain);
      oscGain.connect(filter);

      osc.start(now);
      osc.stop(now + oscDecay + 0.05);
    });

    filter.connect(mainGain);
    mainGain.connect(this.masterGain);

    console.log(`%c[Audio] 🔔 TRAVE! Played Goalpost Metallic Ring | Force: ${force.toFixed(1)} | Decay: ${decay.toFixed(2)}s`, 'color: #e74c3c; font-weight: bold;');
  };

  /**
   * Synthesizes a high-pitched plastic rebound pop for player collision (rebotes)
   */
  public playRebound = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;

    const volume = Math.min(0.55, (force / 20.0) * 0.35 + 0.1);
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.045);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);

    console.log(`%c[Audio] Played Player Rebound | Force: ${force.toFixed(1)}`, 'color: #f39c12;');
  };

  /**
   * Synthesizes a deep glove-slap sound representing goalkeeper saves
   */
  public playKeeperSave = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;

    const volume = Math.min(0.85, (force / 20.0) * 0.45 + 0.25);
    const now = this.ctx.currentTime;

    // 1. Medium deep slap
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    oscGain.gain.setValueAtTime(volume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    // 2. Muffled bandpass glove noise
    const bufferSize = this.ctx.sampleRate * 0.04; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.Q.setValueAtTime(2.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
    noise.start(now);
    noise.stop(now + 0.05);

    console.log(`%c[Audio] 🧤 KEEPER SAVE! Played Glove Slap | Force: ${force.toFixed(1)}`, 'color: #00d2ff; font-weight: bold;');
  };

  /**
   * Synthesizes a soft grass bounce thump (ball landing/kicking on turf)
   */
  public playGrassBounce = async (force: number): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;
    if (force < 0.3) return; // Ignore microscopic rolls

    const volume = Math.min(0.4, (force / 8.0) * 0.25 + 0.03);
    const now = this.ctx.currentTime;

    // Grass thump (low frequency triangle + filtered noise)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    // Muffled grass rustling
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
    noise.start(now);
    noise.stop(now + 0.04);
  };

  /**
   * Synthesizes a referee whistle with a gorgeous natural modulating LFO warble!
   */
  public playRefereeWhistle = async (type: 'kickoff' | 'foul' | 'goal' | 'gameover'): Promise<void> => {
    if (!(await this.resumeContext()) || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    const playSingleBlow = (startTime: number, duration: number, maxVol: number = 0.35) => {
      if (!this.ctx || !this.masterGain) return;
      
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const whistleGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Main high pitched whistle tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, startTime);
      
      // LFO creating the 30Hz metal ball vibration inside the whistle
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(32, startTime);
      
      // Modulates whistle pitch up/down by 45Hz
      lfoGain.gain.setValueAtTime(45, startTime);

      // Connect LFO modulation
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Acoustic filter
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, startTime);
      filter.Q.setValueAtTime(3.5, startTime);

      // Volume envelope (with rapid attack and smooth tail)
      whistleGain.gain.setValueAtTime(0, startTime);
      whistleGain.gain.linearRampToValueAtTime(maxVol, startTime + 0.04);
      whistleGain.gain.setValueAtTime(maxVol, startTime + duration - 0.08);
      whistleGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      filter.connect(whistleGain);
      whistleGain.connect(this.masterGain);

      lfo.start(startTime);
      osc.start(startTime);

      lfo.stop(startTime + duration + 0.05);
      osc.stop(startTime + duration + 0.05);
    };

    if (type === 'kickoff') {
      // 1 Short quick whistle blow to start round
      playSingleBlow(now, 0.4);
      console.log('%c[Juiz] 🏁 APITO! Começo de Rodada!', 'color: #f1c40f; font-weight: bold;');
    } else if (type === 'foul') {
      // 1 short quick + 1 long urgent blow representing a FOUL
      playSingleBlow(now, 0.22, 0.4);
      playSingleBlow(now + 0.27, 0.65, 0.42);
      console.log('%c[Juiz] ⚠️ APITO! Falta!', 'color: #e67e22; font-weight: bold;');
    } else if (type === 'goal') {
      // 2 short blows + 1 long dramatic blow representing a GOAL!
      playSingleBlow(now, 0.25, 0.4);
      playSingleBlow(now + 0.3, 0.25, 0.4);
      playSingleBlow(now + 0.6, 0.9, 0.45);
      console.log('%c[Juiz] ⚽ APITO! GOL CONFIRMADO!', 'color: #e74c3c; font-weight: bold;');
    } else if (type === 'gameover') {
      // 3 long structured blows representing final whistle
      playSingleBlow(now, 0.65, 0.38);
      playSingleBlow(now + 0.8, 0.65, 0.38);
      playSingleBlow(now + 1.6, 1.25, 0.45);
      console.log('%c[Juiz] 🛑 APITO FINAL! Fim de Partida!', 'color: #9b59b6; font-weight: bold;');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // STADIUM CROWD LOOP (TORCIDA) STREAMING & SYNTH GENERATOR
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Setup continuous crowd loop
   */
  private initCrowdAmbiance = (): void => {
    if (typeof window === 'undefined') return;

    try {
      this.crowdAudio = new Audio();
      this.crowdAudio.src = this.CROWD_AMBIANCE_URL;
      this.crowdAudio.loop = true;
      this.crowdAudio.volume = this.isMuted ? 0 : this.crowdVolume * 0.35; // default 35% of volume

      // Attempt to loop nicely. Media element supports loop natively.
      console.log('[SoundManager] Stadium crowd audio source pre-loaded.');
    } catch (e) {
      console.warn('[SoundManager] Could not initialize crowd audio file stream. Utilizing Web Audio Synth fallback instead.', e);
    }
  };

  /**
   * Starts looping crowd stadium atmosphere
   */
  public startCrowdAmbiance = async (): Promise<void> => {
    if (this.isCrowdPlaying) return;
    await this.resumeContext();

    this.isCrowdPlaying = true;

    if (this.crowdAudio) {
      this.crowdAudio.volume = this.isMuted ? 0 : this.crowdVolume * 0.35;
      this.crowdAudio.play()
        .then(() => {
          console.log('%c[Audio] Loop de Torcida iniciado via Stream', 'color: #3498db;');
        })
        .catch((err) => {
          console.warn('[SoundManager] Streamed audio blocked or failed. Starting Synthesized Stadium Drone fallback:', err);
          this.startSynthesizedCrowdDrone();
        });
    } else {
      this.startSynthesizedCrowdDrone();
    }
  };

  /**
   * Stops stadium crowd atmosphere
   */
  public stopCrowdAmbiance = (): void => {
    this.isCrowdPlaying = false;
    
    if (this.crowdAudio) {
      this.crowdAudio.pause();
    }
    
    this.stopSynthesizedCrowdDrone();
    console.log('[Audio] Loop de Torcida interrompido.');
  };

  /**
   * Dynamically adjusts crowd volume/rumble during actions
   */
  public setCrowdAmbianceVolume = (relativeVol: number): void => {
    const targetVol = Math.max(0, Math.min(1.0, relativeVol));
    const finalVolume = this.isMuted ? 0 : this.crowdVolume * 0.35 * targetVol;

    if (this.crowdAudio) {
      this.crowdAudio.volume = finalVolume;
    }

    if (this.synthCrowdGain && this.ctx) {
      // 0.08 is the default synthetic crowd volume multiplier
      this.synthCrowdGain.gain.setTargetAtTime(targetVol * 0.08, this.ctx.currentTime, 0.2);
    }
  };

  /**
   * Play high-quality crowd roar/celebration on scoring a goal!
   */
  public playCrowdCheer = async (): Promise<void> => {
    await this.resumeContext();
    if (this.isMuted) return;

    // We stream a rich roar sound
    try {
      const cheer = new Audio(this.CROWD_CHEER_URL);
      cheer.volume = this.crowdVolume * 0.85; // Celebrations are loud!
      cheer.play()
        .then(() => {
          console.log('%c[Audio] Torcida Comemora: GOOOOL! 🎉', 'color: #e74c3c; font-weight: bold;');
        })
        .catch(() => {
          // Fallback to synthesised roar if blocked/offline
          this.playSynthesizedRoar();
        });
    } catch {
      this.playSynthesizedRoar();
    }
  };

  /**
   * Play crowd sigh on near-misses, tackles, or hitting the post
   */
  public playCrowdSigh = async (): Promise<void> => {
    await this.resumeContext();
    if (this.isMuted) return;

    try {
      const sigh = new Audio(this.CROWD_SIGH_URL);
      sigh.volume = this.crowdVolume * 0.55;
      sigh.play()
        .then(() => {
          console.log('%c[Audio] Torcida Lamenta: Uuuuhhh! 😩', 'color: #e67e22;');
        })
        .catch(() => {
          this.playSynthesizedSigh();
        });
    } catch {
      this.playSynthesizedSigh();
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SYNTHESIZED CROWD GENERATORS (Failsafe offline system)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Starts a procedural stadium rumble drone using bandpass filtered pink-noise
   */
  private startSynthesizedCrowdDrone = (): void => {
    if (!this.ctx || !this.crowdGain || this.synthCrowdNode) return;

    const now = this.ctx.currentTime;
    this.synthCrowdGain = this.ctx.createGain();
    this.synthCrowdGain.gain.setValueAtTime(0.08 * (this.isCrowdPlaying ? 1.0 : 0.35), now);
    this.synthCrowdGain.connect(this.crowdGain);

    // Filter white noise to sound like a distant crowd roar/rumble
    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(320, now);
    filter1.Q.setValueAtTime(1.8, now);

    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(640, now);
    filter2.Q.setValueAtTime(2.2, now);

    const bufferSize = 4096;
    this.synthCrowdNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);
    
    let lastOut = 0.0;
    this.synthCrowdNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Simple 1st-order pink noise filter formula:
        const pink = 0.95 * lastOut + 0.05 * white;
        lastOut = pink;
        
        // Add random slight swell fluctuations
        const lfoSwell = 1.0 + Math.sin(e.playbackTime * 0.4) * 0.15;
        output[i] = pink * lfoSwell;
      }
    };

    this.synthCrowdNode.connect(filter1);
    this.synthCrowdNode.connect(filter2);
    filter1.connect(this.synthCrowdGain);
    filter2.connect(this.synthCrowdGain);

    console.log('%c[Audio] Loop de Torcida Procedural (Offline Synth) iniciado.', 'color: #3498db;');
  };

  /**
   * Stops synthesized stadium rumble
   */
  private stopSynthesizedCrowdDrone = (): void => {
    if (this.synthCrowdNode) {
      this.synthCrowdNode.disconnect();
      this.synthCrowdNode = null;
    }
    if (this.synthCrowdGain) {
      this.synthCrowdGain.disconnect();
      this.synthCrowdGain = null;
    }
  };

  /**
   * Synthesizes a giant stadium cheer roar!
   */
  private playSynthesizedRoar = (): void => {
    if (!this.ctx || !this.crowdGain) return;
    const now = this.ctx.currentTime;
    
    // Simulate a crowd swell with white noise and sweeping filter
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2.5, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    
    let lastVal = 0.0;
    for (let i = 0; i < noiseBuffer.length; i++) {
      const white = Math.random() * 2 - 1;
      const pink = 0.93 * lastVal + 0.07 * white;
      lastVal = pink;
      data[i] = pink;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.5, now);
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + 0.4);
    filter.frequency.exponentialRampToValueAtTime(320, now + 2.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.35); // Loud swell
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.45);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.crowdGain);

    source.start(now);
    source.stop(now + 2.5);
    console.log('%c[Audio] Torcida Comemora (Offline Roar Synth)', 'color: #e74c3c; font-weight: bold;');
  };

  /**
   * Synthesizes a soft, descending stadium sigh ("Ahhhh!")
   */
  private playSynthesizedSigh = (): void => {
    if (!this.ctx || !this.crowdGain) return;
    const now = this.ctx.currentTime;

    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.5, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    
    let lastVal = 0.0;
    for (let i = 0; i < noiseBuffer.length; i++) {
      const white = Math.random() * 2 - 1;
      const pink = 0.94 * lastVal + 0.06 * white;
      lastVal = pink;
      data[i] = pink;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.8, now);
    filter.frequency.setValueAtTime(500, now);
    // Pitch / frequency droops during sigh
    filter.frequency.linearRampToValueAtTime(260, now + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.2); // Quick raise
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.crowdGain);

    source.start(now);
    source.stop(now + 1.5);
    console.log('%c[Audio] Torcida Lamenta (Offline Sigh Synth)', 'color: #e67e22;');
  };
}

// Export clean singleton instance
export default new SoundManager();
