import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, Phone, MapPin, Heart, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import AccessibilityMenu from './AccessibilityMenu';
import { InternalLinks } from './InternalLinks';
import { Button } from '@/components/ui/button';

const Footer = () => {
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer className="bg-gradient-to-b from-gray-900 to-black text-white pt-20 pb-10 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-brown blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-orange blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* About Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="LOOM Logo" className="h-12 w-auto brightness-0 invert opacity-90" />
                <span className="text-xl font-bold tracking-tight">LOOM</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Association Bear fondée en 2017. Un espace inclusif pour les Bears et tous ceux qui aiment les Ours, les poils et la convivialité, du XS au XXXXXL.
              </p>
              <Link to="/about" className="inline-flex items-center text-orange hover:text-orange-light transition-colors font-medium group">
                En savoir plus 
                <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
            
            {/* Navigation Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white relative inline-block">
                Navigation
                <span className="absolute -bottom-2 left-0 w-10 h-1 bg-orange rounded-full"></span>
              </h3>
              <div className="flex flex-col space-y-3">
                <Link to="/" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-200">Accueil</Link>
                <Link to="/about" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-200">À propos</Link>
                <Link to="/articles" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-200">Actualités</Link>
                <Link to="/events" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-200">Événements</Link>
                <Link to="/gallery" className="text-gray-400 hover:text-white hover:translate-x-1 transition-all duration-200">Galerie</Link>
              </div>
            </div>
            
            {/* Contact Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white relative inline-block">
                Contact
                <span className="absolute -bottom-2 left-0 w-10 h-1 bg-orange rounded-full"></span>
              </h3>
              <div className="space-y-4 text-gray-400">
                <div className="flex items-start group">
                  <div className="bg-white/10 p-2 rounded-lg mr-3 group-hover:bg-orange/20 group-hover:text-orange transition-colors">
                    <MapPin className="h-5 w-5 flex-shrink-0" />
                  </div>
                  <span className="leading-relaxed">49 Rue du faubourg St. Jaumes,<br/>Bat E, 34000 Montpellier</span>
                </div>
                <div className="flex items-center group">
                  <div className="bg-white/10 p-2 rounded-lg mr-3 group-hover:bg-orange/20 group-hover:text-orange transition-colors">
                    <Mail className="h-5 w-5 flex-shrink-0" />
                  </div>
                  <a href="mailto:contactloom34@gmail.com" className="hover:text-white transition-colors">
                    contactloom34@gmail.com
                  </a>
                </div>
                <div className="flex items-center group">
                  <div className="bg-white/10 p-2 rounded-lg mr-3 group-hover:bg-orange/20 group-hover:text-orange transition-colors">
                    <Phone className="h-5 w-5 flex-shrink-0" />
                  </div>
                  <a href="tel:0767179100" className="hover:text-white transition-colors">
                    07 67 17 91 00
                  </a>
                </div>
              </div>
            </div>
            
            {/* Social & Actions Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white relative inline-block">
                Suivez-nous
                <span className="absolute -bottom-2 left-0 w-10 h-1 bg-orange rounded-full"></span>
              </h3>
              <div className="flex space-x-4">
                <motion.a 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  href="https://www.facebook.com/groups/1868760663424464/?ref=share_group_link" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-white/10 p-3 rounded-full text-white hover:bg-[#1877F2] transition-colors"
                  aria-label="Suivez LOOM sur Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  whileTap={{ scale: 0.9 }}
                  href="https://www.instagram.com/loom_ours_34/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-white/10 p-3 rounded-full text-white hover:bg-[#E4405F] transition-colors"
                  aria-label="Suivez LOOM sur Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </motion.a>
              </div>
              
              <div className="pt-4">
                <button 
                  onClick={() => setIsAccessibilityOpen(true)} 
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all group"
                >
                  <span className="bg-blue-600 text-white p-1 rounded-md group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M5 12H4m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  </span>
                  <span className="font-medium">Options d'accessibilité</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-500 text-sm text-center md:text-left">
              <p>© {new Date().getFullYear()} LOOM - Les Ours Occitanie Méditerranée.</p>
              <div className="flex items-center justify-center md:justify-start mt-1 gap-1">
                <span>Made with</span>
                <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
                <span>in Montpellier</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <Link to="/terms" className="hover:text-white transition-colors">Conditions d'utilisation</Link>
              <Link to="/legal-notice" className="hover:text-white transition-colors">Mentions Légales</Link>
              <Link to="/monsieur-ours" className="hover:text-white transition-colors">Monsieur Ours</Link>
            </div>

            <motion.button
              whileHover={{ y: -3 }}
              onClick={scrollToTop}
              className="bg-orange/20 hover:bg-orange text-orange hover:text-white p-2 rounded-lg transition-colors"
              aria-label="Retour en haut"
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </footer>
      
      <AccessibilityMenu isOpen={isAccessibilityOpen} onClose={() => setIsAccessibilityOpen(false)} />
    </>
  );
};

export default Footer;
