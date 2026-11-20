import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL } from "@/lib/urlFilters";

export type FilterOption = { value: string; label: string };

export function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  // Valeur de l'adresse qui n'existe plus (ville sans événement…) : affichée quand même
  const known = value === ALL || options.some((o) => o.value === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={`h-10 w-full sm:w-auto sm:min-w-[10.5rem] ${value !== ALL ? "border-loom-text-muted font-semibold" : ""}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {!known && <SelectItem value={value}>{value}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ClearFiltersButton({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold text-loom-text-2 hover:bg-loom-surface-2 hover:text-loom-text"
    >
      <X aria-hidden="true" className="h-4 w-4" />
      Effacer les filtres ({count})
    </button>
  );
}
