import type { Act, Target } from "./steps";

export type Win = Window & typeof globalThis;

export const SW = 390;
export const SH = 800;

type Box = { x: number; y: number; w: number; h: number; r: number; o: number };

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const frame = () => new Promise<number>((r) => requestAnimationFrame(r));

export function resolve(doc: Document, t: Target): HTMLElement | null {
  let root: ParentNode = doc;
  if (t.within) {
    const w = resolve(doc, t.within);
    if (!w) return null;
    root = w;
  }
  const list = Array.from(root.querySelectorAll<HTMLElement>(t.sel));
  const text = t.text;
  let el: HTMLElement | null | undefined =
    text === undefined
      ? list[0]
      : list.find((n) => {
          const s = (n.textContent ?? "").trim();
          return t.starts ? s.startsWith(text) : s.includes(text);
        });
  for (let i = 0; i < (t.up ?? 0) && el; i++) el = el.parentElement;
  return el ?? null;
}

export class Overlay {
  spot: HTMLDivElement | null = null;
  note: HTMLDivElement | null = null;
  noteText: HTMLSpanElement | null = null;
  touch: HTMLDivElement | null = null;
  layer: HTMLDivElement | null = null;
  curtainEl: HTMLDivElement | null = null;
  bar: HTMLDivElement | null = null;
  win: () => Win | null = () => null;
  reduced = false;

  private follow: HTMLElement | null = null;
  private pad = 8;
  private cur: Box = { x: SW / 2, y: SH / 2, w: 0, h: 0, r: 20, o: 0 };
  private goal: Box = { x: SW / 2, y: SH / 2, w: 0, h: 0, r: 20, o: 0 };
  private pos = { x: SW * 0.72, y: SH * 0.8 };
  private raf = 0;
  private last = 0;
  private sampled = 0;
  private noteOn = false;

  attach<K extends "spot" | "note" | "noteText" | "touch" | "layer" | "curtainEl" | "bar">(key: K) {
    return (n: Overlay[K]) => {
      (this as Overlay)[key] = n;
    };
  }

  start(win: () => Win | null, reduced: boolean) {
    this.win = win;
    this.reduced = reduced;
    const loop = (now: number) => {
      this.tick(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  private measure(el: HTMLElement): Box | null {
    if (!el.isConnected) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    const p = this.pad;
    const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
    const br = cs ? parseFloat(cs.borderTopLeftRadius) || 0 : 0;
    let top = r.top - p;
    let bottom = r.bottom + p;
    const main = el.ownerDocument.querySelector("main");
    if (main && main.contains(el)) {
      const m = main.getBoundingClientRect();
      top = Math.max(top, m.top + 4);
      bottom = Math.min(bottom, m.bottom - 4);
    }
    const h = Math.max(0, bottom - top);
    const radius = Math.min(br > 0 ? br + p : 14 + p * 0.5, h / 2);
    return { x: r.left - p, y: top, w: r.width + p * 2, h, r: radius, o: 1 };
  }

  private tick(now: number) {
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now;
    if (this.follow) {
      const m = this.measure(this.follow);
      if (m) this.goal = m;
      else this.goal = { ...this.goal, o: 0 };
    }
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 11);
    const ko = this.reduced ? 1 : 1 - Math.exp(-dt * 9);
    const c = this.cur;
    const g = this.goal;
    c.x += (g.x - c.x) * k;
    c.y += (g.y - c.y) * k;
    c.w += (g.w - c.w) * k;
    c.h += (g.h - c.h) * k;
    c.r += (g.r - c.r) * k;
    c.o += (g.o - c.o) * ko;
    if (this.spot) {
      const s = this.spot.style;
      s.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
      s.width = `${Math.max(0, c.w)}px`;
      s.height = `${Math.max(0, c.h)}px`;
      s.borderRadius = `${Math.max(0, c.r)}px`;
      s.opacity = `${c.o < 0.01 ? 0 : c.o}`;
    }
    if (this.note) this.placeNote();
    if (this.touch) this.touch.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
    if (now - this.sampled > 250) {
      this.sampled = now;
      this.sampleBar();
    }
  }

  private placeNote() {
    const n = this.note;
    if (!n) return;
    const c = this.cur;
    const w = n.offsetWidth;
    const h = n.offsetHeight;
    const gap = 12;
    let side: "top" | "bottom" | "inside" = "top";
    let y = c.y - gap - h;
    if (y < 12) {
      side = "bottom";
      y = c.y + c.h + gap;
      if (y + h > SH - 12) {
        side = "inside";
        y = Math.max(12, c.y + 12);
      }
    }
    const cx = c.x + c.w / 2;
    const x = Math.min(SW - 12 - w, Math.max(12, cx - w / 2));
    const px = Math.min(w - 18, Math.max(18, cx - x));
    n.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    n.style.setProperty("--px", `${px}px`);
    n.dataset.side = side;
  }

  private sampleBar() {
    const win = this.win();
    const bar = this.bar;
    if (!win || !bar) return;
    let el = win.document.elementFromPoint(SW / 2, 2) as HTMLElement | null;
    let color = "";
    while (el) {
      const bg = win.getComputedStyle(el).backgroundColor;
      const m = bg.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(",").map((v) => parseFloat(v));
        if (parts.length < 4 || parts[3] > 0.5) {
          color = `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
          break;
        }
      }
      el = el.parentElement;
    }
    bar.style.backgroundColor = color || "#f5f6f8";
  }

  focusOn(el: HTMLElement | null, note?: string, pad = 8) {
    const wasOff = this.cur.o < 0.08;
    this.follow = el;
    this.pad = pad;
    if (el) {
      const m = this.measure(el);
      if (m) {
        this.goal = m;
        if (wasOff) this.cur = { x: m.x - 16, y: m.y - 16, w: m.w + 32, h: m.h + 32, r: m.r + 10, o: 0 };
      }
    } else {
      this.goal = { ...this.goal, o: 0 };
    }
    this.setNote(el ? note : undefined);
  }

  setNote(text?: string) {
    const n = this.note;
    if (!n || !this.noteText) return;
    if (!text) {
      if (this.noteOn) n.classList.remove("is-on");
      this.noteOn = false;
      return;
    }
    this.noteText.textContent = text;
    n.classList.remove("is-on");
    void n.offsetWidth;
    n.classList.add("is-on");
    this.noteOn = true;
  }

  release() {
    this.focusOn(null);
    this.hideTouch();
  }

  hideTouch() {
    if (this.touch) this.touch.style.opacity = "0";
  }

  async moveTouch(x: number, y: number, alive: () => boolean) {
    const t = this.touch;
    if (!t) return;
    if (t.style.opacity !== "1") {
      this.pos = { x: Math.min(SW - 30, x + 50), y: Math.min(SH - 40, y + 150) };
      t.style.opacity = "1";
    }
    const from = { ...this.pos };
    const dx = x - from.x;
    const dy = y - from.y;
    const dist = Math.hypot(dx, dy);
    if (this.reduced || dist < 2) {
      this.pos = { x, y };
      return;
    }
    const dur = Math.min(1050, Math.max(520, 420 + dist * 0.9));
    const bend = Math.min(70, dist * 0.2);
    const cx = from.x + dx / 2 + (dy / dist) * bend;
    const cy = from.y + dy / 2 - (dx / dist) * bend;
    const start = performance.now();
    for (;;) {
      const now = await frame();
      if (!alive()) return;
      const p = Math.min(1, (now - start) / dur);
      const e = easeInOut(p);
      const a = 1 - e;
      this.pos = { x: a * a * from.x + 2 * a * e * cx + e * e * x, y: a * a * from.y + 2 * a * e * cy + e * e * y };
      if (p >= 1) break;
    }
  }

  async press(alive: () => boolean) {
    const t = this.touch;
    if (!t || !this.layer) return;
    t.classList.add("is-press");
    const ripple = document.createElement("span");
    ripple.className = "demo-ripple";
    ripple.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
    this.layer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 900);
    await sleep(150);
    t.classList.remove("is-press");
    if (!alive()) return;
  }

  async curtain(on: boolean) {
    const c = this.curtainEl;
    if (!c) return;
    c.style.opacity = on ? "1" : "0";
    if (!this.reduced) await sleep(on ? 200 : 60);
  }
}

export type Ctx = {
  ov: Overlay;
  win: () => Win | null;
  alive: () => boolean;
};

function mainOf(win: Win) {
  return win.document.querySelector("main");
}

async function find(ctx: Ctx, t: Target) {
  for (let n = 0; n < 11; n++) {
    const win = ctx.win();
    if (!win || !ctx.alive()) return null;
    const el = resolve(win.document, t);
    if (el) return el;
    await sleep(150);
  }
  return null;
}

export async function scrollMain(ctx: Ctx, top: number) {
  const win = ctx.win();
  if (!win) return;
  const main = mainOf(win);
  if (!main) return;
  const max = Math.max(0, main.scrollHeight - main.clientHeight);
  const to = Math.min(max, Math.max(0, top));
  const from = main.scrollTop;
  const dist = Math.abs(to - from);
  if (dist < 2) return;
  main.style.scrollBehavior = "auto";
  if (ctx.ov.reduced) {
    main.scrollTop = to;
    return;
  }
  const dur = Math.min(1300, 520 + dist * 0.75);
  const start = performance.now();
  for (;;) {
    const now = await frame();
    if (!ctx.alive()) return;
    const p = Math.min(1, (now - start) / dur);
    main.scrollTop = from + (to - from) * easeInOut(p);
    if (p >= 1) break;
  }
}

async function reveal(ctx: Ctx, el: HTMLElement) {
  const win = ctx.win();
  if (!win) return;
  const main = mainOf(win);
  if (!main || !main.contains(el)) return;
  const m = main.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const top = m.top + 84;
  const bottom = m.bottom - 96;
  if (r.top >= top && r.bottom <= bottom) return;
  const seen = Math.min(r.bottom, bottom) - Math.max(r.top, top);
  if (r.top >= top && r.height > 200 && seen / r.height >= 0.75) return;
  const room = bottom - top;
  const offset = r.height > room ? r.top - top : r.top - top - (room - r.height) / 2;
  await scrollMain(ctx, main.scrollTop + offset);
}

function center(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

async function tapEl(ctx: Ctx, el: HTMLElement, spot: HTMLElement, note?: string) {
  const { ov, alive } = ctx;
  await reveal(ctx, el);
  if (!alive()) return false;
  ov.focusOn(spot, note, 6);
  const c = center(el);
  await ov.moveTouch(c.x, c.y, alive);
  if (!alive()) return false;
  await sleep(140);
  if (!alive()) return false;
  await ov.press(alive);
  if (!alive()) return false;
  el.click();
  return true;
}

export function escape(win: Win) {
  win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape" }));
  const a = win.document.activeElement;
  if (a instanceof win.HTMLElement) a.blur();
}

export async function navigate(ctx: Ctx, path: string) {
  const win = ctx.win();
  if (!win) return;
  const { ov } = ctx;
  escape(win);
  ov.release();
  const hash = `#${path}`;
  if (win.location.hash !== hash) {
    await ov.curtain(true);
    if (!ctx.alive()) {
      await ov.curtain(false);
      return;
    }
    win.location.hash = hash;
    for (let n = 0; n < 20 && !mainOf(win); n++) await sleep(50);
    await sleep(140);
    const main = mainOf(win);
    if (main) {
      main.style.scrollBehavior = "auto";
      main.scrollTop = 0;
    }
    await ov.curtain(false);
  } else {
    await scrollMain(ctx, 0);
  }
}

const jitter = (i: number, ch: string) => 55 + ((i * 37) % 7) * 11 + (ch === " " ? 60 : 0);

export async function perform(ctx: Ctx, a: Act) {
  const { ov, alive } = ctx;
  const win = ctx.win();
  if (!win) return;
  if ("go" in a) {
    await navigate(ctx, a.go);
    await sleep(200);
  } else if ("wait" in a) {
    await sleep(a.wait);
  } else if ("scroll" in a) {
    await scrollMain(ctx, a.scroll);
  } else if ("show" in a) {
    const el = await find(ctx, a.show);
    const main = mainOf(win);
    if (!el || !main || !alive()) return;
    const offset = el.getBoundingClientRect().top - main.getBoundingClientRect().top - a.y;
    await scrollMain(ctx, main.scrollTop + offset);
  } else if ("blur" in a) {
    ov.release();
    await sleep(250);
  } else if ("ensure" in a) {
    const el = await find(ctx, a.ensure);
    if (el && el.getAttribute("aria-checked") !== "true") el.click();
  } else if ("focus" in a) {
    const el = await find(ctx, a.focus);
    if (!el || !alive()) return;
    ov.hideTouch();
    ov.focusOn(el, a.note, a.pad ?? 8);
    await reveal(ctx, el);
    await sleep(300);
  } else if ("tap" in a) {
    const el = await find(ctx, a.tap);
    if (!el || !alive()) return;
    await tapEl(ctx, el, el, a.note);
    await sleep(300);
  } else if ("type" in a) {
    const el = await find(ctx, a.type);
    if (!(el instanceof win.HTMLInputElement) || !alive()) return;
    const box = (el.closest("form") as HTMLElement | null) ?? el;
    if (!(await tapEl(ctx, el, box, a.note))) return;
    el.focus({ preventScroll: true });
    await sleep(260);
    ov.hideTouch();
    const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "value")?.set;
    let value = "";
    let i = 0;
    for (const ch of a.text) {
      if (!alive()) return;
      value += ch;
      setter?.call(el, value);
      el.dispatchEvent(new win.Event("input", { bubbles: true }));
      await sleep(ov.reduced ? 10 : jitter(i++, ch));
    }
  } else if ("submit" in a) {
    const el = win.document.activeElement;
    if (el instanceof win.HTMLElement) el.blur();
    window.focus();
    await sleep(200);
  } else if ("close" in a) {
    const dlg = await find(ctx, { sel: '[role="dialog"]' });
    if (!dlg || !alive()) return;
    const btn = dlg.querySelector<HTMLElement>('button[aria-label="닫기"]');
    if (btn) {
      await tapEl(ctx, btn, btn);
      ov.focusOn(null);
      await sleep(350);
    }
    if (win.document.querySelector('[role="dialog"]')) escape(win);
    await sleep(200);
    ov.hideTouch();
  }
}
