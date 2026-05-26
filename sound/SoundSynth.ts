/**
 * SoundSynth.ts
 * Procedural Audio Synthesizer using Web Audio API for Dedobol
 */

export class SoundSynth {
  /**
   * Synthesize a clean, short UI Click beep
   */
  public static playUIClick = (ctx: AudioContext, destination: AudioNode): void => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  /**
   * Synthesize a premium high-pitched warning beep (timer tick for low turn time)
   */
  public static playTimerTick = (ctx: AudioContext, destination: AudioNode, isUrgent: boolean = false): void => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freq = isUrgent ? 1600 : 1000;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const volume = isUrgent ? 0.08 : 0.04;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    const duration = isUrgent ? 0.085 : 0.055;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
  };

  /**
   * Synthesizes a kick (chute) sound
   * Frequency sweep + noise click. Volume depends on kick force.
   */
  public static playKick = (ctx: AudioContext, destination: AudioNode, force: number): void => {
    const volume = Math.min(0.8, (force / 35.0) * 0.5 + 0.1); // Normalize force [0-35] to gain
    const now = ctx.currentTime;

    // 1. Bass thump oscillator
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    oscGain.gain.setValueAtTime(volume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(destination);

    // 2. High-pass noise for leather impact click
    const bufferSize = ctx.sampleRate * 0.02; // 20ms click
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.18);
    noise.start(now);
    noise.stop(now + 0.03);

    console.log(`%c[Audio] Played Kick | Force: ${force.toFixed(1)} | Volume: ${volume.toFixed(2)}`, 'color: #2ecc71;');
  };

  /**
   * Synthesizes a wood block bounce (wooden table boundary rebound)
   */
  public static playWoodBorder = (ctx: AudioContext, destination: AudioNode, force: number): void => {
    const volume = Math.min(0.7, (force / 20.0) * 0.45 + 0.05);
    const now = ctx.currentTime;

    // Sub-bass knock
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

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
    gain.connect(destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.08);
    osc2.stop(now + 0.08);

    console.log(`%c[Audio] Played Wood Border Rebound | Force: ${force.toFixed(1)}`, 'color: #964B00;');
  };

  /**
   * Synthesizes a premium metallic clang for goalpost & crossbar hits ("traves")
   */
  public static playGoalpost = (ctx: AudioContext, destination: AudioNode, force: number): void => {
    const volume = Math.min(1.0, (force / 20.0) * 0.6 + 0.25);
    const now = ctx.currentTime;
    const decay = Math.min(0.8, (force / 20.0) * 0.35 + 0.45); // Harder hits ring longer!

    const freqs = [485, 712, 920, 1145, 1530];
    const amplitudes = [0.4, 0.3, 0.25, 0.15, 0.1];
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(350, now);
    
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(volume, now);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.98, now + decay);

      const oscDecay = decay * (1 - idx * 0.12);
      oscGain.gain.setValueAtTime(amplitudes[idx], now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + oscDecay);

      osc.connect(oscGain);
      oscGain.connect(filter);

      osc.start(now);
      osc.stop(now + oscDecay + 0.05);
    });

    filter.connect(mainGain);
    mainGain.connect(destination);

    console.log(`%c[Audio] 🔔 TRAVE! Played Goalpost Metallic Ring | Force: ${force.toFixed(1)} | Decay: ${decay.toFixed(2)}s`, 'color: #e74c3c; font-weight: bold;');
  };

  /**
   * Synthesizes a high-pitched plastic rebound pop for player collision (rebotes)
   */
  public static playRebound = (ctx: AudioContext, destination: AudioNode, force: number): void => {
    const volume = Math.min(0.55, (force / 20.0) * 0.35 + 0.1);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.045);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.06);

    console.log(`%c[Audio] Played Player Rebound | Force: ${force.toFixed(1)}`, 'color: #f39c12;');
  };

  /**
   * Synthesizes a deep glove-slap sound representing goalkeeper saves
   */
  public static playKeeperSave = (ctx: AudioContext, destination: AudioNode, force: number): void => {
    const volume = Math.min(0.85, (force / 20.0) * 0.45 + 0.25);
    const now = ctx.currentTime;

    // 1. Medium deep slap
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    oscGain.gain.setValueAtTime(volume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(destination);

    // 2. Muffled bandpass glove noise
    const bufferSize = ctx.sampleRate * 0.04; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.Q.setValueAtTime(2.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.15);
    noise.start(now);
    noise.stop(now + 0.05);

    console.log(`%c[Audio] 🧤 KEEPER SAVE! Played Glove Slap | Force: ${force.toFixed(1)}`, 'color: #00d2ff; font-weight: bold;');
  };

  /**
   * Synthesizes a soft grass bounce thump (ball landing/kicking on turf)
   */
  public static playGrassBounce = (ctx: AudioContext, destination: AudioNode, force: number): void => {
    if (force < 0.3) return; // Ignore microscopic rolls

    const volume = Math.min(0.4, (force / 8.0) * 0.25 + 0.03);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(destination);

    const bufferSize = ctx.sampleRate * 0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.1);
    noise.start(now);
    noise.stop(now + 0.04);
  };

  /**
   * Synthesizes a referee whistle with a modulated LFO warble
   */
  public static playRefereeWhistle = (ctx: AudioContext, destination: AudioNode, type: 'kickoff' | 'foul' | 'goal' | 'gameover' | 'half' | 'full'): void => {
    const now = ctx.currentTime;

    const playSingleBlow = (startTime: number, duration: number, maxVol: number = 0.35) => {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const whistleGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, startTime);
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(32, startTime);
      
      lfoGain.gain.setValueAtTime(45, startTime);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, startTime);
      filter.Q.setValueAtTime(3.5, startTime);

      whistleGain.gain.setValueAtTime(0, startTime);
      whistleGain.gain.linearRampToValueAtTime(maxVol, startTime + 0.04);
      whistleGain.gain.setValueAtTime(maxVol, startTime + duration - 0.08);
      whistleGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      filter.connect(whistleGain);
      whistleGain.connect(destination);

      lfo.start(startTime);
      osc.start(startTime);

      lfo.stop(startTime + duration + 0.05);
      osc.stop(startTime + duration + 0.05);
    };

    if (type === 'kickoff') {
      playSingleBlow(now, 0.4);
      console.log('%c[Juiz] 🏁 APITO! Começo de Rodada!', 'color: #f1c40f; font-weight: bold;');
    } else if (type === 'foul') {
      playSingleBlow(now, 0.22, 0.4);
      playSingleBlow(now + 0.27, 0.65, 0.42);
      console.log('%c[Juiz] ⚠️ APITO! Falta!', 'color: #e67e22; font-weight: bold;');
    } else if (type === 'goal') {
      playSingleBlow(now, 0.25, 0.4);
      playSingleBlow(now + 0.3, 0.25, 0.4);
      playSingleBlow(now + 0.6, 0.9, 0.45);
      console.log('%c[Juiz] ⚽ APITO! GOL CONFIRMADO!', 'color: #e74c3c; font-weight: bold;');
    } else if (type === 'gameover' || type === 'full') {
      playSingleBlow(now, 0.65, 0.38);
      playSingleBlow(now + 0.8, 0.65, 0.38);
      playSingleBlow(now + 1.6, 1.25, 0.45);
      console.log('%c[Juiz] 🛑 APITO FINAL! Fim de Partida!', 'color: #9b59b6; font-weight: bold;');
    } else if (type === 'half') {
      playSingleBlow(now, 0.5, 0.38);
      playSingleBlow(now + 0.65, 0.5, 0.38);
      console.log('%c[Juiz] ⏸️ APITO! Fim do Primeiro Tempo!', 'color: #3498db; font-weight: bold;');
    }
  };

  /**
   * Synthesizes a giant stadium cheer roar
   */
  public static playSynthesizedRoar = (ctx: AudioContext, destination: AudioNode): void => {
    const now = ctx.currentTime;
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    
    let lastVal = 0.0;
    for (let i = 0; i < noiseBuffer.length; i++) {
      const white = Math.random() * 2 - 1;
      const pink = 0.93 * lastVal + 0.07 * white;
      lastVal = pink;
      data[i] = pink;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.5, now);
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + 0.4);
    filter.frequency.exponentialRampToValueAtTime(320, now + 2.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.35); // Loud swell
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.45);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    source.start(now);
    source.stop(now + 2.5);
    console.log('%c[Audio] Torcida Comemora (Offline Roar Synth)', 'color: #e74c3c; font-weight: bold;');
  };

  /**
   * Synthesizes a soft, descending stadium sigh ("Ahhhh!")
   */
  public static playSynthesizedSigh = (ctx: AudioContext, destination: AudioNode): void => {
    const now = ctx.currentTime;
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    
    let lastVal = 0.0;
    for (let i = 0; i < noiseBuffer.length; i++) {
      const white = Math.random() * 2 - 1;
      const pink = 0.94 * lastVal + 0.06 * white;
      lastVal = pink;
      data[i] = pink;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.8, now);
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.linearRampToValueAtTime(260, now + 1.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.2); // Quick raise
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    source.start(now);
    source.stop(now + 1.5);
    console.log('%c[Audio] Torcida Lamenta (Offline Sigh Synth)', 'color: #e67e22;');
  };
}
