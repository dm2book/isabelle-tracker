"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { PageHeader } from "@/components/ui/bits";
import { CreateRoomSheet } from "@/components/room/CreateRoomSheet";
import { Companion } from "@/components/companion/Companion";
import { play } from "@/lib/sound";
import type { Room } from "@/lib/types";

// Slots along the winding path (percent of the map box)
const SLOTS = [
  [18, 30], [46, 20], [76, 30], [82, 58], [56, 52], [26, 60], [14, 84], [46, 82], [74, 84], [90, 12],
];
const ROOF = ["#FF8DC0", "#C9B6FF", "#8CCBFF", "#FFB38A", "#8FE0BC", "#FFD45E"];

function House({ room, i, onEnter }: { room: Room; i: number; onEnter: () => void }) {
  const [x, y] = SLOTS[i % SLOTS.length];
  const roof = ROOF[i % ROOF.length];
  const outdoor = room.outdoor;
  return (
    <motion.button
      onClick={onEnter}
      className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ scale: 0, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", delay: 0.05 * i }}
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.95 }}
      aria-label={room.name}
    >
      <svg viewBox="0 0 100 90" className="w-[clamp(64px,15vw,104px)] drop-shadow-[0_6px_0_rgba(90,33,73,0.15)]" aria-hidden>
        {outdoor ? (
          <g stroke="#5A2149" strokeWidth={3} strokeLinejoin="round">
            <path d="M10 80 Q50 50 90 80Z" fill="#B8EBC0" />
            <path d="M30 70 C10 66 16 30 36 40 C40 14 70 16 66 40 C88 32 92 66 70 70Z" fill="#FFC2D9" />
            <rect x="46" y="60" width="8" height="20" fill="#C89A72" />
            <circle cx="22" cy="78" r="5" fill="#FFE08A" /><circle cx="80" cy="76" r="5" fill="#FF8FB5" />
          </g>
        ) : (
          <g stroke="#5A2149" strokeWidth={3} strokeLinejoin="round">
            <rect x="18" y="40" width="64" height="44" rx="6" fill="#FFF8F0" />
            <path d="M8 44 L50 8 L92 44Z" fill={roof} />
            <path d="M42 84 L42 62 Q50 54 58 62 L58 84Z" fill={roof} />
            <circle cx="30" cy="56" r="7" fill="#BFE3FF" /><circle cx="70" cy="56" r="7" fill="#BFE3FF" />
            <path d="M50 22 C47 17 41 19 43 24 C44 27 50 30 50 31 C50 30 56 27 57 24 C59 19 53 17 50 22Z" fill="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
      <span className="mt-1 max-w-[8rem] truncate rounded-full bg-surface px-2.5 py-1 text-xs font-bold shadow-sm">
        {room.emoji} {room.name}
      </span>
    </motion.button>
  );
}

export default function WorldPage() {
  const { t } = useT();
  const rooms = useWorld((s) => s.rooms);
  const look = useWorld((s) => s.prefs.companion);
  const game = useWorld((s) => s.game);
  const track = useWorld((s) => s.track);
  const unlockSecret = useWorld((s) => s.unlockSecretRoom);
  const toast = useWorld((s) => s.toast);
  const router = useRouter();
  const [entering, setEntering] = useState<Room | null>(null);
  const [create, setCreate] = useState(false);
  const [starTaps, setStarTaps] = useState(0);
  const secretFound = rooms.some((r) => r.secret);
  const visible = rooms.filter((r) => !r.secret);
  const gardenGrowth = Math.min(10, game.stats.visit_garden ?? 0);
  const stars = Object.values(game.collectibles).reduce((a, b) => a + b, 0);

  useEffect(() => {
    track("visit_map");
  }, [track]);

  const enter = (room: Room) => {
    setEntering(room);
    play("chime");
    setTimeout(() => router.push(`/rooms/${room.id}?view=1`), 650);
  };

  const tapStar = () => {
    const n = starTaps + 1;
    setStarTaps(n);
    play("sparkle");
    if (n >= 3 && !secretFound) {
      unlockSecret();
      toast({ text: t("world.secretFound"), emoji: "🌌", tone: "reward" });
    }
  };

  return (
    <div>
      <PageHeader title={t("world.title")} subtitle={t("world.subtitle")} emoji="🌍" action={<button className="btn btn-primary btn-sm" onClick={() => setCreate(true)}><Plus size={18} /> {t("world.newRoom")}</button>} />
      <div className="card overflow-hidden p-0">
        <div className="relative aspect-[4/5] w-full sm:aspect-[16/10]" style={{ background: "linear-gradient(180deg, #CDEBFF 0%, #E9F7EE 30%, #D9F5E1 100%)" }}>
          {/* path & scenery */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            <path d="M18 30 C30 10 40 30 46 20 S70 22 76 30 S90 50 82 58 S62 46 56 52 S34 50 26 60 S8 76 14 84 S36 90 46 82 S66 78 74 84" fill="none" stroke="#FFF4D6" strokeWidth={5} strokeLinecap="round" />
            <path d="M18 30 C30 10 40 30 46 20 S70 22 76 30 S90 50 82 58 S62 46 56 52 S34 50 26 60 S8 76 14 84 S36 90 46 82 S66 78 74 84" fill="none" stroke="#F3D2B3" strokeWidth={1.2} strokeDasharray="2 2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={0.9} />
            <ellipse cx="88" cy="40" rx="9" ry="5" fill="#A8DAFF" />
            <ellipse cx="8" cy="46" rx="7" ry="4" fill="#A8DAFF" />
          </svg>
          {/* growing garden flowers */}
          {Array.from({ length: gardenGrowth + 2 }).map((_, i) => (
            <span key={i} className="absolute text-lg" style={{ left: `${4 + ((i * 23) % 90)}%`, top: `${66 + ((i * 13) % 30)}%` }} aria-hidden>
              {["🌷", "🌸", "🌼", "🌻", "🌺"][i % 5]}
            </span>
          ))}
          {/* hidden star → secret room */}
          {!secretFound && (
            <button onClick={tapStar} className="animate-twinkle anim-loop absolute top-[6%] left-[60%] p-2 text-sm" aria-label="✨">
              ✨
            </button>
          )}
          {visible.map((r, i) => <House key={r.id} room={r} i={i} onEnter={() => enter(r)} />)}
          {secretFound && (
            <button onClick={() => enter(rooms.find((r) => r.secret)!)} className="absolute top-[4%] left-[58%] flex flex-col items-center" aria-label={t("rooms.kinds.starry")}>
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#2C2257] text-2xl shadow-lg">🌌</span>
              <span className="mt-1 rounded-full bg-surface px-2 py-0.5 text-xs font-bold">{t("rooms.kinds.starry")}</span>
            </button>
          )}
          <motion.div className="absolute bottom-[2%] left-[40%] w-20" animate={{ x: [0, 40, 0, -30, 0] }} transition={{ duration: 16, repeat: Infinity }}>
            <Companion look={look} size={80} still />
          </motion.div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="relative z-[1] text-sm font-bold text-muted">⭐ {t("world.stars")}</p><p className="title relative z-[1] text-2xl">{stars}</p></div>
        <div className="card p-4"><p className="relative z-[1] text-sm font-bold text-muted">🌷 {t("world.gardenGrow")}</p><p className="title relative z-[1] text-2xl">{gardenGrowth}/10</p></div>
      </div>
      {!secretFound && <p className="mt-4 text-center text-sm text-muted">🔭 {t("world.secretHint")}</p>}
      <p className="mt-4 text-center"><Link href="/rooms" className="btn btn-ghost btn-sm">{t("nav.rooms")}</Link></p>
      <AnimatePresence>
        {entering && (
          <motion.div className="fixed inset-0 z-[85] grid place-items-center bg-primary" initial={{ clipPath: "circle(0% at 50% 50%)" }} animate={{ clipPath: "circle(150% at 50% 50%)" }} transition={{ duration: 0.6, ease: "easeIn" }}>
            <span className="logo-type text-3xl">{entering.emoji} {entering.name}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <CreateRoomSheet open={create} onClose={() => setCreate(false)} />
    </div>
  );
}
