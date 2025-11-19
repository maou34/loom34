import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { db } from "@/db/client";
import { FileText, CalendarDays, Image as ImageIcon, Users, ArrowUpRight, MessageSquare, Heart, Activity, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// Stats card component
const StatsCard = ({ 
  icon, 
  title, 
  count, 
  loading, 
  color,
  path,
  delay
}: { 
  icon: React.ReactNode, 
  title: string, 
  count: number,
  loading: boolean,
  color: string,
  path: string,
  delay: number
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Link to={path}>
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-none shadow-md bg-white/80 backdrop-blur-sm overflow-hidden group h-full">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`h-12 w-12 ${color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {icon}
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600 transition-colors">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <h3 className="text-3xl font-bold text-gray-900">{count}</h3>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

// Quick action card component
const QuickActionCard = ({ 
  icon, 
  title, 
  path,
  color
}: { 
  icon: React.ReactNode, 
  title: string, 
  path: string,
  color: string
}) => {
  return (
    <Link to={path} className="w-full">
      <Button 
        variant="outline" 
        className="w-full h-auto py-4 justify-start px-4 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group"
      >
        <div className={`h-10 w-10 rounded-lg ${color} bg-opacity-10 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <span className="font-medium text-gray-700 group-hover:text-gray-900">{title}</span>
        <ArrowUpRight className="ml-auto h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Button>
    </Link>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    articlesCount: 0,
    eventsCount: 0,
    galleryCount: 0,
    usersCount: 0,
    ticketsCount: 0,
    partnersCount: 0,
    loading: true
  });

  const [recentActivity, setRecentActivity] = useState({
    articles: [],
    events: [],
    loading: true
  });

  const [recentPartners, setRecentPartners] = useState<any[]>([]);

  // Fetch tickets count
  const { data: ticketsData } = useQuery({
    queryKey: ['ticketsCount'],
    queryFn: async () => {
      const { count, error } = await db
        .from('contact_tickets')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count;
    }
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch article count
        const { count: articlesCount, error: articlesError } = await db
          .from('articles')
          .select('*', { count: 'exact', head: true });

        // Fetch events count
        const { count: eventsCount, error: eventsError } = await db
          .from('events')
          .select('*', { count: 'exact', head: true });

        // Fetch gallery count
        const { count: galleryCount, error: galleryError } = await db
          .from('gallery_images')
          .select('*', { count: 'exact', head: true });

        // Fetch users count
        const { count: usersCount, error: usersError } = await db
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch partners count
        const { count: partnersCount, error: partnersError } = await db
          .from('partners')
          .select('*', { count: 'exact', head: true });

        if (articlesError) console.error("Error fetching articles:", articlesError);
        if (eventsError) console.error("Error fetching events:", eventsError);
        if (galleryError) console.error("Error fetching gallery:", galleryError);
        if (usersError) console.error("Error fetching users:", usersError);
        if (partnersError) console.error("Error fetching partners:", partnersError);

        setStats({
          articlesCount: articlesCount || 0,
          eventsCount: eventsCount || 0,
          galleryCount: galleryCount || 0,
          usersCount: usersCount || 0,
          ticketsCount: ticketsData || 0,
          partnersCount: partnersCount || 0,
          loading: false
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Failed to load statistics");
        setStats(prev => ({ ...prev, loading: false }));
      }
    }

    async function fetchRecentActivity() {
      try {
        // Fetch recent articles
        const { data: recentArticles, error: articlesError } = await db
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch recent events
        const { data: recentEvents, error: eventsError } = await db
          .from('events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch recent partners
        const { data: recentPartnersData, error: partnersError } = await db
          .from('partners')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        if (partnersError) console.error("Error fetching recent partners:", partnersError);

        setRecentActivity({
          articles: recentArticles || [],
          events: recentEvents || [],
          loading: false
        });
        setRecentPartners(recentPartnersData || []);
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        toast.error("Failed to load recent activity");
        setRecentActivity(prev => ({ ...prev, loading: false }));
      }
    }

    fetchStats();
    fetchRecentActivity();
  }, [ticketsData]);

  return (
    <AdminLayout title="Tableau de bord">
      <div className="space-y-8">
        {/* Welcome section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white shadow-xl"
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/5 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">Bienvenue sur votre espace d'administration</h2>
            <p className="text-gray-300 max-w-2xl text-lg">
              Gérez le contenu de LOOM, suivez l'activité de la communauté et maintenez le site à jour depuis cet espace centralisé.
            </p>
          </div>
        </motion.div>
        
        {/* Stats section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              Vue d'ensemble
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <StatsCard 
              icon={<FileText className="h-6 w-6" />} 
              title="Articles" 
              count={stats.articlesCount} 
              loading={stats.loading}
              color="bg-blue-500"
              path="/admin/articles"
              delay={0.1}
            />
            
            <StatsCard 
              icon={<CalendarDays className="h-6 w-6" />} 
              title="Événements" 
              count={stats.eventsCount} 
              loading={stats.loading}
              color="bg-orange-500"
              path="/admin/events"
              delay={0.2}
            />
            
            <StatsCard 
              icon={<ImageIcon className="h-6 w-6" />} 
              title="Photos" 
              count={stats.galleryCount} 
              loading={stats.loading}
              color="bg-purple-500"
              path="/admin/gallery"
              delay={0.3}
            />
            
            <StatsCard 
              icon={<Users className="h-6 w-6" />} 
              title="Utilisateurs" 
              count={stats.usersCount} 
              loading={stats.loading}
              color="bg-green-500"
              path="/admin/users"
              delay={0.4}
            />

            <StatsCard 
              icon={<MessageSquare className="h-6 w-6" />} 
              title="Tickets" 
              count={stats.ticketsCount} 
              loading={stats.loading}
              color="bg-red-500"
              path="/admin/tickets"
              delay={0.5}
            />

            <StatsCard 
              icon={<Heart className="h-6 w-6" />} 
              title="Partenaires" 
              count={stats.partnersCount} 
              loading={stats.loading}
              color="bg-pink-500"
              path="/admin/partners"
              delay={0.6}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-1 space-y-6"
          >
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" />
              Actions rapides
            </h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <QuickActionCard 
                icon={<FileText className="h-5 w-5 text-blue-600" />} 
                title="Créer un article" 
                path="/admin/articles"
                color="bg-blue-500"
              />
              
              <QuickActionCard 
                icon={<CalendarDays className="h-5 w-5 text-orange-600" />} 
                title="Planifier un événement" 
                path="/admin/events"
                color="bg-orange-500"
              />
              
              <QuickActionCard 
                icon={<ImageIcon className="h-5 w-5 text-purple-600" />} 
                title="Ajouter des photos" 
                path="/admin/gallery"
                color="bg-purple-500"
              />

              <QuickActionCard 
                icon={<Heart className="h-5 w-5 text-pink-600" />} 
                title="Gérer les partenaires" 
                path="/admin/partners"
                color="bg-pink-500"
              />

              <QuickActionCard 
                icon={<MessageSquare className="h-5 w-5 text-red-600" />} 
                title="Voir les tickets" 
                path="/admin/tickets"
                color="bg-red-500"
              />
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="lg:col-span-2 space-y-6"
          >
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              Activité récente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Articles */}
              <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <CardTitle className="text-lg font-semibold flex items-center justify-between">
                    Articles récents
                    <Link to="/admin/articles" className="text-xs font-normal text-blue-600 hover:underline">Voir tout</Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {recentActivity.loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentActivity.articles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Aucun article récent
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.articles.map((article: any) => (
                        <div key={article.id} className="flex items-start gap-3 group">
                          <div 
                            className="h-10 w-10 bg-cover bg-center rounded-lg flex-shrink-0 shadow-sm"
                            style={{ backgroundImage: `url(${article.image})` }}
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {article.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {new Date(article.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Events */}
              <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <CardTitle className="text-lg font-semibold flex items-center justify-between">
                    Événements récents
                    <Link to="/admin/events" className="text-xs font-normal text-orange-600 hover:underline">Voir tout</Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {recentActivity.loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentActivity.events.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Aucun événement récent
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.events.map((event: any) => (
                        <div key={event.id} className="flex items-start gap-3 group">
                          <div 
                            className="h-10 w-10 bg-cover bg-center rounded-lg flex-shrink-0 shadow-sm"
                            style={{ backgroundImage: `url(${event.image})` }}
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                              {event.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {event.date}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
