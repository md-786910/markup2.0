// Matches the Kommently design system Avatar tones (AVATAR_TONES in kc):
// 0: default brand blue (#003dff / bg-blue-600)
// 1: green (#047857 / bg-emerald-700)
// 2: amber (var(--warning-700) #b45309 / bg-amber-600)
// 3: rose (#be123c / bg-rose-700)
// 4: slate (var(--slate-600) #475569 / bg-slate-600)

export const AVATAR_COLORS = [
  { bg: 'bg-blue-600', text: 'text-white', hex: '#003dff' },
  { bg: 'bg-[#047857]', text: 'text-white', hex: '#047857' },
  { bg: 'bg-[#b45309]', text: 'text-white', hex: '#b45309' },
  { bg: 'bg-[#be123c]', text: 'text-white', hex: '#be123c' },
  { bg: 'bg-[#475569]', text: 'text-white', hex: '#475569' },
];

export function getAvatarColor(id, index) {
  if (typeof index === 'number' && index >= 0) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  }
  let hash = 0;
  const str = String(id || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

