import type { DayPeriod } from "../time";
import type { Mood } from "@/components/companion/Companion";
import type { CompanionAnim } from "@/store/world";

export function moodFor(period: DayPeriod, cue: CompanionAnim | null): Mood {
  if (cue === "celebrate" || cue === "dance") return "celebrating";
  if (cue === "hug" || cue === "kiss") return "loving";
  if (cue === "eat") return "hungry";
  if (cue === "drink" || cue === "present" || cue === "play") return "excited";
  if (cue === "sleep") return "sleepy";
  if (period === "night") return "sleepy";
  if (period === "evening") return "relaxed";
  return "happy";
}
