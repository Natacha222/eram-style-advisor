'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/**
 * Bouton de bascule clair / sombre.
 *
 * Comportement :
 * - Au montage, lit le thème déjà appliqué par le script anti-FOUC du `<head>`.
 * - Au clic, bascule l'autre thème via `document.documentElement.dataset.theme`
 *   et persiste le choix dans `localStorage`.
 *
 * RGAA :
 * - 7.1 + 7.5 : bouton natif HTML, `aria-pressed` reflète l'état, `aria-label`
 *   décrit l'action plutôt que l'icône.
 * - 10.7 : focus visible géré par la règle globale `:focus-visible`.
 * - 11.10 : le `title` est cohérent avec l'`aria-label` (info en hover).
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Le script anti-FOUC du <head> a déjà posé `data-theme` sur <html> au 1er paint.
    // On lit cette valeur ici pour aligner l’état React avec le DOM. Le double-render
    // induit est intentionnel et limité au montage : c’est le pattern standard pour
    // hydrater un toggle de thème côté client après FOUC.
    /* eslint-disable react-hooks/set-state-in-effect */
    const current =
      (document.documentElement.dataset.theme as Theme | undefined) ?? 'light';
    setTheme(current);
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // localStorage indisponible (mode privé strict) : on accepte la perte
      // de persistance ; le thème reste appliqué pour la session courante.
    }
  }

  // Pendant SSR/hydratation, on rend un placeholder de même dimension
  // pour éviter un saut de mise en page (CLS).
  if (!mounted) {
    return <div aria-hidden="true" style={{ width: '2.5rem', height: '2.5rem' }} />;
  }

  const isDark = theme === 'dark';
  const label = isDark ? 'Activer le mode clair' : 'Activer le mode sombre';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className="inline-flex items-center justify-center w-10 h-10 rounded-md border transition-colors"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-foreground)',
      }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
