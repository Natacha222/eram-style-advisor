/**
 * Page d'accueil — formulaire de brief utilisateur.
 *
 * Pour l'instant : placeholder. Le formulaire (occasion, mois, genre, budget,
 * style, tailles) arrive à l'étape suivante du chantier J1 après-midi.
 */
export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        Trouvez votre tenue idéale
      </h1>
      <p
        className="text-lg mb-8"
        style={{ color: 'var(--color-foreground-muted)' }}
      >
        Décrivez votre occasion, votre style et votre budget — nous composons
        deux tenues parmi les marques du groupe Eram (Eram, Gemo, TBS, Bocage).
      </p>
      <p
        className="text-sm"
        style={{ color: 'var(--color-foreground-muted)' }}
      >
        <em>Le formulaire arrive à l’étape suivante.</em>
      </p>
    </div>
  );
}
