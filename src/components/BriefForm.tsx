'use client';

import { useId, useState, type FormEvent } from 'react';
import {
  briefSchema,
  BRIEF_GENRES,
  BRIEF_TAILLES_HAUT,
  BRIEF_TAILLES_BAS,
  type BriefGenre,
} from '@/types/brief';
import { OCCASIONS, STYLES } from '@/types/product';

type FieldErrors = Partial<Record<string, string[]>>;

const MOIS_LABELS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/**
 * Formulaire principal de la page d'accueil.
 *
 * Client Component (gère l'état : genre sélectionné, erreurs Zod, soumission).
 * Validation Zod côté client ; côté serveur (à venir étape API), on revalide
 * avec le même schéma — le navigateur n'est jamais une source de confiance.
 *
 * RGAA :
 * - 11.1 : chaque <input>/<select> a un <label> associé via `id` + `htmlFor`.
 * - 11.10 : erreurs annoncées via `role="alert"` + `aria-live="polite"` global.
 * - 11.11 : `aria-describedby` lie le champ à son aide ET à son erreur éventuelle.
 * - 9.1 : structure sémantique avec `<fieldset>` / `<legend>` pour les radio
 *   (genre) et les checkbox (styles).
 * - 12.8 : ordre de tabulation logique (haut → bas du formulaire).
 *
 * RGESN-0009 : 1 seule transition CSS (sur le bouton submit).
 */
export function BriefForm() {
  // Identifiants stables pour les liaisons label/input/error (RGAA 11.1, 11.11).
  const ids = {
    occasion: useId(),
    mois: useId(),
    budget: useId(),
    styles: useId(),
    tailleHaut: useId(),
    tailleBas: useId(),
    formError: useId(),
  };

  const [genre, setGenre] = useState<BriefGenre>('femme');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const taillesHaut = BRIEF_TAILLES_HAUT[genre];
  const taillesBas = BRIEF_TAILLES_BAS[genre];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    // Helper : un <select> avec une option disabled selected peut renvoyer null
    // au lieu d'une chaîne vide selon le navigateur. On normalise pour que Zod
    // voie systématiquement une string et déclenche nos messages métier.
    const rawString = (key: string): string => {
      const v = formData.get(key);
      return typeof v === 'string' ? v : '';
    };
    const raw = {
      occasion: rawString('occasion'),
      mois: rawString('mois'),
      genre: rawString('genre'),
      budget_eur: rawString('budget_eur'),
      // FormData.getAll() retourne FormDataEntryValue[] (string | File). Pour des
      // checkboxes, ce sont uniquement des strings : on filtre par sécurité TS.
      styles: formData.getAll('styles').filter((v): v is string => typeof v === 'string'),
      taille_haut: rawString('taille_haut'),
      taille_bas: rawString('taille_bas'),
    };

    const result = briefSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      setErrors(fieldErrors);
      // RGAA 11.10 : focus sur le 1er champ en erreur pour aider la navigation clavier.
      const firstErrorField = result.error.issues[0]?.path.join('.');
      if (firstErrorField) {
        const el = e.currentTarget.querySelector<HTMLElement>(
          `[name="${firstErrorField}"]`,
        );
        el?.focus();
      }
      return;
    }

    setSubmitting(true);
    try {
      // TODO étape 4 — appel à /api/recommend (préfiltrage + Claude).
      // Pour l'instant : log + simulation pour valider visuellement.
      console.log('Brief validé :', result.data);
      await new Promise((r) => setTimeout(r, 600));
      alert(
        `Brief validé. Étape suivante : appel à l’API de recommandation (à venir).\n\n${JSON.stringify(result.data, null, 2)}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(name: string): string | undefined {
    return errors[name]?.[0];
  }

  // Style commun pour les <select> et <input>.
  const inputStyle = {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-foreground)',
    borderColor: 'var(--color-border)',
  };
  const inputClassName =
    'w-full px-3 py-2 rounded-md border focus-visible:border-[var(--color-accent)]';

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby={ids.formError}>
      {/* Occasion ============================================================ */}
      <div className="mb-6">
        <label htmlFor={ids.occasion} className="block font-medium mb-2">
          Occasion <RequiredMark />
        </label>
        <select
          id={ids.occasion}
          name="occasion"
          required
          aria-invalid={!!fieldError('occasion')}
          aria-describedby={fieldError('occasion') ? `${ids.occasion}-err` : undefined}
          className={inputClassName}
          style={inputStyle}
          defaultValue=""
        >
          <option value="" disabled>
            Choisir une occasion…
          </option>
          {OCCASIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {fieldError('occasion') && (
          <FieldError id={`${ids.occasion}-err`}>{fieldError('occasion')}</FieldError>
        )}
      </div>

      {/* Mois =============================================================== */}
      <div className="mb-6">
        <label htmlFor={ids.mois} className="block font-medium mb-2">
          Mois de l’événement <RequiredMark />
        </label>
        <select
          id={ids.mois}
          name="mois"
          required
          aria-invalid={!!fieldError('mois')}
          aria-describedby={fieldError('mois') ? `${ids.mois}-err` : undefined}
          className={inputClassName}
          style={inputStyle}
          defaultValue=""
        >
          <option value="" disabled>
            Choisir un mois…
          </option>
          {MOIS_LABELS.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </select>
        {fieldError('mois') && (
          <FieldError id={`${ids.mois}-err`}>{fieldError('mois')}</FieldError>
        )}
      </div>

      {/* Genre (radio group) ================================================ */}
      <fieldset className="mb-6 border-0 p-0">
        <legend className="font-medium mb-2">
          Pour qui ? <RequiredMark />
        </legend>
        <div className="flex flex-wrap gap-4">
          {BRIEF_GENRES.map((g) => (
            <label key={g} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="genre"
                value={g}
                checked={genre === g}
                onChange={() => setGenre(g)}
                required
              />
              <span className="capitalize">{g}</span>
            </label>
          ))}
        </div>
        {fieldError('genre') && <FieldError>{fieldError('genre')}</FieldError>}
      </fieldset>

      {/* Budget ============================================================= */}
      <div className="mb-6">
        <label htmlFor={ids.budget} className="block font-medium mb-2">
          Budget (€) <RequiredMark />
        </label>
        <input
          id={ids.budget}
          name="budget_eur"
          type="number"
          min={20}
          max={1000}
          step={10}
          required
          inputMode="numeric"
          aria-invalid={!!fieldError('budget_eur')}
          aria-describedby={`${ids.budget}-help${fieldError('budget_eur') ? ` ${ids.budget}-err` : ''}`}
          className={inputClassName}
          style={inputStyle}
          defaultValue={150}
        />
        <p
          id={`${ids.budget}-help`}
          className="mt-1 text-sm"
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          Entre 20 et 1000 €. La tenue « premium » peut dépasser de 15 % au plus.
        </p>
        {fieldError('budget_eur') && (
          <FieldError id={`${ids.budget}-err`}>{fieldError('budget_eur')}</FieldError>
        )}
      </div>

      {/* Styles (checkbox multi) ============================================ */}
      <fieldset className="mb-6 border-0 p-0">
        <legend className="font-medium mb-2">
          Styles préférés <RequiredMark />
        </legend>
        <p
          id={`${ids.styles}-help`}
          className="mb-2 text-sm"
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          Choisissez 1 à 3 styles.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STYLES.map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="styles"
                value={s}
                aria-describedby={`${ids.styles}-help`}
              />
              <span className="capitalize">{s}</span>
            </label>
          ))}
        </div>
        {fieldError('styles') && <FieldError>{fieldError('styles')}</FieldError>}
      </fieldset>

      {/* Tailles =========================================================== */}
      <div className="mb-6 grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={ids.tailleHaut} className="block font-medium mb-2">
            Taille haut <RequiredMark />
          </label>
          <select
            // `key` lié au genre : remonte le <select> quand le genre change pour
            // forcer la réinitialisation (les tailles enfant ≠ adulte).
            key={`taille-haut-${genre}`}
            id={ids.tailleHaut}
            name="taille_haut"
            required
            aria-invalid={!!fieldError('taille_haut')}
            aria-describedby={
              fieldError('taille_haut') ? `${ids.tailleHaut}-err` : undefined
            }
            className={inputClassName}
            style={inputStyle}
            defaultValue=""
          >
            <option value="" disabled>
              Choisir…
            </option>
            {taillesHaut.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {fieldError('taille_haut') && (
            <FieldError id={`${ids.tailleHaut}-err`}>{fieldError('taille_haut')}</FieldError>
          )}
        </div>
        <div>
          <label htmlFor={ids.tailleBas} className="block font-medium mb-2">
            Taille bas <RequiredMark />
          </label>
          <select
            key={`taille-bas-${genre}`}
            id={ids.tailleBas}
            name="taille_bas"
            required
            aria-invalid={!!fieldError('taille_bas')}
            aria-describedby={
              fieldError('taille_bas') ? `${ids.tailleBas}-err` : undefined
            }
            className={inputClassName}
            style={inputStyle}
            defaultValue=""
          >
            <option value="" disabled>
              Choisir…
            </option>
            {taillesBas.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {fieldError('taille_bas') && (
            <FieldError id={`${ids.tailleBas}-err`}>{fieldError('taille_bas')}</FieldError>
          )}
        </div>
      </div>

      {/* Annonceur global d'erreurs (RGAA 11.10) ============================ */}
      <div
        id={ids.formError}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {Object.keys(errors).length > 0 &&
          `Le formulaire contient ${Object.keys(errors).length} erreur(s) à corriger.`}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-6 py-3 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-accent-foreground)',
        }}
      >
        {submitting ? 'Envoi…' : 'Voir mes recommandations'}
      </button>
    </form>
  );
}

/** Marque visuelle « obligatoire » avec annonce vocale appropriée (RGAA 11.10). */
function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" style={{ color: 'var(--color-error)' }}>
        *
      </span>
      <span className="sr-only"> obligatoire</span>
    </>
  );
}

/** Message d'erreur sous un champ — `role="alert"` pour annonce immédiate. */
function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-1 text-sm"
      style={{ color: 'var(--color-error)' }}
    >
      {children}
    </p>
  );
}
