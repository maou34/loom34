import { cn } from '@/lib/utils';
import { initials, type TeamGroup } from '@/lib/asso';

/**
 * « La Tanière » : membres du bureau par sections titrées. 3 cartes de 240 px
 * maximum par ligne en desktop (conteneur 780 px, lignes centrées), 2 en mobile.
 * Pas d'animation de survol (l'ancienne inclinaison est supprimée).
 */
export default function Taniere({ groups }: { groups: TeamGroup[] }) {
  return (
    <section aria-labelledby="h-team" className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 id="h-team" className="text-[26px] font-extrabold sm:text-4xl">
          La Tanière
        </h2>
        <p className="text-base text-loom-text-muted sm:text-[17px]">Les bénévoles qui font vivre l'association au quotidien.</p>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-5">
          <h3 className="flex items-center gap-4 text-lg font-extrabold text-loom-title-accent">
            <span aria-hidden="true" className="h-px flex-1 bg-loom-border-strong" />
            {group.title}
            <span aria-hidden="true" className="h-px flex-1 bg-loom-border-strong" />
          </h3>
          <ul className="mx-auto flex w-full max-w-[780px] flex-wrap justify-center gap-3 sm:gap-[30px]">
            {group.team_members.map((member) => (
              <li
                key={member.id}
                className="box-border flex w-[calc(50%-6px)] flex-col items-center gap-3 rounded-[18px] border border-loom-border bg-loom-surface p-3 text-center sm:w-[240px] sm:p-4"
              >
                {member.photo ? (
                  <img src={member.photo} alt={`Portrait de ${member.name}`} loading="lazy" className="aspect-square w-full rounded-xl bg-loom-surface-2 object-cover" />
                ) : (
                  <div
                    role="img"
                    aria-label={`Pas encore de photo pour ${member.name}`}
                    className="flex aspect-square w-full items-center justify-center rounded-xl bg-loom-chip-bg text-4xl font-extrabold text-loom-chip-fg"
                  >
                    {initials(member.name)}
                  </div>
                )}
                <span className="flex flex-col gap-0.5">
                  <span className="font-extrabold">{member.name}</span>
                  <span className={cn('text-[13px] font-semibold text-loom-accent-text')}>{member.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
