import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { ThemeToggle } from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: {
    default: 'Eram Style Advisor',
    template: '%s — Eram Style Advisor',
  },
  description:
    'Conseiller virtuel de tenues — recommandations multi-marques (Eram, Gemo, TBS, Bocage) selon votre occasion, budget et style.',
};

/**
 * Script anti-FOUC (Flash Of Unstyled Content).
 * S'exécute AVANT le 1er paint pour éviter qu'un utilisateur en mode sombre
 * voie d'abord la page en clair pendant l'hydratation React.
 *
 * Lit `localStorage.theme` ; à défaut respecte `prefers-color-scheme`.
 */
const themeInitScript = `
try {
  var stored = localStorage.getItem('theme');
  var theme = stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      {/*
        suppressHydrationWarning : pattern documenté pour les scripts anti-FOUC qui
        modifient le DOM avant l'hydratation React. Le serveur rend <html lang="fr">,
        le client a en plus data-theme="light|dark" — le warning n'est pas pertinent ici.
      */}
      <head>
        {/* Doit s'exécuter avant le rendu pour appliquer le thème sans flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {/* RGAA 12.7 — lien d'évitement vers le contenu principal */}
        <a href="#contenu-principal" className="skip-to-content">
          Aller au contenu principal
        </a>

        <header
          className="border-b"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-semibold no-underline"
              style={{ color: 'var(--color-foreground)' }}
            >
              Eram Style Advisor
            </Link>
            <nav aria-label="Navigation principale" className="flex items-center gap-3">
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <main id="contenu-principal" className="flex-1">
          {children}
        </main>

        <footer
          className="border-t mt-12"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div
            className="mx-auto max-w-6xl px-4 py-6 text-sm"
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            <p>
              Projet pédagogique — démonstrateur interne. Données produits fictives,
              sans lien commercial avec le Groupe Eram.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
