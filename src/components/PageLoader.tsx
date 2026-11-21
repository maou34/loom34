/**
 * Affiché seulement au tout premier chargement d'une page (ouverture du site ou
 * page pas encore téléchargée). Lors d'un changement de page, la page actuelle
 * reste à l'écran jusqu'à ce que la suivante soit prête (react-router 7 enveloppe
 * les navigations dans startTransition) : plus de clignotement. Fond aux couleurs du thème,
 * avec une fine barre de progression pour les connexions lentes.
 */
const PageLoader = () => (
  <div className="min-h-screen bg-loom-bg" role="status" aria-label="Chargement de la page">
    <div aria-hidden="true" className="fixed inset-x-0 top-0 h-[3px] overflow-hidden">
      <div className="h-full w-1/3 animate-[loom-loading_1.1s_ease-in-out_infinite] bg-bear" />
    </div>
  </div>
);

export default PageLoader;
