import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/appInfo';

export const metadata: Metadata = {
  title: 'Politique de confidentialité · Privacy policy',
  description: 'How Ultime Player handles your data. / Comment Ultime Player traite vos données.',
};

type Block = { h: string; p: string[] };

const UPDATED = '19/10/2026';

const FR: { title: string; intro: string; blocks: Block[] } = {
  title: 'Politique de confidentialité',
  intro: `Ultime Player est un jeu de simulation de carrière de footballeur. Dernière mise à jour : ${UPDATED}.`,
  blocks: [
    {
      h: 'Ce que nous ne collectons pas',
      p: [
        'Le jeu n’a pas de compte, pas de mot de passe et pas de serveur. Nous ne vous demandons ni nom réel, ni e-mail, ni numéro de téléphone, ni localisation, ni accès à vos contacts.',
        'Nous ne vendons aucune donnée et nous ne reconstituons aucun profil de vous.',
      ],
    },
    {
      h: 'Votre partie',
      p: [
        'Votre carrière (nom de joueur, club, statistiques, argent du jeu, vies, boosts) est enregistrée uniquement sur votre appareil. Elle n’est envoyée nulle part. Supprimer l’app supprime la partie.',
        'Le nom du joueur est un nom fictif que vous choisissez : il reste dans l’app, sauf si vous partagez vous-même une image (carte joueur, une de journal) via la feuille de partage de votre téléphone.',
      ],
    },
    {
      h: 'Achats intégrés',
      p: [
        'Les achats (vies illimitées 3 h / 24 h, boosts de match) sont traités par Apple via l’App Store. Nous ne recevons ni votre moyen de paiement ni vos informations de facturation.',
      ],
    },
    {
      h: 'Publicités récompensées (Google AdMob)',
      p: [
        'L’app propose des vidéos récompensées facultatives (par exemple pour gagner des vies). Elles sont fournies par Google AdMob. Pour afficher et mesurer ces publicités, Google peut traiter, sur votre appareil, des identifiants (dont l’identifiant publicitaire si vous l’autorisez), une localisation approximative déduite de l’adresse IP, des données d’interaction avec la publicité et des données de diagnostic.',
        'Dans l’Espace économique européen et au Royaume-Uni, un formulaire de consentement Google s’affiche avant la première publicité. Sur iPhone, l’app vous demande aussi l’autorisation de suivi (ATT) : vous pouvez refuser et continuer à jouer, avec des publicités moins personnalisées. Vous pouvez la modifier à tout moment dans Réglages › Confidentialité et sécurité › Suivi.',
        'Plus d’informations : https://policies.google.com/privacy',
      ],
    },
    {
      h: 'Game Center et notifications',
      p: [
        'Si vous êtes connecté à Game Center, l’app envoie à Apple votre total de buts et vos réalisations pour le classement et les succès : ces données sont gérées par Apple selon sa politique de confidentialité, avec le pseudo de votre compte Game Center. Rien n’est envoyé si vous n’êtes pas connecté.',
        'Les notifications (vies de retour, rappel si vous êtes absent) sont facultatives. Elles sont programmées sur votre appareil, sans serveur, et vous pouvez les couper dans Paramètres ou dans les réglages de l’iPhone.',
      ],
    },
    {
      h: 'Conservation et suppression',
      p: [
        'Nous ne conservons aucune donnée vous concernant. Les données de partie disparaissent avec la désinstallation de l’app. Pour les données traitées par Google ou Apple, reportez-vous à leurs politiques de confidentialité.',
      ],
    },
    {
      h: 'Enfants',
      p: ['Ultime Player n’est pas destiné aux enfants de moins de 13 ans et ne collecte sciemment aucune donnée les concernant.'],
    },
    {
      h: 'Version web',
      p: [
        'La version web du jeu n’affiche aucune publicité et ne propose aucun paiement. Elle enregistre votre partie dans le stockage local de votre navigateur et peut mettre des fichiers en cache pour fonctionner hors ligne.',
      ],
    },
    {
      h: 'Modifications et contact',
      p: [
        'Cette politique peut évoluer ; la date de mise à jour figure en haut de la page. Pour toute question ou demande, écrivez à ' + CONTACT_EMAIL + '.',
      ],
    },
  ],
};

const EN: { title: string; intro: string; blocks: Block[] } = {
  title: 'Privacy policy',
  intro: `Ultime Player is a football career simulation game. Last updated: ${UPDATED}.`,
  blocks: [
    {
      h: 'What we do not collect',
      p: [
        'The game has no account, no password and no server. We do not ask for your real name, e-mail, phone number, location or access to your contacts.',
        'We do not sell any data and we do not build a profile of you.',
      ],
    },
    {
      h: 'Your save',
      p: [
        'Your career (player name, club, statistics, game money, lives, boosts) is stored on your device only. It is not sent anywhere. Deleting the app deletes the save.',
        'The player name is a made-up name you choose: it stays inside the app, unless you share an image yourself (player card, newspaper front page) through your phone’s share sheet.',
      ],
    },
    {
      h: 'In-app purchases',
      p: [
        'Purchases (unlimited lives for 3 h / 24 h, match boosts) are processed by Apple through the App Store. We receive neither your payment method nor your billing details.',
      ],
    },
    {
      h: 'Rewarded ads (Google AdMob)',
      p: [
        'The app offers optional rewarded videos (for example to earn lives). They are provided by Google AdMob. To show and measure these ads, Google may process, on your device, identifiers (including the advertising identifier if you allow it), an approximate location derived from the IP address, ad interaction data and diagnostics.',
        'In the European Economic Area and the United Kingdom, a Google consent form is shown before the first ad. On iPhone, the app also asks for tracking permission (ATT): you can decline and keep playing, with less personalised ads. You can change it at any time in Settings › Privacy & Security › Tracking.',
        'More information: https://policies.google.com/privacy',
      ],
    },
    {
      h: 'Game Center and notifications',
      p: [
        'If you are signed in to Game Center, the app sends Apple your total goals and your achievements for the leaderboard and the achievements: this data is handled by Apple under its privacy policy, with your Game Center nickname. Nothing is sent if you are not signed in.',
        'Notifications (lives back, a reminder if you are away) are optional. They are scheduled on your device, with no server, and you can turn them off in Settings or in iPhone settings.',
      ],
    },
    {
      h: 'Retention and deletion',
      p: [
        'We keep no data about you. Save data disappears when the app is uninstalled. For data processed by Google or Apple, please refer to their privacy policies.',
      ],
    },
    {
      h: 'Children',
      p: ['Ultime Player is not directed at children under 13 and does not knowingly collect data about them.'],
    },
    {
      h: 'Web version',
      p: [
        'The web version of the game shows no ads and offers no payments. It stores your save in your browser’s local storage and may cache files so the game works offline.',
      ],
    },
    {
      h: 'Changes and contact',
      p: [
        'This policy may change; the update date is at the top of the page. For any question or request, write to ' + CONTACT_EMAIL + '.',
      ],
    },
  ],
};

function Section({ doc, lang }: { doc: typeof FR; lang: string }) {
  return (
    <section lang={lang} className="mt-10 first:mt-0">
      <h1 className="font-display text-4xl font-extrabold uppercase leading-none text-zinc-50">{doc.title}</h1>
      <p className="mt-3 text-sm text-zinc-400">{doc.intro}</p>
      {doc.blocks.map((b) => (
        <div key={b.h} className="mt-6">
          <h2 className="text-[15px] font-bold text-gold-300">{b.h}</h2>
          {b.p.map((t) => (
            <p key={t} className="mt-2 text-[14px] leading-relaxed text-zinc-300">
              {t}
            </p>
          ))}
        </div>
      ))}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="px-5 pb-16 pt-[calc(2rem+env(safe-area-inset-top))]">
      <Link href="/settings" className="mb-6 inline-block text-[13px] font-semibold text-neon-300">
        ← Paramètres · Settings
      </Link>
      <p className="eyebrow mb-6">Ultime Player</p>
      <Section doc={FR} lang="fr" />
      <hr className="my-10 border-white/10" />
      <Section doc={EN} lang="en" />
    </main>
  );
}
