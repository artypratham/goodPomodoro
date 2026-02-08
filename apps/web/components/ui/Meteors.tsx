'use client';

import { useMemo } from 'react';

type MeteorsProps = {
  number?: number;
};

export function Meteors({ number = 8 }: MeteorsProps) {
  const meteors = useMemo(
    () =>
      Array.from({ length: number }).map(() => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 6 + Math.random() * 6
      })),
    [number]
  );

  return (
    <div className="meteors" aria-hidden="true">
      {meteors.map((meteor, index) => (
        <span
          key={index}
          className="meteor"
          style={{
            top: `${meteor.top}%`,
            left: `${meteor.left}%`,
            animationDelay: `${meteor.delay}s`,
            animationDuration: `${meteor.duration}s`
          }}
        />
      ))}
    </div>
  );
}
