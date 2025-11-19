import { useState, useEffect } from 'react';
import { 
  Type, 
  Eye, 
  MousePointer2, 
  Palette, 
  RotateCcw
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface AccessibilityMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccessibilityMenu = ({ isOpen, onClose }: AccessibilityMenuProps) => {
  const [textSize, setTextSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [underlineLinks, setUnderlineLinks] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const [grayscaleMode, setGrayscaleMode] = useState(false);
  const [bigCursor, setBigCursor] = useState(false);

  // Charger les paramètres au montage
  useEffect(() => {
    loadSavedSettings();
  }, []);

  // Appliquer les paramètres dès qu'ils changent
  useEffect(() => {
    applyAccessibilitySettings();
  }, [textSize, highContrast, underlineLinks, simpleMode, dyslexicFont, grayscaleMode, bigCursor]);

  const loadSavedSettings = () => {
    try {
      const savedTextSize = localStorage.getItem('textSize');
      const savedHighContrast = localStorage.getItem('highContrast');
      const savedUnderlineLinks = localStorage.getItem('underlineLinks');
      const savedSimpleMode = localStorage.getItem('simpleMode');
      const savedDyslexicFont = localStorage.getItem('dyslexicFont');
      const savedGrayscaleMode = localStorage.getItem('grayscaleMode');
      const savedBigCursor = localStorage.getItem('bigCursor');

      if (savedTextSize) setTextSize(Number(savedTextSize));
      if (savedHighContrast === 'true') setHighContrast(true);
      if (savedUnderlineLinks === 'true') setUnderlineLinks(true);
      if (savedSimpleMode === 'true') setSimpleMode(true);
      if (savedDyslexicFont === 'true') setDyslexicFont(true);
      if (savedGrayscaleMode === 'true') setGrayscaleMode(true);
      if (savedBigCursor === 'true') setBigCursor(true);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  };

  const applyAccessibilitySettings = () => {
    try {
      // Sauvegarder les paramètres
      localStorage.setItem('textSize', textSize.toString());
      localStorage.setItem('highContrast', highContrast.toString());
      localStorage.setItem('underlineLinks', underlineLinks.toString());
      localStorage.setItem('simpleMode', simpleMode.toString());
      localStorage.setItem('dyslexicFont', dyslexicFont.toString());
      localStorage.setItem('grayscaleMode', grayscaleMode.toString());
      localStorage.setItem('bigCursor', bigCursor.toString());

      // Appliquer les styles
      document.documentElement.style.setProperty('--text-size', `${textSize}%`);
      
      // Helper pour toggle les classes sur html (documentElement) pour que les sélecteurs CSS globaux fonctionnent
      const toggleHtmlClass = (className: string, isActive: boolean) => {
        if (isActive) document.documentElement.classList.add(className);
        else document.documentElement.classList.remove(className);
      };

      toggleHtmlClass('high-contrast', highContrast);
      toggleHtmlClass('underline-links', underlineLinks);
      toggleHtmlClass('simple-mode', simpleMode);
      toggleHtmlClass('dyslexic-font', dyslexicFont);
      toggleHtmlClass('grayscale-mode', grayscaleMode);
      toggleHtmlClass('big-cursor', bigCursor);

    } catch (error) {
      console.error('Erreur lors de l\'application des paramètres:', error);
    }
  };

  const resetSettings = () => {
    setTextSize(100);
    setHighContrast(false);
    setUnderlineLinks(false);
    setSimpleMode(false);
    setDyslexicFont(false);
    setGrayscaleMode(false);
    setBigCursor(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-white/95 backdrop-blur-xl border-l border-white/20 shadow-2xl">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Eye className="h-6 w-6 text-orange" />
            Accessibilité
          </SheetTitle>
          <SheetDescription className="text-gray-500">
            Personnalisez l'affichage du site pour une expérience adaptée à vos besoins.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          {/* Section Affichage */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Type className="h-4 w-4" />
              Affichage du texte
            </h3>
            
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">Taille du texte</Label>
                  <span className="text-sm font-bold text-orange bg-orange/10 px-2 py-1 rounded-md">{textSize}%</span>
                </div>
                <Slider
                  value={[textSize]}
                  min={75}
                  max={150}
                  step={5}
                  onValueChange={(value) => setTextSize(value[0])}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-gray-400 px-1">
                  <span>A-</span>
                  <span>A</span>
                  <span>A+</span>
                </div>
              </div>

              <Separator className="bg-gray-200" />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Police dyslexique</Label>
                  <p className="text-xs text-gray-500">Police optimisée pour la lecture</p>
                </div>
                <Switch
                  checked={dyslexicFont}
                  onCheckedChange={setDyslexicFont}
                />
              </div>
            </div>
          </div>

          {/* Section Couleurs & Visuel */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Couleurs & Visuel
            </h3>
            
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Contraste élevé</Label>
                  <p className="text-xs text-gray-500">Augmente le contraste des couleurs</p>
                </div>
                <Switch
                  checked={highContrast}
                  onCheckedChange={(checked) => {
                    setHighContrast(checked);
                    if (checked) setSimpleMode(false);
                  }}
                />
              </div>

              <Separator className="bg-gray-200" />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Monochrome</Label>
                  <p className="text-xs text-gray-500">Convertit le site en nuances de gris</p>
                </div>
                <Switch
                  checked={grayscaleMode}
                  onCheckedChange={setGrayscaleMode}
                />
              </div>
            </div>
          </div>

          {/* Section Navigation */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <MousePointer2 className="h-4 w-4" />
              Navigation & Aide
            </h3>
            
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Curseur agrandi</Label>
                  <p className="text-xs text-gray-500">Agrandit le curseur de la souris</p>
                </div>
                <Switch
                  checked={bigCursor}
                  onCheckedChange={setBigCursor}
                />
              </div>

              <Separator className="bg-gray-200" />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Souligner les liens</Label>
                  <p className="text-xs text-gray-500">Rend les liens plus visibles</p>
                </div>
                <Switch
                  checked={underlineLinks}
                  onCheckedChange={setUnderlineLinks}
                />
              </div>

              <Separator className="bg-gray-200" />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Mode lecture simple</Label>
                  <p className="text-xs text-gray-500">Supprime les images et simplifie la mise en page</p>
                </div>
                <Switch
                  checked={simpleMode}
                  onCheckedChange={(checked) => {
                    setSimpleMode(checked);
                    if (checked) setHighContrast(false);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <Button 
            variant="outline" 
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
            onClick={resetSettings}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser les paramètres
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccessibilityMenu; 