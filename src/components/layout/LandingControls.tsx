"use client";

import { useEffect, useState } from 'react';
import { HiOutlineSun, HiOutlineMoon, HiOutlineStar } from 'react-icons/hi2';

export default function LandingControls() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' && localStorage.getItem('bidnest-theme');
    if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('bidnest-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-foreground-muted hover:text-foreground"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
      </button>

      <a
        href={process.env.NEXT_PUBLIC_GITHUB_URL || 'https://Krishna-Vijay-G.github.io/Portfolio'}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-foreground-muted hover:text-foreground"
        title="Open GitHub"
      >
        <HiOutlineStar className="w-5 h-5" />
      </a>
    </div>
  );
}
