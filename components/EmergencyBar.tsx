"use client";

import { Shield, Flame, Stethoscope, PhoneCall, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EmergencyContact {
  label: string;
  number: string;
  href: string;
  icon: LucideIcon;
}

const CONTACTS: EmergencyContact[] = [
  { label: "警察", number: "110", href: "tel:110", icon: Shield },
  { label: "消防・救急", number: "119", href: "tel:119", icon: Flame },
  { label: "救急相談", number: "#7119", href: "tel:%237119", icon: Stethoscope },
  {
    label: "よりそいホットライン",
    number: "0120-279-338",
    href: "tel:0120279338",
    icon: PhoneCall,
  },
  { label: "児童相談所", number: "189", href: "tel:189", icon: Users },
];

export function EmergencyBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-crimson-800 bg-ink-900 print:hidden">
      <div className="mx-auto flex max-w-content items-stretch gap-3 overflow-x-auto px-3 py-2 sm:px-6">
        <span className="flex shrink-0 items-center whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-crimson-300">
          今すぐ助けが必要
        </span>
        <div className="flex shrink-0 gap-2">
          {CONTACTS.map((c) => (
            <a
              key={c.number}
              href={c.href}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-cream-100 transition-colors hover:bg-crimson-600 hover:border-crimson-600 active:bg-crimson-700"
            >
              <c.icon size={14} className="shrink-0 text-crimson-300" aria-hidden="true" />
              <span className="whitespace-nowrap">{c.label}</span>
              <span className="whitespace-nowrap font-bold">{c.number}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
