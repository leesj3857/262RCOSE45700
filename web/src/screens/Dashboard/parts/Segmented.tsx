type Option<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
};

export default function Segmented<T extends string>({ options, value, onChange, label, className = "" }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex rounded-full bg-surface p-1 ${className}`}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`h-10 flex-1 rounded-full px-3 text-[14px] font-bold whitespace-nowrap transition-colors ${
              on ? "bg-ink text-white shadow-sm" : "text-ink-sub"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
