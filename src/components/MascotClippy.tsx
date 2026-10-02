import React, { useEffect, useState } from 'react';

export type MascotMood = 'idle' | 'scanning' | 'error' | 'success';

interface MascotClippyProps {
  mood: MascotMood;
  className?: string;
  sizeClassName?: string;
}

export const MascotClippy: React.FC<MascotClippyProps> = ({
  mood,
  className = '',
  sizeClassName = 'w-44 h-44 sm:w-52 sm:h-52',
}) => {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((prev) => prev + 1);
  }, [mood]);

  const isError = mood === 'error';
  const isSuccess = mood === 'success';
  const isScanning = mood === 'scanning';
  const isIdle = mood === 'idle';

  const wireStroke = isError
    ? '#EF4444'
    : isScanning
    ? '#F59E0B'
    : '#0052FF';

  const wireBacking = isError
    ? '#B91C1C'
    : isScanning
    ? '#B45309'
    : '#0033B3';

  const wireHighlight = isError
    ? '#FCA5A5'
    : isScanning
    ? '#FDE68A'
    : '#70A4FF';

  return (
  <div className={`relative flex items-center justify-center select-none max-h-full max-w-full ${sizeClassName} ${className}`}>
      <div
        className={`absolute inset-4 rounded-full blur-2xl opacity-30 transition-all duration-500 pointer-events-none ${
          isIdle
            ? 'bg-blue-400'
            : isScanning
            ? 'bg-amber-400 animate-pulse'
            : isError
            ? 'bg-red-400 scale-105'
            : 'bg-emerald-400 scale-110'
        }`}
      />

      <svg
  key={animKey}
  viewBox="0 0 120 120"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  className={`w-full h-full max-h-full max-w-full object-contain drop-shadow-sm transition-all ${
    isIdle
      ? 'animate-float-slow'
      : isScanning
      ? 'animate-pulse'
      : isError
      ? 'animate-panic-limit'
      : 'animate-happy-limit'
  }`}
>
        <ellipse cx="60" cy="108" rx="26" ry="3.5" fill="#121316" opacity="0.1" />

        <path
          d="M 51 76 L 51 44 A 9 9 0 0 1 69 44 L 69 78 A 18 18 0 0 1 33 78 L 33 34 A 27 27 0 0 1 87 34 L 87 86"
          stroke={wireBacking}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M 51 76 L 51 44 A 9 9 0 0 1 69 44 L 69 78 A 18 18 0 0 1 33 78 L 33 34 A 27 27 0 0 1 87 34 L 87 86"
          stroke={wireStroke}
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-300"
        />

        <path
          d="M 51 70 L 51 46 A 9 9 0 0 1 69 46 L 69 72 M 33 72 L 33 36 A 27 27 0 0 1 87 36 L 87 80"
          stroke={wireHighlight}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {isIdle && (
          <g>
            <path d="M 43 31 C 46 29, 52 29, 54 31" stroke="#121316" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 66 31 C 68 29, 74 29, 77 31" stroke="#121316" strokeWidth="2.2" strokeLinecap="round" />

            <circle cx="48" cy="40" r="7.5" fill="white" stroke="#121316" strokeWidth="2" />
            <circle cx="45.5" cy="40" r="3.6" fill="#121316" />
            <circle cx="44.2" cy="38.5" r="1.3" fill="white" />

            <circle cx="72" cy="40" r="7.5" fill="white" stroke="#121316" strokeWidth="2" />
            <circle cx="69.5" cy="40" r="3.6" fill="#121316" />
            <circle cx="68.2" cy="38.5" r="1.3" fill="white" />

            <ellipse cx="40" cy="46" rx="3.5" ry="2" fill="#FFA4B8" opacity="0.65" />
            <ellipse cx="80" cy="46" rx="3.5" ry="2" fill="#FFA4B8" opacity="0.65" />

            <path d="M 55 51 Q 60 57 65 51" fill="none" stroke="#121316" strokeWidth="2.2" strokeLinecap="round" />

            <g id="idle-hand">
              <path d="M 33 58 Q 24 58 16 58" fill="none" stroke="#0052FF" strokeWidth="4.5" strokeLinecap="round" />
              <rect x="8" y="63" width="6.5" height="3.6" rx="1.8" fill="white" stroke="#121316" strokeWidth="1.8" />
              <rect x="6.5" y="59.5" width="8" height="3.8" rx="1.9" fill="white" stroke="#121316" strokeWidth="1.8" />
              <rect x="5" y="56" width="9.5" height="3.8" rx="1.9" fill="white" stroke="#121316" strokeWidth="1.8" />
              <rect x="0" y="52.5" width="14.5" height="4.2" rx="2.1" fill="white" stroke="#121316" strokeWidth="1.8" />
              <path d="M 13.5 55.5 C 10.5 55.5, 9 53.5, 10 51 C 11 49, 13.5 49.5, 14 52 Z" fill="white" stroke="#121316" strokeWidth="1.8" strokeLinejoin="round" />
              <rect x="13.5" y="50.5" width="4.5" height="16.5" rx="2.25" fill="white" stroke="#121316" strokeWidth="1.8" />
            </g>
          </g>
        )}

        {isScanning && (
          <g>
            <line x1="44" y1="32" x2="52" y2="33" stroke="#121316" strokeWidth="2" strokeLinecap="round" />
            <line x1="68" y1="33" x2="76" y2="32" stroke="#121316" strokeWidth="2" strokeLinecap="round" />

            <circle cx="48" cy="40" r="7" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.8" />
            <line x1="44" y1="40" x2="52" y2="40" stroke="#B45309" strokeWidth="2.6" strokeLinecap="round" />

            <circle cx="72" cy="40" r="7" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.8" />
            <line x1="68" y1="40" x2="76" y2="40" stroke="#B45309" strokeWidth="2.6" strokeLinecap="round" />

            <line x1="56" y1="51" x2="64" y2="51" stroke="#121316" strokeWidth="2" strokeLinecap="round" />

            <circle cx="28" cy="46" r="8" fill="none" stroke="#D97706" strokeWidth="2.6" />
            <circle cx="28" cy="46" r="6.5" fill="#FEF3C7" opacity="0.35" />
            <line x1="34" y1="52" x2="41" y2="59" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {isError && (
          <g>
            <path d="M 43 29 L 52 33" stroke="#121316" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 77 29 L 68 33" stroke="#121316" strokeWidth="2.2" strokeLinecap="round" />

            <circle cx="48" cy="39" r="8" fill="white" stroke="#991B1B" strokeWidth="2" />
            <circle cx="48" cy="39" r="3.2" fill="#DC2626" />
            <circle cx="46.8" cy="37.8" r="1.1" fill="white" />

            <circle cx="72" cy="39" r="8" fill="white" stroke="#991B1B" strokeWidth="2" />
            <circle cx="72" cy="39" r="3.2" fill="#DC2626" />
            <circle cx="70.8" cy="37.8" r="1.1" fill="white" />

            <ellipse cx="60" cy="52" rx="4.5" ry="5.5" fill="#991B1B" stroke="#121316" strokeWidth="1.6" />
          </g>
        )}

        {isSuccess && (
          <g>
            <path d="M 43 28 C 46 25, 52 25, 54 28" stroke="#121316" strokeWidth="2" strokeLinecap="round" />
            <path d="M 66 28 C 68 25, 74 25, 77 28" stroke="#121316" strokeWidth="2" strokeLinecap="round" />

            <circle cx="48" cy="39" r="7.5" fill="white" stroke="#121316" strokeWidth="1.8" />
            <path d="M 43 41 Q 48 34 53 41" fill="none" stroke="#121316" strokeWidth="2.5" strokeLinecap="round" />

            <circle cx="72" cy="39" r="7.5" fill="white" stroke="#121316" strokeWidth="1.8" />
            <path d="M 67 41 Q 72 34 77 41" fill="none" stroke="#121316" strokeWidth="2.5" strokeLinecap="round" />

            <ellipse cx="38" cy="46" rx="3.8" ry="2.2" fill="#F472B6" opacity="0.8" />
            <ellipse cx="82" cy="46" rx="3.8" ry="2.2" fill="#F472B6" opacity="0.8" />

            <path d="M 53 49 Q 60 62 67 49 Z" fill="#DC2626" stroke="#121316" strokeWidth="1.8" />
            <path d="M 56 55 Q 60 52 64 55" fill="#FCA5A5" />

            <g id="success-hand">
              <path d="M 87 58 Q 95 58 102 58" fill="none" stroke="#0052FF" strokeWidth="4.5" strokeLinecap="round" />
              <rect x="103" y="59.5" width="8" height="3.8" rx="1.9" fill="white" stroke="#121316" strokeWidth="1.8" />
              <rect x="103" y="56" width="9" height="3.8" rx="1.9" fill="white" stroke="#121316" strokeWidth="1.8" />
              <rect x="103" y="52.5" width="9.5" height="4.2" rx="2.1" fill="white" stroke="#121316" strokeWidth="1.8" />
              <rect x="102" y="41" width="4.8" height="13" rx="2.4" fill="white" stroke="#121316" strokeWidth="1.8" />
              <line x1="103" y1="47.5" x2="105.8" y2="47.5" stroke="#121316" strokeWidth="0" strokeLinecap="round" />
              <rect x="101.9" y="50.5" width="4.5" height="16.5" rx="2.25" fill="white" stroke="#121316" strokeWidth="1.8" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};