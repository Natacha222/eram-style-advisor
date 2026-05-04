import Image from 'next/image';
import type {
  RecommendationHydratee,
  TenueHydratee,
} from '@/types/recommendation';
import type { Product } from '@/types/product';

/**
 * Affichage des 2 tenues recommandées par l'IA.
 *
 * - `<section>` avec `aria-label` pour rôle de repère.
 * - Chaque tenue est un `<article>` avec son propre titre `<h2>` (RGAA 9.1).
 * - Les produits sont des `<a>` ouvrant le site marchand fictif (target=_blank
 *   + `rel="noopener noreferrer"` — cybersécurité, RGAA 13.x).
 * - `next/image` avec `fill` + `sizes` responsive (RGESN-0049 : AVIF/WebP/lazy).
 */
export function OutfitDisplay({
  recommendation,
}: {
  recommendation: RecommendationHydratee;
}) {
  return (
    <section
      id="tenues-recommandees"
      tabIndex={-1}
      aria-label="Tenues recommandées"
      className="mt-10 grid gap-6 lg:grid-cols-2"
    >
      <OutfitCard
        title="Tenue dans le budget"
        tenue={recommendation.tenue_budget}
      />
      <OutfitCard
        title="Tenue premium (jusqu’à +15 %)"
        tenue={recommendation.tenue_premium}
      />
    </section>
  );
}

function OutfitCard({
  title,
  tenue,
}: {
  title: string;
  tenue: TenueHydratee;
}) {
  return (
    <article
      className="rounded-lg border p-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span
          className="text-lg font-semibold whitespace-nowrap"
          style={{ color: 'var(--color-accent)' }}
        >
          {tenue.total_eur.toFixed(2)} €
        </span>
      </header>
      <p
        className="mb-4 text-sm italic"
        style={{ color: 'var(--color-foreground-muted)' }}
      >
        {tenue.justification}
      </p>
      <ul className="grid grid-cols-2 gap-3">
        {tenue.produits.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <a
      href={product.url_produit}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md border overflow-hidden no-underline transition-colors"
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-foreground)',
      }}
      aria-label={`${product.nom} de ${product.marque} — ${product.prix_eur.toFixed(2)} €, voir sur le site (s'ouvre dans un nouvel onglet)`}
    >
      <div className="relative w-full aspect-[3/4]">
        <Image
          src={product.image_url}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover"
        />
      </div>
      <div className="p-2">
        <p
          className="text-xs font-medium uppercase"
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          {product.marque}
        </p>
        <p className="text-sm leading-tight mt-0.5">{product.nom}</p>
        <p
          className="text-sm font-semibold mt-1"
          style={{ color: 'var(--color-accent)' }}
        >
          {product.prix_eur.toFixed(2)} €
        </p>
      </div>
    </a>
  );
}
