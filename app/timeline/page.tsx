import type { Metadata } from "next";
import { TimelineClient } from "./TimelineClient";

export const metadata: Metadata = {
  title: "巣立ちタイムライン | 巣立ちマップ",
  description: "巣立ちの6か月前から3か月後までの流れと、時期ごとのやることリストです。",
};

export default function TimelinePage() {
  return <TimelineClient />;
}
