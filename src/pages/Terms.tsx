import { Link } from 'react-router-dom';
import LegalPage from '@/components/site/LegalPage';
import { ASSOCIATION as A } from '@/lib/association';
import useSEO from '@/hooks/useSEO';

const Terms = () => {
  useSEO({
    title: "Conditions d'utilisation - LOOM | Les Ours Occitanie Montpellier",
    description: "Conditions générales d'utilisation du site de LOOM – Les Ours Occitanie Montpellier.",
    keywords: ['conditions générales utilisation', 'CGU', 'LOOM'],
    type: 'website',
  });

  return (
    <LegalPage
      title="Conditions d'utilisation"
      updated="20 novembre 2026"
      intro="Les règles d'utilisation du site lgbt-loom.fr, en quelques articles."
    >
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions générales d'utilisation (« CGU ») encadrent l'accès au site <a href="https://lgbt-loom.fr">lgbt-loom.fr</a> et son
        utilisation. Le site est édité par <strong>{A.name}</strong>, {A.status.toLowerCase()} dont le siège est situé {A.address} (détails sur la
        page <Link to="/legal-notice">Mentions légales</Link>). Utiliser le site implique d'accepter ces conditions.
      </p>

      <h2>2. Ce que propose le site</h2>
      <p>Le site présente l'association et ses activités. Il permet notamment de :</p>
      <ul>
        <li>consulter l'agenda des événements et s'y inscrire (inscriptions et paiements sur HelloAsso) ;</li>
        <li>lire les actualités de l'association ;</li>
        <li>découvrir l'association, Monsieur Ours, les albums photos et les partenaires ;</li>
        <li>nous écrire grâce au formulaire de contact ;</li>
        <li>adhérer ou se rendre sur la boutique, via des liens vers HelloAsso.</li>
      </ul>
      <p>
        Le site est accessible gratuitement à toute personne disposant d'un accès à Internet ; les frais de connexion et d'équipement restent à sa
        charge. Nous pouvons interrompre le site pour maintenance ou en faire évoluer le contenu à tout moment.
      </p>

      <h2>3. Inscriptions aux événements</h2>
      <p>
        Les inscriptions et paiements sont gérés par HelloAsso, selon ses propres conditions. Le prix, le nombre de places et les dates de vente
        affichés sur notre site sont indicatifs : seules les informations présentées par HelloAsso au moment de l'inscription font foi. Les
        éventuels tarifs réduits réservés aux adhérents peuvent être vérifiés par l'association.
      </p>

      <h2>4. Formulaire de contact</h2>
      <p>
        Le formulaire « Nous écrire » sert à joindre l'association. Merci de ne pas l'utiliser pour envoyer de la publicité ou des propos insultants,
        discriminatoires ou illégaux : de tels messages sont supprimés sans réponse. Le traitement de vos données est décrit dans les{' '}
        <Link to="/legal-notice">mentions légales</Link>.
      </p>

      <h2>5. Propriété intellectuelle</h2>
      <p>
        Les textes, photos, logos et visuels du site sont protégés par le Code de la propriété intellectuelle. Ils appartiennent à l'association
        LOOM ou à leurs auteurs (photographes, partenaires). Toute reproduction ou réutilisation, en tout ou partie, nécessite notre accord
        préalable ; une citation courte doit mentionner sa source. Les logos des partenaires restent la propriété de leurs titulaires.
      </p>

      <h2>6. Photos et droit à l'image</h2>
      <p>
        Les albums photos sont publiés pour partager la vie de l'association. Il est interdit de les réutiliser pour identifier, exposer ou nuire
        aux personnes qui y figurent. Toute personne qui apparaît sur une photo peut en demander le retrait ou le floutage à{' '}
        <a href={`mailto:${A.email}`}>{A.email}</a>.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        Nous faisons de notre mieux pour publier des informations exactes et à jour, mais le site peut contenir des erreurs ou des omissions, et les
        informations des événements (horaires, lieux, programme) peuvent changer. L'association ne peut être tenue responsable d'une interruption du
        site, d'un problème technique ou d'un usage du site non conforme aux présentes conditions.
      </p>

      <h2>8. Liens vers d'autres sites</h2>
      <p>
        Le site contient des liens vers d'autres sites (HelloAsso, réseaux sociaux, partenaires, cartes…). Nous ne contrôlons pas leur contenu et
        n'en sommes pas responsables.
      </p>

      <h2>9. Données personnelles et cookies</h2>
      <p>
        Le site ne dépose aucun cookie publicitaire ni de mesure d'audience. Les données collectées, leur durée de conservation et vos droits sont
        détaillés dans les <Link to="/legal-notice">mentions légales</Link>.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Ces conditions sont soumises au droit français. En cas de litige, nous chercherons d'abord une solution amiable ; à défaut, les tribunaux
        français seront compétents. Pour toute question : <a href={`mailto:${A.email}`}>{A.email}</a> ou <a href={A.phoneHref}>{A.phone}</a>.
      </p>
    </LegalPage>
  );
};

export default Terms;
