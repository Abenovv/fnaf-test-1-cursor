import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export function useKeyboardControls() {
  const screen = useGameStore((s) => s.screen);
  const cameraOpen = useGameStore((s) => s.cameraOpen);
  const toggleDoorLeft = useGameStore((s) => s.toggleDoorLeft);
  const toggleDoorRight = useGameStore((s) => s.toggleDoorRight);
  const toggleLightLeft = useGameStore((s) => s.toggleLightLeft);
  const toggleLightRight = useGameStore((s) => s.toggleLightRight);
  const openCamera = useGameStore((s) => s.openCamera);
  const closeCamera = useGameStore((s) => s.closeCamera);

  useEffect(() => {
    if (screen !== 'playing') return;

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Digit1':
          toggleDoorLeft();
          break;
        case 'Digit2':
          toggleDoorRight();
          break;
        case 'KeyQ':
          if (!e.repeat) toggleLightLeft();
          break;
        case 'KeyE':
          if (!e.repeat) toggleLightRight();
          break;
        case 'KeyC':
        case 'Tab':
          e.preventDefault();
          if (cameraOpen) closeCamera();
          else openCamera();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ' && useGameStore.getState().lightLeft) toggleLightLeft();
      if (e.code === 'KeyE' && useGameStore.getState().lightRight) toggleLightRight();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    screen,
    cameraOpen,
    toggleDoorLeft,
    toggleDoorRight,
    toggleLightLeft,
    toggleLightRight,
    openCamera,
    closeCamera,
  ]);
}
