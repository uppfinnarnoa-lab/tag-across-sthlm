import { useEffect, useState } from 'react';

const format = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export default function Countdown({ until, onExpire }: { until: string; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(() => new Date(until).getTime() - Date.now());

  useEffect(() => {
    const tick = () => {
      const left = new Date(until).getTime() - Date.now();
      setRemaining(left);
      if (left <= 0 && onExpire) onExpire();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until, onExpire]);

  return <span>{format(remaining)}</span>;
}
