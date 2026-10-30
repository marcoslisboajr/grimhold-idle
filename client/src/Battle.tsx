import { useEffect, useState } from 'react';

/** Monstro animado: frames <sprite>_1..4.png em public/assets/monsters/. */
export function MonsterSprite({ sprite, height = 72 }: { sprite: string; height?: number }) {
  const [frame, setFrame] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f % 4) + 1), 220);
    return () => clearInterval(id);
  }, []);
  return (
    <img
      className="monster"
      src={`/assets/monsters/${sprite}_${frame}.png`}
      alt=""
      style={{ height }}
      draggable={false}
    />
  );
}
