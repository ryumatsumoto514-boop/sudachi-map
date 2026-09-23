"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Phone, ExternalLink } from "lucide-react";
import timelineData from "@/data/timeline.json";
import resourcesData from "@/data/resources.json";
import type { TimelinePhase } from "@/types/timeline";
import type { Resource } from "@/types/resource";
import { cn } from "@/lib/utils";

const phases = timelineData as TimelinePhase[];
const resources = resourcesData as Resource[];

export function TimelineClient() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">巣立ちタイムライン</h1>
      <p className="mt-2 max-w-xl text-sm leading-[1.8] text-ink-700">
        巣立ちの6か月前から3か月後まで、時期ごとにやることと使える制度をまとめました。
        チェックは今だけ表示されるもので、保存はされません。
      </p>

      <div className="mt-10 flex flex-col">
        {phases.map((phase, i) => {
          const relatedResources = resources.filter((r) =>
            phase.relatedResourceIds.includes(r.id)
          );
          const isLast = i === phases.length - 1;

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative flex gap-4 sm:gap-6"
            >
              <div className="flex w-10 shrink-0 flex-col items-center sm:w-14">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white sm:h-10 sm:w-10",
                    phase.monthsOffset === 0
                      ? "bg-crimson-500"
                      : "bg-gradient-to-br from-crimson-300 to-crimson-500"
                  )}
                >
                  {phase.monthsOffset === 0 ? "★" : Math.abs(phase.monthsOffset)}
                </span>
                {!isLast && (
                  <div
                    className="mt-1 w-[3px] flex-1 rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #C6303E, #F3EDEA)",
                      minHeight: "2.5rem",
                    }}
                  />
                )}
              </div>

              <div className="flex-1 pb-10">
                <p className="text-xs font-bold uppercase tracking-wide text-crimson-600">
                  {phase.label}
                </p>
                <p className="mt-1.5 text-sm leading-[1.8] text-ink-700">{phase.description}</p>

                <ul className="mt-4 space-y-2">
                  {phase.checklist.map((item, idx) => {
                    const key = `${phase.id}-${idx}`;
                    const isChecked = Boolean(checked[key]);
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => toggle(key)}
                          className="flex w-full items-start gap-2.5 rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-3 text-left text-sm transition-colors hover:bg-cream-100"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              isChecked
                                ? "border-crimson-500 bg-crimson-500"
                                : "border-cream-400 bg-transparent"
                            )}
                          >
                            {isChecked && (
                              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-white">
                                <path d="M4.5 8.5 1.8 5.8l1-1L4.5 6.5l4.7-4.7 1 1z" />
                              </svg>
                            )}
                          </span>
                          <span className={cn(isChecked && "text-ink-500 line-through")}>
                            {item}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {relatedResources.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {relatedResources.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 rounded-full border border-cream-300 bg-cream-50 px-3 py-1.5 text-xs"
                      >
                        <span className="font-medium text-ink-800">{r.name}</span>
                        {r.contact.phone && (
                          <a
                            href={`tel:${r.contact.phone.replace(/-/g, "")}`}
                            className="flex items-center gap-1 text-crimson-600"
                          >
                            <Phone size={12} />
                          </a>
                        )}
                        <Link href={`/database?category=${r.category}`} className="text-ink-500">
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
