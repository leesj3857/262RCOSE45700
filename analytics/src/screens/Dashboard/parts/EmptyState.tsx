import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel bg-surface px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-white text-ink-muted shadow-sm">{icon}</span>
      <p className="text-[16px] font-extrabold">{title}</p>
      {description && <p className="max-w-[260px] text-[14px] leading-relaxed text-ink-sub">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
