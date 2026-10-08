import React from 'react';

export function AudioVisualizer({ state = 'disconnected', isSpeaking = false }) {
  // Bar count for voice wave
  const barCount = 28;

  // Determine wave color & animation dynamics based on call state
  let barColor = 'bg-slate-200';
  let isActive = false;

  if (state === 'speaking' || isSpeaking) {
    barColor = 'bg-gradient-to-t from-brand-600 to-teal-400';
    isActive = true;
  } else if (state === 'listening') {
    barColor = 'bg-gradient-to-t from-emerald-500 to-teal-400';
    isActive = true;
  } else if (state === 'thinking') {
    barColor = 'bg-gradient-to-t from-amber-400 to-brand-400';
    isActive = true;
  } else if (state === 'connected') {
    barColor = 'bg-brand-300';
    isActive = false;
  }

  // Generate varied wave heights
  const bars = Array.from({ length: barCount }, (_, i) => {
    // sinusoidal height profile peaking in middle
    const centerDist = Math.abs(i - barCount / 2) / (barCount / 2);
    const baseHeight = Math.max(12, Math.round((1 - centerDist * 0.7) * 48));
    const delay = ((i % 7) * 0.15).toFixed(2);
    const duration = (0.8 + (i % 5) * 0.15).toFixed(2);

    return {
      id: i,
      baseHeight,
      delay,
      duration,
    };
  });

  return (
    <div className="flex items-center justify-center space-x-1.5 h-16 w-full max-w-md px-4">
      {bars.map((bar) => (
        <span
          key={bar.id}
          className={`w-1.5 rounded-full transition-all duration-300 ${barColor}`}
          style={{
            height: isActive ? `${bar.baseHeight}px` : '6px',
            animation: isActive ? `wave ${bar.duration}s ease-in-out infinite` : 'none',
            animationDelay: `${bar.delay}s`,
            opacity: isActive ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}
