import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import type { Tables } from '@/db/types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BearDivider from '@/components/site/BearDivider';
import HomeHero from '@/components/home/HomeHero';
import LatestNews from '@/components/home/LatestNews';
import UpcomingEvents from '@/components/home/UpcomingEvents';
import JoinBlock from '@/components/home/JoinBlock';
import MonsieurOursBand from '@/components/home/MonsieurOursBand';
import type { FeaturedItem } from '@/components/home/FeaturedCard';
import useSEO from '@/hooks/useSEO';
import { useExternalLinks, useSiteSettings } from '@/hooks/useSiteSettings';
import { SEOHomePage } from '@/components/SEOPage';
import { isRecurringApero, todayISO } from '@/lib/eventDates';
import { ARTICLE_LIST_SELECT, type ArticleListItem } from '@/lib/articles';

const FALLBACK_MONSIEUR_OURS_PHOTO = '/gallery/images/Mr-ours-2026_gagnants.jpg';

/** Slug de l'événement visé par le lien de l'admin « Page d'accueil » (…/events/<slug>), ou null. */
function eventSlugFromLink(link?: string | null): string | null {
  const match = link?.match(/\/events\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const Index = () => {
  const seoDescription =
    "Rejoignez LOOM, l'association Bear fondée en 2017 à Montpellier. Plus de 150 membres, 50+ événements par an. Découvrez notre communauté dynamique et nos activités.";

  useSEO({
    title: 'LOOM - Les Ours Occitanie Montpellier | Communauté Bear de Montpellier',
    description: seoDescription,
    keywords: ['LOOM', 'Bears', 'Ours', 'Montpellier', 'Occitanie', 'Association', 'Communauté', 'LGBTQ+', 'événements', 'Bear community'],
    type: 'website',
  });

  const today = todayISO();
  const { data: siteSettings, isLoading: isLoadingSettings } = useSiteSettings();
  const { membershipUrl } = useExternalLinks();

  const { data: upcomingEvents = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['home', 'upcomingEvents', today],
    queryFn: async () => {
      const { data, error } = await db
        .from('events')
        .select('*')
        .eq('published', true)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(12);
      if (error) throw error;
      return data as Tables<'events'>[];
    },
  });

  // Élément mis en avant : l'événement visé par le lien « Page d'accueil » de l'admin
  // (s'il est publié et à venir), sinon la prochaine soirée hors apéros réguliers.
  const featuredSlug = eventSlugFromLink(siteSettings?.hero_link);
  const { data: linkedEvent, isLoading: isLoadingLinked } = useQuery({
    queryKey: ['home', 'featuredEvent', featuredSlug, today],
    enabled: !!featuredSlug,
    queryFn: async () => {
      const { data, error } = await db
        .from('events')
        .select('*')
        .eq('slug', featuredSlug!)
        .eq('published', true)
        .gte('date', today)
        .maybeSingle();
      if (error) throw error;
      return data as Tables<'events'> | null;
    },
  });

  const { data: latestArticles = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ['home', 'latestArticles'],
    queryFn: async () => {
      // L'article « À la une » (admin) en premier, puis les plus récents
      const { data, error } = await db
        .from('articles')
        .select(ARTICLE_LIST_SELECT)
        .eq('published', true)
        .order('is_featured', { ascending: false })
        .order('date', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as unknown as ArticleListItem[];
    },
  });

  const { data: partnersCount = null } = useQuery({
    queryKey: ['home', 'partnersCount'],
    queryFn: async () => {
      const { count, error } = await db.from('partners').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count;
    },
  });

  const { data: monsieurOurs = [] } = useQuery({
    queryKey: ['home', 'monsieurOursYears'],
    queryFn: async () => {
      const { data, error } = await db.from('monsieur_ours_timeline').select('year, title').order('year', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fallbackEvent = upcomingEvents.find((e) => !isRecurringApero(e.title)) ?? upcomingEvents[0] ?? null;
  const featuredEvent = linkedEvent ?? fallbackEvent;

  let featured: FeaturedItem | null = null;
  if (siteSettings?.hero_link && !featuredSlug && siteSettings.hero_image) {
    featured = { kind: 'visual', image: siteSettings.hero_image, link: siteSettings.hero_link };
  } else if (featuredEvent) {
    featured = { kind: 'event', event: featuredEvent };
  }
  const featuredLoading = isLoadingSettings || isLoadingEvents || (!!featuredSlug && isLoadingLinked);

  const eventCards = upcomingEvents
    .filter((e) => !isRecurringApero(e.title) && e.id !== (featured?.kind === 'event' ? featured.event.id : null))
    .slice(0, 3);

  const currentMonsieurOurs = monsieurOurs[0] ?? null;
  const firstYear = monsieurOurs.length ? monsieurOurs[monsieurOurs.length - 1].year : null;

  return (
    <div className="flex min-h-screen flex-col bg-loom-bg text-loom-text">
      <SEOHomePage title="Communauté Bear de Montpellier" description={seoDescription} />
      <Navbar />

      <main className="flex-1">
        <HomeHero featured={featured} featuredLoading={featuredLoading} membershipUrl={membershipUrl} partnersCount={partnersCount} />
        <BearDivider />
        <LatestNews articles={latestArticles} isLoading={isLoadingArticles} />
        <BearDivider />
        <UpcomingEvents events={eventCards} isLoading={isLoadingEvents} />
        <BearDivider />
        <JoinBlock membershipUrl={membershipUrl} partnersCount={partnersCount} />
        <MonsieurOursBand
          photo={siteSettings?.monsieur_ours_hero_image || FALLBACK_MONSIEUR_OURS_PHOTO}
          year={currentMonsieurOurs?.year ?? null}
          name={currentMonsieurOurs?.title ?? null}
          firstYear={firstYear}
        />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
