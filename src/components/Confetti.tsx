import React, { useEffect, useMemo, useState } from 'react';

interface ConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
  duration?: number; // Duration in milliseconds (default: 1400ms)
}

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  color: string;
  size: number;
  rotation: number;
  shape: 'circle' | 'square';
  animDuration: number;
}

const Confetti: React.FC<ConfettiProps> = ({
  isActive,
  onComplete,
  duration = 1400,
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const colors = useMemo(
    () => ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4'],
    []
  );

  // Keep these centralized so tweaks are painless
  const pieceCount = 50;
  const maxDelay = 250; // ms (stagger)
  const minFall = Math.max(900, Math.floor(duration * 0.8)); // ms
  const maxFall = Math.max(minFall + 250, Math.floor(duration * 1.1)); // ms

  useEffect(() => {
    if (!isActive) return;

    // Generate confetti pieces
    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < pieceCount; i++) {
      const delay = Math.random() * maxDelay;
      const animDuration =
        minFall + Math.random() * (maxFall - minFall);

      newPieces.push({
        id: i,
        left: Math.random() * 100,
        delay,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
        shape: Math.random() > 0.5 ? 'circle' : 'square',
        animDuration,
      });
    }

    setPieces(newPieces);
    setIsVisible(true);

    // Hide after the slowest possible piece finishes (+ buffer)
    const totalLifetime = maxDelay + maxFall + 100;

    const hideTimeout = window.setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, totalLifetime);

    const clearPiecesTimeout = window.setTimeout(() => {
      setPieces([]);
    }, totalLifetime + 100);

    return () => {
      window.clearTimeout(hideTimeout);
      window.clearTimeout(clearPiecesTimeout);
    };
  }, [isActive, colors, onComplete, pieceCount, maxDelay, minFall, maxFall]);

  if (!isVisible || pieces.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: piece.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${piece.delay}ms`,
            animationDuration: `${piece.animDuration}ms`,
          }}
        />
      ))}

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }

        .animate-confetti-fall {
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
};

export default Confetti;
