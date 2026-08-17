import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/UI'
import { Section } from '@/features/legal/shared'
import { isMonitoringEnabled } from '@/lib/monitoring'
import { ROUTES } from '@/routes'

/**
 * Privacy policy. Everything here is checked against what the app actually
 * stores rather than copied from a template: the tables in `supabase/migrations`
 * are the full extent of it, and the app carries no analytics or advertising of
 * any kind.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Politique de confidentialité"
        subtitle="Ce que l'application enregistre, pourquoi, et comment tout effacer."
      />

      <Section title="En bref">
        <p>
          Vous pouvez utiliser les quatre modes de jeu <strong>sans créer de compte</strong>. Dans
          ce cas, votre progression reste dans votre navigateur et rien n'est envoyé.
        </p>
        <p>
          Un compte ne sert qu'à deux choses : retrouver votre progression sur vos autres appareils,
          et figurer au classement mondial. Il n'y a ni publicité, ni traceur, ni revente de
          données.
        </p>
      </Section>

      <Section title="Données enregistrées avec un compte">
        <p>
          <strong>Votre identité de joueur</strong> : adresse e-mail, pseudo, pièce d'avatar et date
          d'inscription. Si vous passez par Google, votre adresse nous est transmise par Google au
          moment de la connexion.
        </p>
        <p>
          <strong>Votre jeu</strong> : scores de la Chasse aux Pièces (pièce, points, captures,
          date), points d'expérience, statistiques (parties jouées et gagnées, précision moyenne,
          puzzles résolus, captures, mats), badges débloqués et série de puzzles.
        </p>
        <p>
          <strong>Vos manches en cours</strong> : l'heure d'ouverture de chaque manche de Chasse est
          enregistrée. Elle sert uniquement à vérifier qu'un score soumis correspond à une partie
          réellement jouée.
        </p>
      </Section>

      <Section title="Ce qui est visible par les autres">
        <p>
          Publics : votre <strong>pseudo</strong>, votre <strong>avatar</strong>, vos{' '}
          <strong>scores</strong> au classement et vos <strong>badges</strong>.
        </p>
        <p>
          Privés : votre <strong>adresse e-mail</strong> et l'ensemble de votre{' '}
          <strong>progression personnelle</strong>. La base de données refuse leur lecture par
          quiconque d'autre que vous.
        </p>
      </Section>

      <Section title="Sans compte">
        <p>
          En mode invité, votre progression est conservée dans le stockage local de votre
          navigateur. Elle ne quitte pas votre appareil, et l'effacer suffit à la supprimer.
        </p>
        <p>
          Une fois connecté, l'application conserve aussi votre session dans ce même stockage local,
          afin de ne pas vous redemander votre mot de passe à chaque visite. L'application n'utilise
          aucun cookie.
        </p>
      </Section>

      <Section title="Pourquoi, et pendant combien de temps">
        <p>
          Ces données sont nécessaires au service que vous demandez en créant un compte : elles ne
          servent à rien d'autre. Aucune n'est transmise à un tiers à des fins commerciales.
        </p>
        <p>
          Elles sont conservées tant que votre compte existe. Elles sont hébergées par Supabase dans
          l'Union européenne (Irlande) et ne quittent pas ce territoire.
        </p>
      </Section>

      {/* Rendered only when reporting is actually configured, so this document
          can never claim a processor the deployed app does not use. */}
      {isMonitoringEnabled && (
        <Section title="Signalement des erreurs">
          <p>
            Quand l'application rencontre une erreur, un rapport technique est envoyé
            automatiquement à <strong>Sentry</strong>, qui héberge ces rapports dans l'Union
            européenne. Cela nous permet de corriger les pannes sans attendre qu'un joueur les
            signale.
          </p>
          <p>
            <strong>Ce que contient un rapport</strong> : le message d'erreur et sa trace technique,
            l'adresse de la page concernée, votre navigateur et votre système d'exploitation, ainsi
            que les dernières actions techniques qui ont précédé l'erreur — navigation, clics,
            requêtes envoyées.
          </p>
          <p>
            <strong>Ce qu'il ne contient pas</strong> : ni votre adresse IP, ni votre identifiant de
            compte, ni votre adresse e-mail, ni enregistrement de votre session. L'application ne
            mesure pas non plus votre audience ni vos performances&nbsp;: seules les erreurs sont
            transmises.
          </p>
        </Section>
      )}

      <Section title="Vos droits">
        <p>
          Vous pouvez <strong>supprimer votre compte à tout moment</strong> depuis votre{' '}
          <Link to={ROUTES.profile} className="font-semibold text-ebene underline">
            page de profil
          </Link>
          . La suppression est immédiate et définitive : elle efface le compte, les scores, la
          progression et les badges, sans étape intermédiaire ni délai de rétractation.
        </p>
        <p>
          Vous disposez également des droits d'accès, de rectification, de portabilité et
          d'opposition prévus par le RGPD. Pour les exercer, écrivez à{' '}
          <a className="font-semibold text-ebene underline" href="mailto:contact@chesstrainer.fr">
            contact@chesstrainer.fr
          </a>
          .
        </p>
        <p>
          Vous pouvez enfin introduire une réclamation auprès de la CNIL, l'autorité française de
          protection des données.
        </p>
      </Section>
    </div>
  )
}
