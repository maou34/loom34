import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatAlbumDate(value: unknown): string {
  if (value == null) return "";

  // Accepte string ISO, number ms, number seconds, Date
  let d: Date;

  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "number") {
    // Heuristique : si c'est en secondes, convertir en ms
    d = new Date(value < 10_000_000_000 ? value * 1000 : value);
  } else if (typeof value === "string") {
    const s = value.trim();
    if (!s) return "";
    d = new Date(s);
  } else {
    d = new Date(String(value));
  }

  if (Number.isNaN(d.getTime())) return "";
  return format(d, "d MMMM yyyy", { locale: fr });
}