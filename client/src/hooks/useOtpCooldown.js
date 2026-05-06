import { useEffect, useState } from 'react';

export default function useOtpCooldown() {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (timeLeft <= 0) return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timeLeft]);

  return {
    timeLeft,
    isCoolingDown: timeLeft > 0,
    startCooldown: (seconds = 60) => setTimeLeft(seconds),
    resetCooldown: () => setTimeLeft(0)
  };
}
