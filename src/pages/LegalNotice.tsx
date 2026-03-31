import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SectionHeading from '@/components/SectionHeading';
import useSEO from '@/hooks/useSEO';

const LegalNotice = () => {
  // SEO Configuration
  useSEO({
    title: 'Mentions Légales - LOOM | Les Ours Occitanie Montpellier',
    description: 'Mentions légales du site LOOM - Les Ours Occitanie Montpellier. Informations légales sur l\'association, l\'hébergement et les responsabilités.',
    keywords: ['LOOM', 'mentions légales', 'association', 'Montpellier', 'ours', 'bears', 'LGBT'],
    type: 'website'
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-4xl mx-auto">
          <SectionHeading 
            title="Mentions Légales"
            subtitle="Informations légales concernant le site LOOM"
          />
          
          <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
            
            {/* Introduction */}
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 leading-relaxed">
                Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance en l'économie numérique, 
                il est précisé aux utilisateurs du site LOOM - Les Ours Occitanie Montpellier l'identité des différents 
                intervenants dans le cadre de sa réalisation et de son suivi.
              </p>
            </div>

            {/* Edition du site */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Édition du site
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Le présent site, accessible à l'URL{' '}
                  <a href="https://loom-lgbt.fr" className="text-orange-600 hover:text-orange-800 underline">
                    https://loom-lgbt.fr
                  </a>{' '}
                  (le « Site »), est édité par :
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">
                    L'association Les Ours Occitanie Montpellier LOOM
                  </p>
                  <ul className="space-y-1">
                    <li>• Enregistrée auprès de la préfecture/sous-préfecture de 34 - Préfecture Montpellier</li>
                    <li>• Numéro d'enregistrement : W343201918</li>
                    <li>• Siège social : 49 Rue du faubourg St. Jaumes, Bat E, 34000 Montpellier</li>
                    <li>• Représentée par Stéphane Lossilla dûment habilité</li>
                  </ul>
                </div>
                <p>
                  <strong>Numéro individuel TVA de l'éditeur :</strong> FR05834084212
                </p>
              </div>
            </section>

            {/* Hébergement */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Hébergement
              </h2>
              <div className="text-gray-700">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="mb-2">
                    <strong>Le Site est hébergé par :</strong>
                  </p>
                  <ul className="space-y-1">
                    <li>• Société : Inferi</li>
                    <li>• Localisation : Montpellier</li>
                    <li>• Contact : +33642245188</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Directeur de publication */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Directeur de publication
              </h2>
              <div className="text-gray-700">
                <p>
                  Le Directeur de la publication du Site est <strong>Stéphane Lossila</strong>.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
                Nous contacter
              </h2>
              <div className="text-gray-700">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p>
                    <strong>Par téléphone :</strong>{' '}
                    <a href="tel:+33767179100" className="text-orange-600 hover:text-orange-800">
                      +33 7 67 17 91 00
                    </a>
                  </p>
                  <p>
                    <strong>Par email :</strong>{' '}
                    <a href="mailto:contactloom34@gmail.com" className="text-orange-600 hover:text-orange-800">
                      contactloom34@gmail.com
                    </a>
                  </p>
                  <p>
                    <strong>Par courrier :</strong><br />
                    49 Rue du faubourg St. Jaumes, Bat E<br />
                    34000 Montpellier
                  </p>
                </div>
              </div>
            </section>

            {/* Note légale */}
            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-600 italic">
                Ces mentions légales sont conformes aux dispositions légales en vigueur et sont mises à jour 
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

export default LegalNotice;
