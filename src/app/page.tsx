import { BriefForm } from '@/components/BriefForm';

/**
 * Page d'accueil — formulaire de brief utilisateur.
 *
 * Server Component (par défaut). Rend `<BriefForm />`, qui est un Client
 * Component car il gère l'état du formulaire (genre sélectionné, erreurs Zod,
 * soumission).
 */
export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold tracking-tight mb-3">
        Trouvez votre tenue idéale
      </h1>
      <p
        className="text-lg mb-10"
        style={{ color: 'var(--color-foreground-muted)' }}
      >
        Décrivez votre occasion, votre style et votre budget — nous composons
        deux tenues parmi les marques du groupe Eram (Eram, Gemo, TBS, Bocage).
      </p>
      <BriefForm />
    </div>
  );
}
