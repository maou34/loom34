import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogIn, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();

  // Fetch site settings (external nav links)
  const { data: siteSettings } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data, error } = await db.from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);
  
  const navLinks = [
    { name: 'Accueil', path: '/' },
    { name: 'À propos', path: '/about' },
    { name: 'Articles', path: '/articles' },    
    { name: 'Événements', path: '/events' },
    { name: 'Monsieur Ours', path: '/monsieur-ours' },
    { name: 'Photos', path: '/gallery' },
    { name: 'Nos Partenaires', path: '/partners' },
    {
      name: 'Boutique',
      path: siteSettings?.shop_url || 'https://www.helloasso.com/associations/les-ours-occitanie-montpellier/boutiques/t-shirt-bleu',
      external: true
    },
    {
      name: 'Adhésion',
      path: siteSettings?.membership_url || 'https://www.helloasso.com/associations/les-ours-occitanie-montpellier/adhesions/adhesion-2025-2026',
      external: true
    },
  ];
  
  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path) && (path !== '/' || location.pathname === '/');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };
  
  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/80 backdrop-blur-md shadow-md py-2 border-b border-white/20' 
          : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        
        {/* Logo */}
        <Link to="/" className="flex items-center group relative z-50">
          <motion.img 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            src="/loom_logo_round.png" 
            alt="LOOM Logo" 
            className="h-12 w-auto transition-transform duration-300"
          />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center space-x-1 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 shadow-sm">
          {navLinks.map((link) => (
            <div key={link.path} className="relative">
              {link.external ? (
                <a
                  href={link.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300 hover:text-brown-dark ${
                    isActive(link.path) ? 'text-brown-dark' : 'text-gray-700'
                  }`}
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  to={link.path}
                  className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300 hover:text-brown-dark ${
                    isActive(link.path) ? 'text-brown-dark' : 'text-gray-700'
                  }`}
                >
                  {isActive(link.path) && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-tan/50 rounded-full -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {link.name}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* User Actions & Mobile Toggle */}
        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full overflow-hidden">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.username || 'User'} />
                    <AvatarFallback className="bg-tan text-brown font-bold">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white/90 backdrop-blur-md border-white/20">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {profile?.username && (
                      <p className="font-medium text-sm text-brown">{profile.username}</p>
                    )}
                    <p className="w-[200px] truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild className="cursor-pointer hover:bg-tan/20 focus:bg-tan/20">
                    <Link to="/admin" className="flex items-center w-full text-brown">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Administration</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Se déconnecter</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              asChild 
              variant="default" 
              className="hidden md:flex bg-brown hover:bg-brown-light text-white rounded-full px-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Link to="/auth/login">
                <LogIn className="mr-2 h-4 w-4" />
                Connexion
              </Link>
            </Button>
          )}

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-brown hover:bg-tan/20 rounded-full transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="xl:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 overflow-hidden shadow-xl"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col space-y-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {link.external ? (
                    <a
                      href={link.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block px-4 py-3 rounded-xl text-base font-medium transition-all ${
                        isActive(link.path)
                          ? 'bg-tan/30 text-brown-dark translate-x-2'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-brown hover:translate-x-1'
                      }`}
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link
                      to={link.path}
                      className={`block px-4 py-3 rounded-xl text-base font-medium transition-all ${
                        isActive(link.path)
                          ? 'bg-tan/30 text-brown-dark translate-x-2'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-brown hover:translate-x-1'
                      }`}
                    >
                      {link.name}
                    </Link>
                  )}
                </motion.div>
              ))}
              
              {!user && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pt-4 mt-2 border-t border-gray-100"
                >
                  <Button asChild className="w-full bg-brown hover:bg-brown-light text-white rounded-xl py-6 shadow-md">
                    <Link to="/auth/login" className="flex justify-center items-center gap-2">
                      <LogIn size={20} />
                      Se connecter
                    </Link>
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;
