import { cn } from '@/lib/utils';
import type { EventChip } from '@/lib/eventChips';

const TONES: Record<EventChip['tone'], string> = {
  default: 'bg-loom-chip-bg text-loom-chip-fg',
  hot: 'bg-loom-chip-hot-bg text-loom-chip-hot-fg',
  muted: 'border border-loom-border-strong bg-loom-surface-2 text-loom-text-muted',
  free: 'bg-loom-success-bg text-loom-success',
  member: 'border border-loom-highlight-border bg-loom-highlight-bg text-loom-chip-fg',
};

export function Chip({ chip, className }: { chip: EventChip; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold', TONES[chip.tone], className)}>
      {chip.label}
    </span>
  );
}

export default function EventChips({ chips, className }: { chips: EventChip[]; className?: string }) {
  if (chips.length === 0) return null;
  return (
    <span className={cn('flex flex-wrap gap-1.5', className)}>
      {chips.map((chip) => (
        <Chip key={chip.label} chip={chip} />
      ))}
    </span>
  );
}
