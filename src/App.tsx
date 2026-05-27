import { useEffect, useState } from 'react';
import { useHubStore } from '@/hub/hubStore';
import { HubMenu } from '@/components/hub/HubMenu';
import { HubSettings } from '@/components/hub/HubSettings';
import { FnafNightSelect } from '@/components/hub/FnafNightSelect';
import { HubLoading } from '@/components/hub/HubLoading';
import { GameRouter } from '@/components/hub/GameRouter';
import { setMasterVolume, startAmbience, resumeAudio } from '@/audio/soundManager';

export default function App() {
  const screen = useHubStore((s) => s.screen);
  const setScreen = useHubStore((s) => s.setScreen);
  const masterVolume = useHubStore((s) => s.masterVolume);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    setMasterVolume(masterVolume);
  }, [masterVolume]);

  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += 0.1 + Math.random() * 0.1;
      if (p >= 1) {
        p = 1;
        clearInterval(id);
        setTimeout(() => {
          setScreen('hub');
          resumeAudio();
          startAmbience();
        }, 300);
      }
      setLoadProgress(p);
    }, 100);
    return () => clearInterval(id);
  }, [setScreen]);

  return (
    <>
      {screen === 'loading' && <HubLoading progress={loadProgress} />}
      {screen === 'hub' && <HubMenu />}
      {screen === 'fnafSelect' && <FnafNightSelect />}
      {screen === 'settings' && <HubSettings />}
      {screen === 'playing' && <GameRouter />}
    </>
  );
}
