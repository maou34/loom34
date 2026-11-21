import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BearDivider from '@/components/site/BearDivider';
import StoryTimeline from '@/components/asso/StoryTimeline';
import Taniere from '@/components/asso/Taniere';
import ContactSection from '@/components/asso/ContactSection';
import { card, container } from '@/components/site/styles';
import useSEO from '@/hooks/useSEO';
import { cn } from '@/lib/utils';
import { useHistoryEntries, useTeam } from '@/lib/asso';

const About = () => {
  useSEO({
    title: "L'asso - LOOM | Les Ours Occitanie Montpellier, association Bear depuis 2017",
    description:
      "LOOM - Les Ours Occitanie Montpellier : notre histoire depuis 2017, le bureau de l'association et comment nous écrire. Une communauté Bear inclusive à Montpellier.",
    keywords: ['LOOM', 'Bears', 'association', 'Montpellier', 'histoire', 'bureau', 'contact', 'communauté LGBTQ+'],
    type: 'website',
  });

  const { hash } = useLocation();
  const { data: history = [], isLoading: loadingHistory } = useHistoryEntries();
  const { data: team = [], isLoading: loadingTeam } = useTeam();
  const { data: partnersCount = null } = useQuery({
    queryKey: ['home', 'partnersCount'],
    queryFn: async () => {
      const { count, error } = await db.from('partners').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count;
    },
  });

  // Lien « Nous écrire → » (/about#contact) : React Router ne défile pas jusqu'à l'ancre
  useEffect(() => {
    if (hash !== '#contact') return;
    const timer = window.setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 100);
    return () => window.clearTimeout(timer);
  }, [hash, loadingHistory, loadingTeam]);

  const stats = [
    { value: '150+', label: 'membres actifs' },
    { value: '50+', label: 'événements par an' },
    { value: String(partnersCount ?? 23), label: 'partenaires' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-loom-bg text-loom-text">
      <Navbar />

      <main className="flex-1">
        {/* Hero + vision */}
        <section aria-labelledby="a-title" className={cn(container, 'flex flex-wrap items-center gap-8 pb-10 pt-8 sm:gap-12 sm:pb-14 sm:pt-14')}>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
            <span className="self-start rounded-full border border-loom-highlight-border bg-loom-highlight-bg px-3 py-1.5 text-sm font-semibold text-loom-highlight-label">
              Depuis le 9 novembre 2017
            </span>
            <h1 id="a-title" className="text-[34px] font-extrabold leading-[1.1] tracking-[-0.01em] sm:text-5xl">
              Plus qu'une association, <span className="text-loom-title-accent">une communauté</span>
            </h1>
            <p className="max-w-[520px] text-[17px] text-loom-text-2 sm:text-lg">
              Un espace de bienveillance pour les Bears et leurs admirateurs, du XS au XXXXXL.
            </p>
            <dl className="flex flex-wrap gap-6 sm:gap-8">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <dt className="order-2 text-sm text-loom-text-muted">{s.label}</dt>
                  <dd className="text-[26px] font-extrabold text-loom-stat sm:text-[28px]">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="m-0 flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-[22px] bg-loom-join-bg p-6 text-white sm:p-8">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-loom-yellow">Notre vision</span>
            <blockquote className="m-0 text-lg font-semibold leading-snug sm:text-xl">
              « Créer un refuge de convivialité où chaque ours, peu importe son pelage ou sa carrure, trouve sa place. Nous
              célébrons la diversité, la fraternité et la joie de vivre ensemble sous le soleil de Montpellier. »
            </blockquote>
            <figcaption className="flex flex-wrap gap-2">
              {['Inclusivité', 'Fraternité'].map((v) => (
                <span key={v} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  {v}
                </span>
              ))}
            </figcaption>
          </figure>
        </section>

        <BearDivider />
        <div className={cn(container, 'py-10 sm:py-14')}>
          {loadingHistory ? (
            <div aria-hidden="true" className={cn(card, 'h-[220px] animate-pulse bg-loom-surface-2')} />
          ) : (
            history.length > 0 && <StoryTimeline entries={history} />
          )}
        </div>

        <BearDivider />
        <div className={cn(container, 'py-10 sm:py-14')}>
          {loadingTeam ? (
            <div aria-hidden="true" className={cn(card, 'h-[320px] animate-pulse bg-loom-surface-2')} />
          ) : (
            team.length > 0 && <Taniere groups={team} />
          )}
        </div>

        <BearDivider />
        <div className={cn(container, 'pb-16 pt-10 sm:pb-[72px] sm:pt-14')}>
          <ContactSection />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
