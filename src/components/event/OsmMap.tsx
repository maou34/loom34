/**
 * Plan OpenStreetMap du lieu (iframe officielle openstreetmap.org/export/embed) :
 * pas de clé, pas de pistage publicitaire. Chargé paresseusement. Le plan reste
 * clair en mode nuit (style des tuiles OSM).
 */
export default function OsmMap({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
  // Cadre d'environ 500 m × 300 m autour du lieu (niveau rue)
  const dLon = 0.003;
  const dLat = 0.0018;
  const bbox = [longitude - dLon, latitude - dLat, longitude + dLon, latitude + dLat].map((n) => n.toFixed(5)).join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const fullUrl = `https://www.openstreetmap.org/?mlat=${latitude.toFixed(5)}&mlon=${longitude.toFixed(5)}#map=17/${latitude.toFixed(5)}/${longitude.toFixed(5)}`;

  return (
    <figure className="m-0 flex flex-col gap-1.5">
      <iframe
        src={src}
        title={`Plan : ${label}`}
        loading="lazy"
        className="h-[220px] w-full rounded-xl border border-loom-border bg-loom-surface-2"
      />
      <figcaption className="text-xs text-loom-text-muted">
        ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
          contributeurs OpenStreetMap
        </a>{' '}
        ·{' '}
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="underline">
          Agrandir le plan<span className="sr-only"> (nouvel onglet)</span>
        </a>
      </figcaption>
    </figure>
  );
}
