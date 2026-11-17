// Fichier .ics « Ajouter à mon agenda » pour un événement, généré dans le navigateur.
import { stripMarkdown } from '@/lib/markdown';
import { eventStart, parseEventTime } from '@/lib/eventDates';

type IcsEvent = {
  slug: string;
  title: string;
  date: string;
  time?: string | null;
  location?: string | null;
  description?: string | null;
};

/** Durée supposée d'une soirée : la base ne stocke pas d'heure de fin. */
const DEFAULT_DURATION_HOURS = 3;

const pad = (n: number) => String(n).padStart(2, '0');
const localStamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const dayStamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Échappement RFC 5545 des champs texte. */
const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lignes de 75 octets max (RFC 5545), en coupant entre caractères. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = out.length === 0 ? 75 : 74; // les lignes de suite commencent par une espace
    if (encoder.encode(current + char).length > limit) {
      out.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.join('\r\n ');
}

// Fuseau Europe/Paris, pour que l'heure reste juste quel que soit le fuseau du visiteur.
const VTIMEZONE_PARIS = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Paris',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export function buildEventIcs(event: IcsEvent, siteOrigin = window.location.origin): string {
  const url = `${siteOrigin}/events/${event.slug}`;
  const start = eventStart(event);
  const hasTime = parseEventTime(event.time) !== null;
  const description = [event.description ? stripMarkdown(event.description).slice(0, 500) : '', url]
    .filter(Boolean)
    .join('\n\n');

  let when: string[];
  if (hasTime) {
    const end = new Date(start.getTime() + DEFAULT_DURATION_HOURS * 3_600_000);
    when = [`DTSTART;TZID=Europe/Paris:${localStamp(start)}`, `DTEND;TZID=Europe/Paris:${localStamp(end)}`];
  } else {
    const next = new Date(start);
    next.setDate(next.getDate() + 1);
    when = [`DTSTART;VALUE=DATE:${dayStamp(start)}`, `DTEND;VALUE=DATE:${dayStamp(next)}`];
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LOOM//Site lgbt-loom.fr//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(hasTime ? VTIMEZONE_PARIS : []),
    'BEGIN:VEVENT',
    `UID:${event.slug}@lgbt-loom.fr`,
    `DTSTAMP:${utcStamp(new Date())}`,
    ...when,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Télécharge le .ics de l'événement (ouvert ensuite par l'agenda du téléphone / de l'ordinateur). */
export function downloadEventIcs(event: IcsEvent): void {
  const blob = new Blob([buildEventIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `${event.slug || 'evenement'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
