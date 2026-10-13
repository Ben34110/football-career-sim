import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, CONTACT_EMAIL } from '@/lib/appInfo';

export const metadata: Metadata = {
  title: 'Assistance · Support',
  description: 'Help and contact for Ultime Player. / Aide et contact pour Ultime Player.',
};

type Faq = { q: string; a: string };

const FR: { title: string; contact: string; faq: Faq[] } = {
  title: 'Assistance',
  contact: `Une question, un problème ou une idée ? Écris-nous à ${CONTACT_EMAIL}. Précise ton modèle d’iPhone et la version d’iOS si tu signales un bug.`,
  faq: [
    { q: 'Comment récupérer des vies ?', a: 'Une vie revient toutes les 3 minutes (jusqu’à 5). Tu peux aussi regarder une vidéo récompensée facultative (+3 vies) ou acheter un pass de vies illimitées pendant 3 h ou 24 h dans la Boutique.' },
    { q: 'Je ne retrouve pas mon achat.', a: 'Les vies illimitées et les boosts sont enregistrés sur ton appareil. Ils ne sont pas transférés si tu changes d’iPhone ou si tu supprimes l’app. Vérifie dans Boutique que le pass ou le boost apparaît ; sinon écris-nous avec la date de l’achat.' },
    { q: 'Comment changer la langue ?', a: 'Dans Paramètres › Langue (français ou anglais).' },
    { q: 'Ma carte joueur ne s’enregistre pas dans Photos.', a: 'Appuie sur « Partager ma carte joueur », puis sur « Enregistrer l’image » dans le menu iOS. Si l’option n’apparaît pas, vérifie Réglages › Confidentialité et sécurité › Photos.' },
    { q: 'Comment supprimer mes données ?', a: 'Paramètres › Supprimer toutes mes données. Désinstaller l’app efface aussi la partie.' },
    { q: 'Comment changer mon choix pour les publicités ?', a: 'Paramètres › Préférences publicitaires, et Réglages de l’iPhone › Confidentialité et sécurité › Suivi.' },
  ],
};

const EN: typeof FR = {
  title: 'Support',
  contact: `A question, a problem or an idea? Write to ${CONTACT_EMAIL}. If you report a bug, include your iPhone model and iOS version.`,
  faq: [
    { q: 'How do I get lives back?', a: 'One life comes back every 3 minutes (up to 5). You can also watch an optional rewarded video (+3 lives) or buy an unlimited-lives pass for 3 h or 24 h in the Shop.' },
    { q: 'I cannot find my purchase.', a: 'Unlimited lives and boosts are stored on your device. They are not transferred if you change iPhone or delete the app. Check the Shop to see the pass or boost; otherwise write to us with the purchase date.' },
    { q: 'How do I change the language?', a: 'In Settings › Language (French or English).' },
    { q: 'My player card does not save to Photos.', a: 'Tap “Share my player card”, then “Save Image” in the iOS menu. If the option is missing, check Settings › Privacy & Security › Photos.' },
    { q: 'How do I delete my data?', a: 'Settings › Delete all my data. Uninstalling the app also erases the save.' },
    { q: 'How do I change my choice about ads?', a: 'Settings › Ad preferences, and iPhone Settings › Privacy & Security › Tracking.' },
  ],
};

function Section({ doc, lang }: { doc: typeof FR; lang: string }) {
  return (
    <section lang={lang} className="mt-10 first:mt-0">
      <h1 className="font-display text-4xl font-extrabold uppercase leading-none text-zinc-50">{doc.title}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-zinc-300">
        {doc.contact}{' '}
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(APP_NAME)}`} className="font-semibold text-neon-300 underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>
      </p>
      {doc.faq.map((f) => (
        <div key={f.q} className="mt-5">
          <h2 className="text-[15px] font-bold text-gold-300">{f.q}</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-300">{f.a}</p>
        </div>
      ))}
    </section>
  );
}

export default function SupportPage() {
  return (
    <main className="px-5 pb-16 pt-[calc(2rem+env(safe-area-inset-top))]">
      <Link href="/settings" className="mb-6 inline-block text-[13px] font-semibold text-neon-300">
        ← Paramètres · Settings
      </Link>
      <p className="eyebrow mb-6">{APP_NAME}</p>
      <Section doc={FR} lang="fr" />
      <hr className="my-10 border-white/10" />
      <Section doc={EN} lang="en" />
      <p className="mt-10 text-[12px] text-zinc-500">
        <Link href="/privacy" className="underline underline-offset-2">
          Politique de confidentialité · Privacy policy
        </Link>
      </p>
    </main>
  );
}
