import { Switch } from "@/components/ui/switch";

type Props = {
  id: string;
  title: string;
  published: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

/**
 * Interrupteur Publié / Brouillon des listes admin (Événements, Articles) :
 * change le statut d'un clic, sans ouvrir la fenêtre d'édition.
 */
export default function PublishToggle({ id, title, published, disabled, onToggle }: Props) {
  const switchId = `publish-${id}`;
  return (
    <div className="flex flex-none flex-col items-center gap-0.5 sm:w-[7.5rem] sm:flex-row-reverse sm:justify-start sm:gap-2">
      <Switch
        id={switchId}
        checked={published}
        disabled={disabled}
        onCheckedChange={onToggle}
        aria-label={`${published ? "Publié" : "Brouillon"} : « ${title} ». ${published ? "Repasser en brouillon" : "Publier"}`}
        className="data-[state=checked]:bg-green-600"
      />
      <label
        htmlFor={switchId}
        aria-hidden="true"
        className={`cursor-pointer select-none text-[11px] font-semibold sm:text-xs ${published ? "text-green-800" : "text-loom-text-muted"}`}
      >
        {published ? "Publié" : "Brouillon"}
      </label>
    </div>
  );
}
