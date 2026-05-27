import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';

/** Procedural ambience + tension-reactive drone (Web Audio API). */
export function useAudio() {
  const screen = useGameStore((s) => s.screen);
  const masterVolume = useGameStore((s) => s.masterVolume);
  const tension = useGameStore((s) => s.tension);
  const powerOut = useGameStore((s) => s.powerOut);
  const jumpscare = useGameStore((s) => s.jumpscare);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  const droneOscRef = useRef<OscillatorNode[]>([]);
  const hvacRef = useRef<AudioBufferSourceNode | null>(null);

  const ensureContext = () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.connect(ctxRef.current.destination);
    }
    return ctxRef.current;
  };

  const startAmbience = () => {
    const ctx = ensureContext();
    if (droneOscRef.current.length) return;

    masterRef.current!.gain.value = masterVolume;

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.04;
    droneGain.connect(masterRef.current!);
    droneGainRef.current = droneGain;

    for (const freq of [38, 41]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(droneGain);
      osc.start();
      droneOscRef.current.push(osc);
    }

    const bufLen = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 80;
    const hvacGain = ctx.createGain();
    hvacGain.gain.value = 0.05;
    src.connect(filter);
    filter.connect(hvacGain);
    hvacGain.connect(masterRef.current!);
    src.start();
    hvacRef.current = src;
  };

  const stopAmbience = () => {
    droneOscRef.current.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    droneOscRef.current = [];
    try {
      hvacRef.current?.stop();
    } catch {
      /* */
    }
    hvacRef.current = null;
  };

  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = masterVolume;
  }, [masterVolume]);

  useEffect(() => {
    if (droneGainRef.current) {
      const target = powerOut ? 0 : 0.04 + tension * 0.1;
      droneGainRef.current.gain.value = target;
    }
    if (droneOscRef.current[0]) {
      droneOscRef.current[0].frequency.value = 38 + tension * 8;
    }
  }, [tension, powerOut]);

  useEffect(() => {
    if (screen === 'playing') {
      const resume = () => void ctxRef.current?.resume();
      startAmbience();
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
      return () => {
        stopAmbience();
        document.removeEventListener('click', resume);
        document.removeEventListener('keydown', resume);
      };
    }
    stopAmbience();
    return undefined;
  }, [screen]);

  useEffect(() => {
    if (!jumpscare) return;
    const ctx = ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
    gain.gain.setValueAtTime(0.35 * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(masterRef.current!);
    osc.start(now);
    osc.stop(now + 0.55);
  }, [jumpscare, masterVolume]);
}
