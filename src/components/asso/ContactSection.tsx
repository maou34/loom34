import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/db/client';
import { cn } from '@/lib/utils';
import { btnPrimary, pageFocus } from '@/components/site/styles';

const SUBJECTS = ['Adhésion', 'Un événement', 'Devenir partenaire', 'Autre'];

const field = cn(
  'w-full rounded-xl border border-loom-border-strong bg-loom-surface-2 px-3.5 text-base text-loom-text placeholder:text-loom-text-muted',
  pageFocus,
);

/**
 * « Nous écrire » (#contact) : courte présentation + formulaire, qui alimente les
 * Messages de l'admin (table contact_tickets, insertion anonyme autorisée par
 * la RLS, lecture réservée aux admins).
 */
export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '', website: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    // Champ piège invisible : rempli seulement par les robots
    if (form.website) {
      setSent(true);
      return;
    }
    setSending(true);
    try {
      const { error } = await db.from('contact_tickets').insert({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject,
        message: form.message.trim(),
        // La contrainte n'accepte que « Nouveau » / « En attente » / « Répondu » / « Fermé »
        // (l'ancien formulaire envoyait « nouveau » : tous les envois échouaient).
        status: 'Nouveau',
      });
      if (error) throw error;
      setSent(true);
      setForm({ name: '', email: '', subject: SUBJECTS[0], message: '', website: '' });
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error("Le message n'a pas pu être envoyé. Réessayez, ou écrivez-nous à contactloom34@gmail.com.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" aria-labelledby="h-contact" className="scroll-mt-28">
      <div className="flex flex-col overflow-hidden rounded-[22px] border border-loom-border md:flex-row">
        {/* Mobile : bandeau court (titre + phrase) pour arriver vite au formulaire */}
        <div className="flex flex-col gap-3 bg-loom-band-dark-bg p-5 text-white sm:p-8 md:w-[42%] md:flex-none md:gap-4">
          <h2 id="h-contact" className="text-[26px] font-extrabold sm:text-3xl">
            Nous écrire
          </h2>
          <p className="text-loom-band-dark-text">
            Une question, une envie de nous rejoindre ou juste dire bonjour ? La porte de la tanière est toujours ouverte.
          </p>
          <div className="hidden flex-col gap-1 md:flex">
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-loom-yellow">Notre QG</span>
            <address className="not-italic text-loom-band-dark-text">
              49 rue du Faubourg Saint-Jaumes, bât. E
              <br />
              34000 Montpellier
            </address>
          </div>
        </div>

        <div className="flex-1 bg-loom-surface p-5 sm:p-8">
          {sent ? (
            <div role="status" className="flex h-full flex-col items-start justify-center gap-3">
              <CheckCircle2 aria-hidden="true" size={36} className="text-loom-success" />
              <p className="text-xl font-extrabold">Message envoyé, merci !</p>
              <p className="text-loom-text-2">Nous vous répondrons par e-mail, en général sous 24 à 48 h.</p>
              <button type="button" onClick={() => setSent(false)} className="font-bold text-loom-link underline underline-offset-4">
                Écrire un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <fieldset className="flex flex-col gap-2 sm:col-span-2">
                <legend className="mb-2 text-sm font-semibold">Votre message concerne…</legend>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => (
                    <label key={s} className="relative">
                      <input type="radio" name="subject" value={s} checked={form.subject === s} onChange={update('subject')} className="peer sr-only" />
                      <span
                        className={cn(
                          'inline-flex h-10 cursor-pointer items-center rounded-full border px-4 text-[15px] font-semibold transition-colors',
                          'border-loom-border-strong bg-loom-surface text-loom-text hover:border-loom-text-muted',
                          'peer-checked:border-loom-primary-bg peer-checked:bg-loom-primary-bg peer-checked:text-loom-primary-fg',
                          'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-loom-surface',
                        )}
                      >
                        {s}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Nom
                <input required value={form.name} onChange={update('name')} autoComplete="name" placeholder="Votre nom" className={cn(field, 'h-11 font-normal')} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                E-mail
                <input
                  required
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  value={form.email}
                  onChange={update('email')}
                  autoComplete="email"
                  placeholder="vous@exemple.fr"
                  className={cn(field, 'h-11 font-normal')}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
                Message
                <textarea required rows={4} value={form.message} onChange={update('message')} placeholder="Votre message…" className={cn(field, 'min-h-[7.5rem] py-3 font-normal sm:min-h-[9rem]')} />
              </label>
              {/* Piège à robots, invisible et ignoré par les lecteurs d'écran */}
              <label aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                Site web
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} />
              </label>
              <button type="submit" disabled={sending} className={cn(btnPrimary, 'h-12 text-base disabled:opacity-60 sm:col-span-2')}>
                {sending ? 'Envoi en cours…' : 'Envoyer le message'}
              </button>
              <p className="text-xs text-loom-text-muted sm:col-span-2">
                Nous répondons en général sous 24 à 48 h. Vos coordonnées servent uniquement à vous répondre ; elles ne sont ni publiées ni transmises.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
