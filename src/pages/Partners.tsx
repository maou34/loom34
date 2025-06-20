import { useEffect, useState } from 'react';
import { Heart, Users, Shield, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SectionHeading from '@/components/SectionHeading';
import Button from '@/components/Button';
import useSEO from '@/hooks/useSEO';
import { db } from '@/db/client';
import { Tables } from '@/db/types';

const Partners = () => {
  // SEO Configuration
  useSEO({
    title: 'Nos Partenaires - LOOM | Commerces et établissements partenaires',
    description: 'Découvrez les partenaires de LOOM - Les Ours Occitanie Méditerranée. Bars, restaurants, saunas et commerces qui soutiennent notre communauté Bear avec des avantages exclusifs.',
    keywords: ['LOOM partenaires', 'commerces gay-friendly', 'bars Bears', 'restaurants Montpellier', 'saunas gay', 'avantages membres'],
    type: 'website'
  });

  const [partners, setPartners] = useState<Tables<'partners'>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      setLoading(true);
      const { data, error } = await db.from('partners').select('*').order('created_at', { ascending: false });
      if (!error && data) setPartners(data);
      setLoading(false);
    };
    fetchPartners();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-tan/10">
      <Navbar />
      {/* Hero Section */}
      <section className="pt-24 md:pt-36 pb-16 bg-gradient-to-b from-tan/30 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Nos Partenaires
            </h1>
            <p className="text-lg text-gray-700">
              Nous sommes reconnaissants envers les organisations et entreprises qui soutiennent notre mission.
              Ensemble, nous créons une communauté plus forte et plus inclusive.
            </p>
          </div>
        </div>
      </section>
      {/* Partners Grid Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <SectionHeading 
            title="Découvrez nos partenaires" 
            subtitle="Les organisations et entreprises qui rendent notre travail possible."
            centered
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {loading ? (
              <div className="col-span-full text-center text-gray-500">Chargement...</div>
            ) : partners.length === 0 ? (
              <div className="col-span-full text-center text-gray-500">Aucun partenaire pour le moment.</div>
            ) : partners.map((partner, index) => (
              <div key={partner.id || index} className="bg-white rounded-xl shadow-sm overflow-hidden hover-lift transition-all duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-center items-center h-32">
                  {partner.logo && (
                    <img 
                      src={partner.logo} 
                      alt={`${partner.name} logo`} 
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                <div className="p-6">
                  <span className="text-xs font-medium text-orange bg-orange/10 px-3 py-1 rounded-full">
                    {partner.type}
                  </span>
                  <h3 className="text-xl font-bold mt-3 mb-2">{partner.name}</h3>
                  <p className="text-gray-600 mb-4">
                    {partner.description}
                  </p>
                  {partner.website && (
                    <a 
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="text-brown font-medium hover:underline inline-flex items-center"
                    >
                      Visiter le site
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-16 bg-brown text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Intéressé pour devenir partenaire ?</h2>
            <p className="text-tan/90 text-lg mb-8">
              Nous serions ravis de discuter de la façon dont nous pouvons créer un partenariat significatif qui s'aligne 
              avec les valeurs et les objectifs de votre organisation tout en soutenant notre communauté.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:contactloom34@gmail.com"
              >
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-white text-white hover:bg-white/10"
                >
                  Nous contacter
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Partners;
