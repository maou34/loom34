import { BookOpen, Users, Calendar, MapPin, Heart, Send, Sparkles, History, Quote } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useState } from 'react';
import { db } from '@/db/client';
import { useToast } from '@/hooks/use-toast';
import useSEO from '@/hooks/useSEO';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

const teamMembers = [
  { name: "Stephane", role: "Président", desc: "Ours fondateur de l'association.", img: "/gallery/images/stephane.jpg" },
  { name: "Jean-Louis", role: "Vice-Président", desc: "Ours fondateur de l'association.", img: "/gallery/images/jean-louis.jpg" },
  { name: "Marc", role: "Trésorier", desc: "Ours responsable des bourses.", img: "/gallery/images/marc.jpg" },
  { name: "Pascal", role: "Secrétaire", desc: "X", img: "/gallery/images/pascal.jpg" },
  { name: "Florent", role: "Secrétaire adjoint", desc: "Mais aussi webmaster du site LOOM.", img: "/gallery/images/florent.jpg" },
  { name: "Jean-Luc", role: "Chargé en Relations Publiques", desc: "Ours à l'appel depuis 2019 !", img: "/gallery/images/jean-luc.jpg" },
  { name: "Franck", role: "Chargé de communications", desc: "Un lover des Ours.", img: "/gallery/images/franck.jpg" },
  { name: "Pierre", role: "Chargé de communications adjoint - Insta publisher", desc: "X", img: "/gallery/images/pierre.jpg" },
  { name: "Henri", role: "Monsieur Culture", desc: "X", img: "/gallery/images/henri.jpg" },
  { name: "Étienne", role: "Administrateur", desc: "X", img: "/gallery/images/etienne.jpg" },
];

const timelineEvents = [
  { year: "2024", date: "Juin", title: "L'Expansion", desc: "Participation historique à la Marche des fiertés avec notre propre char et dépassement du cap des 100 adhérents.", icon: History },
  { year: "2018", date: "Juillet", title: "Premier Monsieur Ours", desc: "Élection de notre Unique Monsieur Ours Languedoc-Roussillon, Cédric François.", icon: Users },
  { year: "2017", date: "9 Novembre", title: "La Genèse", desc: "6 copains ont eu l'idée de créer cette association pour ajouter du moelleux et des poils dans l'univers LGBTQ de Montpellier.", icon: Sparkles },
];

const About = () => {
  // SEO Configuration
  useSEO({
    title: 'À propos - LOOM | Découvrez notre association Bear de Montpellier',
    description: 'Découvrez LOOM - Les Ours Occitanie Méditerranée, association Bear fondée en 2017. Notre mission, nos valeurs et comment nous rejoindre dans notre communauté inclusive.',
    keywords: ['LOOM', 'Bears', 'association', 'Montpellier', 'à propos', 'histoire', 'mission', 'valeurs', 'communauté LGBTQ+'],
    type: 'website'
  });

  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { error } = await db
        .from('contact_tickets')
        .insert({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          status: 'nouveau',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      toast({
        title: 'Message envoyé',
        description: 'Votre message a bien été envoyé. Nous vous répondrons rapidement.',
      });
      // Réinitialiser le formulaire
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du ticket:', error);
      toast({
        title: 'Erreur',
        description: "Une erreur est survenue lors de l'envoi du message.",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section - Modern & Immersive */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20">
        {/* Abstract Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-orange/10 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ rotate: -360, scale: [1, 1.2, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[10%] -left-[10%] w-[500px] h-[500px] bg-brown/10 rounded-full blur-3xl"
          />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-orange/10 text-orange font-semibold text-sm mb-6 tracking-wider uppercase">
              Depuis 2017
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
              L'Esprit <span className="text-transparent bg-clip-text bg-gradient-to-r from-brown to-orange">LOOM</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Plus qu'une association, une communauté. Un espace de bienveillance pour les Bears et leurs admirateurs, du XS au XXXXXL.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Manifesto Section - Glass Card */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="relative bg-white/80 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-xl border border-white/20 overflow-hidden">
              <Quote className="absolute top-6 left-6 w-12 h-12 text-orange/20 transform -scale-x-100" />
              <div className="relative z-10 text-center space-y-6">
                <h2 className="text-3xl font-bold text-gray-900">Notre Vision</h2>
                <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-medium">
                  "Créer un refuge de convivialité où chaque ours, peu importe son pelage ou sa carrure, trouve sa place. Nous célébrons la diversité, la fraternité et la joie de vivre ensemble sous le soleil de Montpellier."
                </p>
                <div className="flex justify-center gap-4 pt-4">
                  <div className="flex items-center gap-2 text-brown font-semibold">
                    <Heart className="w-5 h-5 fill-current" />
                    <span>Inclusivité</span>
                  </div>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="flex items-center gap-2 text-brown font-semibold">
                    <Users className="w-5 h-5 fill-current" />
                    <span>Fraternité</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeline Section - Creative Layout */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Notre Histoire</h2>
            <div className="w-20 h-1.5 bg-orange mx-auto rounded-full"></div>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Central Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gradient-to-b from-orange/20 via-brown/20 to-orange/20 hidden md:block"></div>

            <div className="space-y-12 md:space-y-24">
              {timelineEvents.map((event, index) => (
                <motion.div 
                  key={event.year}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className={`flex flex-col md:flex-row items-center gap-8 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
                >
                  <div className="flex-1 w-full md:w-auto">
                    <div className={`bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow duration-300 ${index % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                      <div className={`flex items-center gap-3 mb-4 ${index % 2 === 0 ? 'md:justify-start' : 'md:justify-end'}`}>
                        <span className="text-4xl font-bold text-brown/20">{event.year}</span>
                        <span className="text-sm font-bold text-orange uppercase tracking-wider">{event.date}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                      <p className="text-gray-600">{event.desc}</p>
                    </div>
                  </div>
                  
                  <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                    <div className="w-12 h-12 bg-white rounded-full border-4 border-orange flex items-center justify-center shadow-lg z-10">
                      <event.icon className="w-5 h-5 text-brown" />
                    </div>
                  </div>
                  
                  <div className="flex-1 hidden md:block"></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section - Polaroid Grid */}
      <section className="py-20 bg-tan/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">La Tanière</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Rencontrez les bénévoles passionnés qui font vivre l'association au quotidien.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -10, rotate: index % 2 === 0 ? 2 : -2 }}
                className="group"
              >
                <div className="bg-white p-4 pb-6 rounded-lg shadow-md transform transition-all duration-300 group-hover:shadow-xl border border-gray-100">
                  <div className="aspect-square overflow-hidden rounded-md mb-4 bg-gray-100 relative">
                    <img 
                      src={member.img} 
                      alt={member.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <span className="text-white font-medium text-sm">{member.desc}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="font-handwriting text-2xl font-bold text-gray-800 mb-1">{member.name}</h3>
                    <p className="text-orange font-medium text-sm uppercase tracking-wide">{member.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section - Split Layout */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Contact Info & Map Visual */}
              <div className="relative p-12 lg:p-16 flex flex-col justify-between bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-brown/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">Restons en contact</h2>
                  <p className="text-gray-400 mb-12 text-lg">
                    Une question ? Une envie de nous rejoindre ? Ou simplement pour dire bonjour ? La porte de la tanière est toujours ouverte.
                  </p>
                  
                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <MapPin className="w-6 h-6 text-orange" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Notre QG</h3>
                        <p className="text-gray-400 leading-relaxed">
                          49 Rue du faubourg St. Jaumes,<br />
                          Bat E, 34000 Montpellier
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <Send className="w-6 h-6 text-orange" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Email</h3>
                        <p className="text-gray-400">contactloom34@gmail.com</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-12 border-t border-white/10">
                  <p className="text-sm text-gray-500">
                    Nous répondons généralement sous 24-48h.
                  </p>
                </div>
              </div>

              {/* Contact Form */}
              <div className="p-12 lg:p-16 bg-white">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium text-gray-700">Nom</label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Votre nom"
                        required
                        className="bg-gray-50 border-gray-200 focus:border-orange focus:ring-orange"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="votre@email.com"
                        required
                        className="bg-gray-50 border-gray-200 focus:border-orange focus:ring-orange"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="subject" className="text-sm font-medium text-gray-700">Sujet</label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="De quoi voulez-vous parler ?"
                      required
                      className="bg-gray-50 border-gray-200 focus:border-orange focus:ring-orange"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium text-gray-700">Message</label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Votre message..."
                      rows={5}
                      required
                      className="bg-gray-50 border-gray-200 focus:border-orange focus:ring-orange resize-none"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-orange hover:bg-orange-dark text-white h-12 text-lg font-medium transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  >
                    {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default About;
