import React, { createContext, useContext, useMemo, useState } from 'react';

// Counts the context panel shows next to its items (projects per view and
// type, team members, invitations, guests). Pages publish what they loaded;
// the panel shows a count only once it is known.
const ShellContext = createContext({ counts: {}, setCounts: () => {} });

export function ShellProvider({ children }) {
  const [counts, setCountsState] = useState({});
  const value = useMemo(() => ({
    counts,
    // Merge, and skip the update when nothing changed (avoids render loops)
    setCounts: (next) => setCountsState((prev) => {
      const merged = { ...prev, ...next };
      return Object.keys(merged).every((k) => merged[k] === prev[k]) ? prev : merged;
    }),
  }), [counts]);
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  return useContext(ShellContext);
}
