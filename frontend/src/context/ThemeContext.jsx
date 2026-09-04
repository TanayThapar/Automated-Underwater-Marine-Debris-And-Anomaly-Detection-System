import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = {
  'terminal-mono': {
    id: 'terminal-mono',
    name: 'ANSI MONOCHROME',
    subtitle: 'Pure Terminal White / Black',
    dotColor: '#f5f5f5',
    primary: '#f5f5f5',
    accent: '#ffffff',
    bgRadial: 'radial-gradient(at 50% 0%, rgba(255, 255, 255, 0.03) 0px, #050505 70%)',
    ambient1: 'bg-neutral-800/10',
    ambient2: 'bg-neutral-900/10',
    glowClass: 'glow-mono',
    textGradient: 'from-neutral-100 via-neutral-200 to-neutral-400',
    navBorder: 'border-neutral-800',
    navLogoBox: 'from-neutral-900 to-black border-neutral-700 glow-mono',
    navLogoText: 'text-neutral-100',
    navBadge: 'bg-neutral-900 text-neutral-300 border-neutral-700',
    activeTabPill: 'from-neutral-900 to-black border-neutral-400 glow-mono',
    activeTabText: 'text-white font-bold',
    tabIconActive: 'text-white',
    btnPrimary: 'bg-white hover:bg-neutral-200 text-black font-bold font-mono shadow-neutral-900',
    cardBorder: 'border-neutral-800',
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentThemeId] = useState('terminal-mono');

  const currentTheme = THEMES['terminal-mono'];

  useEffect(() => {
    try {
      localStorage.setItem('sih_auv_theme', 'terminal-mono');
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-theme', 'terminal-mono');
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, currentThemeId, setTheme: () => {}, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
