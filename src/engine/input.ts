/** Local multiplayer key maps — couch co-op */

export const P1 = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', action: 'Space' };
export const P2 = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', action: 'Enter' };
export const P3 = { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', action: 'KeyU' };
export const P4 = { up: 'KeyT', down: 'KeyG', left: 'KeyF', right: 'KeyH', action: 'KeyR' };

const PLAYER_KEYS = [P1, P2, P3, P4];

const held = new Set<string>();

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => held.add(e.code));
  window.addEventListener('keyup', (e) => held.delete(e.code));
}

export function isDown(code: string) {
  return held.has(code);
}

export function playerDir(playerIndex: number) {
  const k = PLAYER_KEYS[playerIndex];
  if (!k) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  if (isDown(k.left)) x -= 1;
  if (isDown(k.right)) x += 1;
  if (isDown(k.up)) y -= 1;
  if (isDown(k.down)) y += 1;
  return { x, y };
}

export function playerAction(playerIndex: number) {
  const k = PLAYER_KEYS[playerIndex];
  return k ? isDown(k.action) : false;
}

export function anyKey(...codes: string[]) {
  return codes.some(isDown);
}
