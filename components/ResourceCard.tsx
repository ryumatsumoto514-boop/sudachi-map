"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ExternalLink, ChevronDown, MapPin, Calendar } from "lucide-react";
import type { Resource } from "@/types/resource";
import { CATEGORY_META } from "@/lib/categories";
import { cn } from "@/lib/utils";

interface ResourceCardProps {
  resource: Resource;
  matchReasons?: string[];
  defaultOpen?: boolean;
}

export function ResourceCard({ resource, matchReasons, defaultOpen = false }: ResourceCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = CATEGORY_META[resource.category];
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-card transition-shadow hover:shadow-card-hover print:break-inside-avoid print:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            meta.bg,
            meta.color,
            meta.border
          )}
        >
          <Icon size={13} aria-hidden="true" />
          {meta.label}
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-500">
          <MapPin size={13} aria-hidden="true" />
          {resource.region}
        </div>
      </div>

      <h3 className="mt-3 text-[17px] font-bold leading-snug text-ink-900">{resource.name}</h3>
      <p className="mt-0.5 text-xs text-ink-500">{resource.operator}</p>
      <p className="mt-2.5 text-sm leading-[1.8] text-ink-700">{resource.summary}</p>

      {matchReasons && matchReasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {matchReasons.map((r) => (
            <li
              key={r}
              className="rounded-full bg-crimson-50 px-2.5 py-1 text-[11px] font-medium text-crimson-700"
            >
              {r}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
        <Calendar size={13} aria-hidden="true" />
        締切: {resource.deadline}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-cream-300 px-3 py-2 text-sm font-semibold text-crimson-600 transition-colors hover:bg-cream-100 print:hidden"
        aria-expanded={open}
      >
        詳しく見る
        <ChevronDown
          size={16}
          className={cn("transition-transform duration-300", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {(open || defaultOpen) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden print:!h-auto print:!opacity-100"
          >
            <div className="mt-4 space-y-3 border-t border-cream-300 pt-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-ink-500">対象となる人</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-[1.8] text-ink-700">
                  {resource.eligibility.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold text-ink-500">支給額・内容</p>
                <p className="mt-1 leading-[1.8] text-ink-700">{resource.benefit}</p>
              </div>

              <div className="rounded-xl bg-cream-200 p-3">
                <p className="text-xs font-semibold text-ink-500">連絡先</p>
                <p className="mt-1 font-medium text-ink-900">{resource.contact.org}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {resource.contact.phone && (
                    <a
                      href={`tel:${resource.contact.phone.replace(/-/g, "")}`}
                      className="flex items-center gap-1.5 rounded-full bg-crimson-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-crimson-600"
                    >
                      <Phone size={13} aria-hidden="true" />
                      {resource.contact.phone}
                    </a>
                  )}
                  {resource.contact.url && (
                    <a
                      href={resource.contact.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-cream-400 bg-cream-50 px-3 py-1.5 text-xs font-semibold text-ink-800 transition-colors hover:bg-cream-100"
                    >
                      <ExternalLink size={13} aria-hidden="true" />
                      サイトを見る
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {resource.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-cream-300 px-2 py-0.5 text-[11px] text-ink-500"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              <a
                href={resource.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[11px] text-ink-500 underline underline-offset-2 hover:text-crimson-600"
              >
                情報源を見る
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
