import { useId } from 'react';

// Mangi, the Mangao mango mascot, drawn in SVG. `mood` changes the face and small props.
export default function Mangi({ mood = 'happy', className = '', label }) {
  const id = useId().replace(/:/g, '');
  const sad = mood === 'sad';
  return (
    <svg viewBox="0 0 132 130" xmlns="http://www.w3.org/2000/svg" className={className}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={id} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#FFC21A" /><stop offset=".55" stopColor="#F5A900" /><stop offset="1" stopColor="#F07824" />
        </linearGradient>
      </defs>
      {mood === 'ride' && <path d="M2 70 h12 M0 84 h16 M4 98 h10" stroke="#F5A900" strokeWidth="4" strokeLinecap="round" />}
      <path d="M62 20 L64 9 L69 10 L66 21 Z" fill="#7A4A1E" />
      <path d="M66 18 C70 6 84 0 98 2 C106 3 112 7 114 10 C104 18 90 24 74 22 C70 21 67 20 66 18 Z" fill="#4E9A3E" />
      <path d="M70 18 C82 12 96 8 110 9" fill="none" stroke="#2F6B25" strokeWidth="2" strokeLinecap="round" />
      <path d="M64 20 C92 22 110 50 106 82 C102 110 80 124 56 122 C30 120 12 100 14 72 C16 44 38 18 64 20 Z" fill={`url(#${id})`} />
      <ellipse cx="38" cy="48" rx="9" ry="14" transform="rotate(25 38 48)" fill="#fff" opacity=".35" />
      {mood === 'help' && (
        <>
          <path d="M22 70 C20 34 100 30 100 70" fill="none" stroke="#202124" strokeWidth="5" strokeLinecap="round" />
          <rect x="14" y="62" width="12" height="20" rx="5" fill="#202124" /><rect x="95" y="62" width="12" height="20" rx="5" fill="#202124" />
        </>
      )}
      {sad && <path d="M38 54 L50 58 M82 54 L70 58" stroke="#202124" strokeWidth="3" strokeLinecap="round" />}
      <ellipse cx="47" cy="68" rx="5.5" ry={sad ? 6 : 7} fill="#202124" /><ellipse cx="73" cy="68" rx="5.5" ry={sad ? 6 : 7} fill="#202124" />
      <circle cx="49" cy="65" r="2" fill="#fff" /><circle cx="75" cy="65" r="2" fill="#fff" />
      <ellipse cx="36" cy="82" rx="6" ry="4" fill="#E8604A" opacity=".35" /><ellipse cx="85" cy="82" rx="6" ry="4" fill="#E8604A" opacity=".35" />
      {sad
        ? <path d="M50 92 Q60 84 70 92" fill="none" stroke="#202124" strokeWidth="4" strokeLinecap="round" />
        : mood === 'wave'
          ? <><path d="M47 84 Q60 98 73 84 Z" fill="#202124" /><path d="M52 89 Q60 95 68 89" fill="#E8604A" /></>
          : <path d="M49 85 Q60 95 71 85" fill="none" stroke="#202124" strokeWidth="4" strokeLinecap="round" />}
      {mood === 'wave' && (
        <g>
          <path d="M104 74 Q116 62 114 48" fill="none" stroke="#F07824" strokeWidth="7" strokeLinecap="round" />
          <circle cx="114" cy="45" r="6" fill="#F5A900" />
          <path d="M122 36 l5 -4 M124 46 l6 0" stroke="#202124" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
