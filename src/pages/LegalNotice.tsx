import { Link } from 'react-router-dom';
import LegalPage from '@/components/site/LegalPage';
import { ASSOCIATION as A } from '@/lib/association';
import useSEO from '@/hooks/useSEO';

const LegalNotice = () => {
  useSEO({
    title: 'Mentions légales - LOOM | Les Ours Occitanie Montpellier',
    description: "Mentions légales du site de LOOM : éditeur, hébergement, directeur de la publication et protection des données personnelles.",
    keywords: ['LOOM', 'mentions légales', 'association', 'Montpellier', 'données personnelles'],
    type: 'website',
  });

  return (
    <LegalPage
      title="Mentions légales"
      updated="20 novembre 2026"
      intro="Qui édite et héberge ce site, et ce que nous faisons des données que vous nous confiez."
    >
      <h2>Éditeur du site</h2>
      <p>
        Le site <a href="https://lgbt-loom.fr">lgbt-loom.fr</a> est édité par :
      </p>
      <ul>
        <li>
          <strong>{A.name}</strong>, {A.status.toLowerCase()}
        </li>
        <li>Numéro RNA : {A.rna}</li>
        <li>SIRET : {A.siret}</li>
        <li>Siège : {A.address}</li>
        <li>
          Téléphone : <a href={A.phoneHref}>{A.phone}</a>
        </li>
        <li>
          E-mail : <a href={`mailto:${A.email}`}>{A.email}</a>
        </li>
      </ul>

      <h2>Directeur de la publication</h2>
      <p>{A.president}, président de l'association.</p>

      <h2>Hébergement</h2>
      <p>Le site et ses images sont hébergés par :</p>
      <ul>
        <li>
          <strong>OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France – <a href="https://www.ovhcloud.com">ovhcloud.com</a>
        </li>
      </ul>
      <p>
        La base de données du site (agenda, actualités, messages du formulaire de contact) est hébergée par <strong>Supabase</strong> (
        <a href="https://supabase.com">supabase.com</a>).
      </p>

      <h2>Données personnelles</h2>
      <p>
        L'association LOOM est responsable des données collectées sur ce site. Nous n'en collectons que le minimum, ne les vendons pas et ne les
        utilisons pas à des fins publicitaires.
      </p>

      <h3>Formulaire « Nous écrire »</h3>
      <p>
        Quand vous nous écrivez depuis la page <Link to="/about#contact">L'asso</Link>, nous enregistrons votre nom, votre adresse e-mail, le sujet et
        votre message, uniquement pour vous répondre. Seuls les membres du bureau chargés du site y ont accès. Les messages sont conservés{' '}
        <strong>un an au maximum</strong>, puis supprimés.
      </p>

      <h3>Inscriptions et paiements</h3>
      <p>
        Les inscriptions aux événements payants et les paiements se font sur <a href="https://www.helloasso.com">HelloAsso</a>, y compris dans le
        module intégré aux pages d'événements. HelloAsso est responsable des données que vous lui transmettez (voir sa politique de
        confidentialité). Notre site ne récupère que le nombre de places vendues, jamais l'identité des participants.
      </p>

      <h3>Mesure d'audience</h3>
      <p>
        Nous comptons les visites avec Cloudflare Web Analytics, un outil sans cookie qui ne suit pas les visiteurs d'un site à l'autre et ne nous
        donne que des chiffres globaux (pages vues, pays, type d'appareil).
      </p>

      <h3>Cartes</h3>
      <p>
        Le plan affiché sur les pages d'événements vient d'<a href="https://www.openstreetmap.org">OpenStreetMap</a> : votre navigateur le
        télécharge directement depuis leurs serveurs, qui reçoivent donc votre adresse IP. Le lien « Ouvrir l'itinéraire » mène à Google Maps.
      </p>

      <h3>Cookies et préférences</h3>
      <p>
        Ce site ne dépose aucun cookie publicitaire ni de mesure d'audience. Vos choix d'affichage (mode nuit, options d'accessibilité) sont
        seulement enregistrés dans votre navigateur, sur votre appareil, et ne nous sont pas transmis. Le module de paiement HelloAsso peut déposer
        les cookies nécessaires à son fonctionnement.
      </p>

      <h3>Photos</h3>
      <p>
        Les albums photos montrent des moments de la vie de l'association. Vous apparaissez sur une photo et préférez qu'elle soit retirée ou
        floutée ? Écrivez-nous à <a href={`mailto:${A.email}`}>{A.email}</a> : nous la retirons sans avoir à nous justifier, au plus vite.
      </p>

      <h3>Vos droits</h3>
      <p>
        Vous pouvez demander à accéder à vos données, les faire corriger ou supprimer, ou vous opposer à leur utilisation, en écrivant à{' '}
        <a href={`mailto:${A.email}`}>{A.email}</a> ou à l'adresse du siège. Si vous estimez que vos droits ne sont pas respectés, vous pouvez
        adresser une réclamation à la <a href="https://www.cnil.fr/fr/plaintes">CNIL</a>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, photos, logos et visuels de ce site appartiennent à l'association LOOM ou à leurs auteurs. Merci de nous demander avant de les
        réutiliser. Les conditions d'utilisation du site sont détaillées sur la page <Link to="/terms">Conditions d'utilisation</Link>.
      </p>
    </LegalPage>
  );
};

export default LegalNotice;
