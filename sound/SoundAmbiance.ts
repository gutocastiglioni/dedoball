/**
 * SoundAmbiance.ts
 * Manages continuous stadium atmosphere streaming and procedural fallback synthesizers.
 */

export class SoundAmbiance {
  private crowdAudio: HTMLAudioElement | null = null;
  private synthCrowdNode: ScriptProcessorNode | null = null;
  private synthCrowdGain: GainNode | null = null;
  private isCrowdPlaying: boolean = false;

  private readonly CROWD_AMBIANCE_URL = 'https://assets.mixkit.co/active_storage/sfx/2034/2034-84.wav';

  public init = (isMuted: boolean, crowdVolume: number): void => {
    if (typeof window === 'undefined') return;
    if (this.crowdAudio) return;

    try {
      this.crowdAudio = new Audio();
      this.crowdAudio.src = this.CROWD_AMBIANCE_URL;
      this.crowdAudio.loop = true;
      this.crowdAudio.volume = isMuted ? 0 : crowdVolume * 0.35; // Default 35% of volume
      console.log('[SoundAmbiance] Stadium crowd audio source pre-loaded.');
    } catch (e) {
      console.warn('[SoundAmbiance] Could not initialize crowd audio file stream. Utilizing Web Audio Synth fallback instead.', e);
    }
  };

  public start = async (
    ctx: AudioContext,
    crowdGain: GainNode,
    isMuted: boolean,
    crowdVolume: number
  ): Promise<void> => {
    if (this.isCrowdPlaying) return;
    this.isCrowdPlaying = true;

    this.init(isMuted, crowdVolume);

    if (this.crowdAudio) {
      this.crowdAudio.volume = isMuted ? 0 : crowdVolume * 0.35;
      this.crowdAudio.play()
        .then(() => {
          console.log('%c[Audio] Loop de Torcida iniciado via Stream', 'color: #3498db;');
        })
        .catch((err) => {
          console.warn('[SoundAmbiance] Streamed audio blocked or failed. Starting Synthesized Stadium Drone fallback:', err);
          this.startSynthesizedCrowdDrone(ctx, crowdGain);
        });
    } else {
      this.startSynthesizedCrowdDrone(ctx, crowdGain);
    }
  };

  public stop = (): void => {
    this.isCrowdPlaying = false;
    
    if (this.crowdAudio) {
      this.crowdAudio.pause();
    }
    
    this.stopSynthesizedCrowdDrone();
    console.log('[Audio] Loop de Torcida interrompido.');
  };

  public setVolume = (
    ctx: AudioContext | null,
    synthDestination: GainNode | null,
    isMuted: boolean,
    crowdVolume: number,
    relativeVol: number
  ): void => {
    const targetVol = Math.max(0, Math.min(1.0, relativeVol));
    const finalVolume = isMuted ? 0 : crowdVolume * 0.35 * targetVol;

    if (this.crowdAudio) {
      this.crowdAudio.volume = finalVolume;
    }

    if (this.synthCrowdGain && ctx) {
      this.synthCrowdGain.gain.setTargetAtTime(targetVol * 0.08, ctx.currentTime, 0.2);
    }
  };

  public syncMuteVolume = (isMuted: boolean, crowdVolume: number): void => {
    if (this.crowdAudio) {
      if (isMuted) {
        this.crowdAudio.volume = 0;
      } else {
        this.crowdAudio.volume = crowdVolume * 0.35 * (this.isCrowdPlaying ? 1.0 : 0.35);
      }
    }
  };

  public startSynthesizedCrowdDrone = (ctx: AudioContext, crowdGain: GainNode): void => {
    if (this.synthCrowdNode) return;

    const now = ctx.currentTime;
    this.synthCrowdGain = ctx.createGain();
    this.synthCrowdGain.gain.setValueAtTime(0.08 * (this.isCrowdPlaying ? 1.0 : 0.35), now);
    this.synthCrowdGain.connect(crowdGain);

    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(320, now);
    filter1.Q.setValueAtTime(1.8, now);

    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(640, now);
    filter2.Q.setValueAtTime(2.2, now);

    const bufferSize = 4096;
    this.synthCrowdNode = ctx.createScriptProcessor(bufferSize, 1, 1);
    
    let lastOut = 0.0;
    this.synthCrowdNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const pink = 0.95 * lastOut + 0.05 * white;
        lastOut = pink;
        
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

  public getIsPlaying = (): boolean => this.isCrowdPlaying;
}
