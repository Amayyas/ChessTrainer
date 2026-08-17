import { PageHeader } from '@/components/UI'
import { LegalPlaceholderNotice, Section, TODO } from '@/features/legal/shared'

/**
 * Legal notice, which French law requires of any published website. The
 * publisher's own details cannot be read off the code, so they are marked for
 * filling in rather than invented.
 */
export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Mentions légales" subtitle="Éditeur, hébergement et contact." />

      <LegalPlaceholderNotice />

      <Section title="Éditeur du site">
        <p>
          ChessTrainer AI est édité par <strong>Amayyas Aouadene</strong>.
        </p>
        <p>
          Statut : particulier, publiant à titre non professionnel
          <br />
          Contact :{' '}
          <a className="font-semibold text-ebene underline" href="mailto:contact@chesstrainer.fr">
            contact@chesstrainer.fr
          </a>
          <br />
          Directeur de la publication : Amayyas Aouadene
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          L'application est hébergée par <strong>Netlify, Inc.</strong>, San Francisco, Californie,
          États-Unis. Les comptes et les données de jeu sont hébergés par <strong>Supabase</strong>,
          dans la région <TODO>région de votre projet Supabase</TODO>.
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          Le code source de ChessTrainer AI est publié sur GitHub. Le moteur d'analyse Stockfish est
          un logiciel libre distribué sous licence GPL v3&nbsp;; sa licence complète est fournie
          avec l'application.
        </p>
      </Section>

      <Section title="Nature du service">
        <p>
          ChessTrainer AI est un outil d'entraînement aux échecs proposé en l'état. Les analyses
          produites par le moteur sont indicatives et ne constituent pas un enseignement certifié.
        </p>
      </Section>
    </div>
  )
}
