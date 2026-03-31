import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SectionHeading from '@/components/SectionHeading';
import useSEO from '@/hooks/useSEO';

const Terms = () => {
  // SEO Configuration
  useSEO({
    title: 'Conditions générales d\'utilisation - LOOM | CGU',
    description: 'Consultez les conditions générales d\'utilisation du site de LOOM - Les Ours Occitanie Montpellier.',
    keywords: ['conditions générales utilisation', 'CGU', 'LOOM', 'mentions légales'],
    type: 'website'
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto">
          <SectionHeading 
            title="Conditions générales d'utilisation"
            subtitle="En vigueur au 13/06/2025"
          />
          
          <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
            
            {/* Introduction */}
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 leading-relaxed">
                Les présentes conditions générales d'utilisation (dites « CGU ») ont pour objet l'encadrement juridique des modalités de mise à disposition du site et des services par LES OURS OCCITANIE MEDITERRANEE et de définir les conditions d'accès et d'utilisation des services par « l'Utilisateur ».
              </p>
              <p className="text-gray-700 leading-relaxed">
                Les présentes CGU sont accessibles sur le site à la rubrique «CGU».
              </p>
            </div>

            {/* Article 1 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Article 1 : Les mentions légales
              </h2>
              <div className="text-gray-700 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="mb-2">
                    L'édition et la direction de la publication du site{' '}
                    <a href="https://loom-lgbt.fr" className="text-orange-600 hover:text-orange-800 underline">
                      https://loom-lgbt.fr
                    </a>{' '}
                    est assurée par LES OURS OCCITANIE MEDITERRANEE, domicilié 49 Rue du faubourg St. Jaumes, Bat E 34000 Montpellier.
                  </p>
                  <ul className="space-y-1">
                    <li>• Numéro de téléphone : +33767179100</li>
                    <li>• Adresse e-mail : contactloom34@gmail.com</li>
                  </ul>
                </div>
                <p>
                  L'hébergeur du site https://loom-lgbt.fr est la société Inferi, dont le siège social est situé au Montpellier, avec le numéro de téléphone : +33642245188.
                </p>
              </div>
            </section>

            {/* Article 2 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Article 2 : Accès au site
              </h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  Le site{' '}
                  <a href="https://loom-lgbt.fr" className="text-orange-600 hover:text-orange-800 underline">
                    https://loom-lgbt.fr
                  </a>{' '}
                  permet à l'Utilisateur un accès gratuit aux services suivants :
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Le site internet propose les services suivants :</p>
                  <ul className="space-y-1">
                    <li>• créer des liens et resserer le tissu social des personnes LGBT</li>
                    <li>• lutter contre l'homophobie et toutes formes de discriminations</li>
                    <li>• lutter pour l'égalité des droits des personnes LGBT</li>
                    <li>• mettre en avant la culture LGBT</li>
                  </ul>
                </div>
                <p>
                  Le site est accessible gratuitement en tout lieu à tout Utilisateur ayant un accès à Internet. Tous les frais supportés par l'Utilisateur pour accéder au service (matériel informatique, logiciels, connexion Internet, etc.) sont à sa charge.
                </p>
              </div>
            </section>

            {/* Article 3 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Article 3 : Collecte des données
              </h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  Le site assure à l'Utilisateur une collecte et un traitement d'informations personnelles dans le respect de la vie privée conformément à la loi n°78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>
                    En vertu de la loi Informatique et Libertés, en date du 6 janvier 1978, l'Utilisateur dispose d'un droit d'accès, de rectification, de suppression et d'opposition de ses données personnelles.
                  </p>
                </div>
              </div>
            </section>

            {/* Article 4 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Article 4 : Propriété intellectuelle
              </h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  Les marques, logos, signes ainsi que tous les contenus du site (textes, images, son…) font l'objet d'une protection par le Code de la propriété intellectuelle et plus particulièrement par le droit d'auteur.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Protection de la marque</p>
                  <p>
                    La marque LOOM - Les Ours Occitanie Mediterranee est une marque déposée par LES OURS OCCITANIE MEDITERRANEE. Toute représentation et/ou reproduction et/ou exploitation partielle ou totale de cette marque, de quelque nature que ce soit, est totalement prohibée.
                  </p>
                </div>
                <p>
                  L'Utilisateur doit solliciter l'autorisation préalable du site pour toute reproduction, publication, copie des différents contenus. Il s'engage à une utilisation des contenus du site dans un cadre strictement privé, toute utilisation à des fins commerciales et publicitaires est strictement interdite.
                </p>
                <p>
                  Toute représentation totale ou partielle de ce site par quelque procédé que ce soit, sans l'autorisation expresse de l'exploitant du site Internet constituerait une contrefaçon sanctionnée par l'article L 335-2 et suivants du Code de la propriété intellectuelle.
                </p>
                <p>
                  Il est rappelé conformément à l'article L122-5 du Code de propriété intellectuelle que l'Utilisateur qui reproduit, copie ou publie le contenu protégé doit citer l'auteur et sa source.
                </p>
              </div>
            </section>

            {/* Article 5 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Article 5 : Responsabilité
              </h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  Les sources des informations diffusées sur le site{' '}
                  <a href="https://loom-lgbt.fr" className="text-orange-600 hover:text-orange-800 underline">
                    https://loom-lgbt.fr
                  </a>{' '}
                  sont réputées fiables mais le site ne garantit pas qu'il soit exempt de défauts, d'erreurs ou d'omissions.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>
                    Les informations communiquées sont présentées à titre indicatif et général sans valeur contractuelle. Malgré des mises à jour régulières, le site ne peut être tenu responsable de la modification des dispositions administratives et juridiques survenant après la publication.
                  </p>
                </div>
                <p>
                  Le site https://loom-lgbt.fr ne peut être tenu pour responsable d'éventuels virus qui pourraient infecter l'ordinateur ou tout matériel informatique de l'Internaute, suite à une utilisation, à l'accès, ou au téléchargement provenant de ce site.
                </p>
                <p>
                  La responsabilité du site ne peut être engagée en cas de force majeure ou du fait imprévisible et insurmontable d'un tiers.
                </p>
              </div>
            </section>

            {/* Article 6 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Article 6 : Liens hypertextes
              </h2>
              <div className="text-gray-700">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>
                    Des liens hypertextes peuvent être présents sur le site. L'Utilisateur est informé qu'en cliquant sur ces liens, il sortira du site{' '}
                    <a href="https://loom-lgbt.fr" className="text-orange-600 hover:text-orange-800 underline">
                      https://loom-lgbt.fr
                    </a>. Ce dernier n'a pas de contrôle sur les pages web sur lesquelles aboutissent ces liens et ne saurait, en aucun cas, être responsable de leur contenu.
                  </p>
                </div>
              </div>
            </section>

            {/* Article 7 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Article 7 : Cookies
              </h2>
              <div className="text-gray-700 space-y-4">
                <p>
                  L'Utilisateur est informé que lors de ses visites sur le site, un cookie peut s'installer automatiquement sur son logiciel de navigation.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p>
                    <strong>Qu'est-ce qu'un cookie ?</strong>
                  </p>
                  <p>
                    Les cookies sont de petits fichiers stockés temporairement sur le disque dur de l'ordinateur de l'Utilisateur par votre navigateur et qui sont nécessaires à l'utilisation du site https://loom-lgbt.fr. Les cookies ne contiennent pas d'information personnelle et ne peuvent pas être utilisés pour identifier quelqu'un. Un cookie contient un identifiant unique, généré aléatoirement et donc anonyme.
                  </p>
                </div>
                <p>
                  L'information contenue dans les cookies est utilisée pour améliorer le site https://loom-lgbt.fr.
                </p>
                <p>
                  En naviguant sur le site, L'Utilisateur les accepte. L'Utilisateur pourra désactiver ces cookies par l'intermédiaire des paramètres figurant au sein de son logiciel de navigation.
                </p>
              </div>
            </section>

            {/* Article 8 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Article 8 : Droit applicable et juridiction compétente
              </h2>
              <div className="text-gray-700 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>
                    La législation française s'applique au présent contrat. En cas d'absence de résolution amiable d'un litige né entre les parties, les tribunaux français seront seuls compétents pour en connaître.
                  </p>
                </div>
                <p>
                  Pour toute question relative à l'application des présentes CGU, vous pouvez joindre l'éditeur aux coordonnées inscrites à l'ARTICLE 1.
                </p>
              </div>
            </section>

            {/* Note légale */}
            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-600 italic">
                Ces conditions générales d'utilisation sont conformes aux dispositions légales en vigueur et sont mises à jour 
                régulièrement pour refléter toute modification de la situation juridique de l'association.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Terms;