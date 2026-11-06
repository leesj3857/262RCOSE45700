import { useState } from "react";
import { Car, Check, ChevronDown } from "lucide-react";
import { VEHICLES } from "@/mockData/taxonomy";
import { THIS_WEEK } from "@/mockData/events";
import { inRange } from "@/lib/dates";
import { useAllEvents, useScopeData } from "@/state/useScopeData";
import { setScope } from "@/state/userData";
import { showToast } from "@/state/toast";
import Sheet from "./Sheet";

export default function VehicleSwitch() {
  const { scope } = useScopeData();
  const all = useAllEvents();
  const [open, setOpen] = useState(false);
  const current = VEHICLES.find((v) => v.id === scope.vehicle) ?? VEHICLES[0];

  if (VEHICLES.length < 2) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`현재 차량 ${current.id}. 눌러서 다른 차량 보기`}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-ink pr-3 pl-3.5 text-white transition-colors active:bg-ink/80"
      >
        <Car className="size-[18px]" aria-hidden="true" />
        <span className="num text-[13px] font-extrabold">{current.id}</span>
        <ChevronDown className="size-4 text-white/70" aria-hidden="true" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="차량 바꾸기">
        <ul className="flex flex-col gap-2.5">
          {VEHICLES.map((v) => {
            const on = v.id === current.id;
            const n = all.filter((e) => e.vehicleId === v.id && inRange(e.occurredAt, THIS_WEEK)).length;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setScope({ vehicle: v.id });
                    setOpen(false);
                    if (!on) showToast(`${v.name} 차량으로 바꿨어요`);
                  }}
                  className={`flex w-full items-center gap-3 rounded-[20px] border p-4 text-left transition-colors ${on ? "border-ink bg-kakao-soft" : "border-line active:bg-surface"}`}
                >
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${on ? "bg-kakao" : "bg-surface"}`}>
                    <Car className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-extrabold">{v.name}</span>
                    <span className="num block text-[12px] text-ink-muted">
                      {v.id} · {v.plate}
                    </span>
                    <span className="num block text-[12px] text-ink-sub">이번 주 {n}건</span>
                  </span>
                  {on && <Check className="size-5 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
