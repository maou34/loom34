import { useEffect, useState, type ReactNode } from 'react';
import { Eye, MousePointer2, Palette, RotateCcw, Type } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface AccessibilityMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Options booléennes : clé localStorage → classe posée sur <html> (styles dans src/styles/globals.css). */
const OPTIONS = {
  dyslexicFont: 'dyslexic-font',
  highContrast: 'high-contrast',
  grayscaleMode: 'grayscale-mode',
  bigCursor: 'big-cursor',
  underlineLinks: 'underline-links',
  comfortReading: 'comfort-reading',
} as const;
type OptionKey = keyof typeof OPTIONS;

const NO_OPTION: Record<OptionKey, boolean> = {
  dyslexicFont: false,
  highContrast: false,
  grayscaleMode: false,
  bigCursor: false,
  underlineLinks: false,
  comfortReading: false,
};

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // navigation privée : l'option s'applique sans être mémorisée
  }
};

function OptionRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-base font-semibold text-loom-text">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-sm text-loom-text-muted">
          {hint}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={`${id}-hint`} />
    </div>
  );
}

function Group({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-loom-text-2">
        {icon}
        {title}
      </h3>
      <div className="divide-y divide-loom-border rounded-xl border border-loom-border bg-loom-surface-2 px-4">{children}</div>
    </section>
  );
}

/**
 * Panneau « Options d'accessibilité » (ouvert depuis le pied de page). Les
 * réglages sont mémorisés dans le navigateur et appliqués par des classes sur
 * <html> ; les couleurs viennent du thème, donc le panneau reste lisible en
 * thème clair, en mode nuit et en contraste élevé.
 */
const AccessibilityMenu = ({ isOpen, onClose }: AccessibilityMenuProps) => {
  const [textSize, setTextSize] = useState(100);
  const [options, setOptions] = useState<Record<OptionKey, boolean>>(NO_OPTION);
  const [loaded, setLoaded] = useState(false);

  // Réglages mémorisés
  useEffect(() => {
    const size = Number(read('textSize'));
    if (size >= 75 && size <= 150) setTextSize(size);
    const saved = { ...NO_OPTION };
    for (const key of Object.keys(OPTIONS) as OptionKey[]) saved[key] = read(key) === 'true';
    setOptions(saved);
    // L'ancien « mode lecture simple » cassait la mise en page : abandonné
    try {
      localStorage.removeItem('simpleMode');
    } catch {
      // ignoré
    }
    document.documentElement.classList.remove('simple-mode');
    setLoaded(true);
  }, []);

  // Application + mémorisation (après la lecture, pour ne pas écraser les réglages)
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    root.style.setProperty('--text-size', `${textSize}%`);
    write('textSize', String(textSize));
    for (const key of Object.keys(OPTIONS) as OptionKey[]) {
      root.classList.toggle(OPTIONS[key], options[key]);
      write(key, String(options[key]));
    }
  }, [loaded, textSize, options]);

  const set = (key: OptionKey) => (value: boolean) => setOptions((o) => ({ ...o, [key]: value }));
  const active = textSize !== 100 || Object.values(options).some(Boolean);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-l border-loom-border bg-loom-surface text-loom-text sm:max-w-md">
        <SheetHeader className="mb-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-2xl font-extrabold text-loom-text">
            <Eye aria-hidden="true" className="h-6 w-6 text-loom-accent-text" />
            Accessibilité
          </SheetTitle>
          <SheetDescription className="text-loom-text-muted">Adaptez l'affichage du site à vos besoins. Vos choix sont mémorisés sur cet appareil.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6">
          <Group icon={<Type aria-hidden="true" className="h-4 w-4" />} title="Texte">
            <div className="flex flex-col gap-3 py-4">
              <div className="flex items-center justify-between">
                <span id="a11y-size-label" className="text-base font-semibold text-loom-text">
                  Taille du texte
                </span>
                <span className="rounded-md bg-loom-surface px-2 py-0.5 text-sm font-bold text-loom-text ring-1 ring-loom-border">{textSize} %</span>
              </div>
              <Slider value={[textSize]} min={75} max={150} step={5} onValueChange={(v) => setTextSize(v[0])} aria-labelledby="a11y-size-label" className="py-2" />
              <div aria-hidden="true" className="flex justify-between px-1 text-sm text-loom-text-muted">
                <span className="text-xs">A</span>
                <span>A</span>
                <span className="text-lg">A</span>
              </div>
            </div>
            <OptionRow id="a11y-dyslexic" label="Police dyslexique" hint="Police OpenDyslexic, conçue pour faciliter la lecture" checked={options.dyslexicFont} onChange={set('dyslexicFont')} />
            <OptionRow id="a11y-comfort" label="Lecture confortable" hint="Texte plus espacé (lignes, lettres et mots)" checked={options.comfortReading} onChange={set('comfortReading')} />
          </Group>

          <Group icon={<Palette aria-hidden="true" className="h-4 w-4" />} title="Couleurs">
            <OptionRow
              id="a11y-contrast"
              label="Contraste élevé"
              hint="Noir sur blanc (ou blanc sur noir en mode nuit), liens soulignés"
              checked={options.highContrast}
              onChange={set('highContrast')}
            />
            <OptionRow id="a11y-grayscale" label="Monochrome" hint="Affiche le site en nuances de gris" checked={options.grayscaleMode} onChange={set('grayscaleMode')} />
          </Group>

          <Group icon={<MousePointer2 aria-hidden="true" className="h-4 w-4" />} title="Navigation">
            <OptionRow id="a11y-cursor" label="Curseur agrandi" hint="Agrandit le pointeur de la souris" checked={options.bigCursor} onChange={set('bigCursor')} />
            <OptionRow id="a11y-links" label="Souligner les liens" hint="Rend les liens plus faciles à repérer" checked={options.underlineLinks} onChange={set('underlineLinks')} />
          </Group>

          <button
            type="button"
            onClick={() => {
              setTextSize(100);
              setOptions(NO_OPTION);
            }}
            disabled={!active}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-loom-secondary-border bg-loom-secondary-bg font-semibold text-loom-secondary-fg transition-colors hover:border-loom-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Réinitialiser
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccessibilityMenu;
