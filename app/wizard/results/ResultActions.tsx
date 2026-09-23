"use client";

import { useState } from "react";
import { Printer, Link2, Check } from "lucide-react";

export function ResultActions() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center gap-1.5 rounded-full border border-cream-400 bg-cream-50 px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:bg-cream-200"
      >
        {copied ? <Check size={15} className="text-crimson-600" /> : <Link2 size={15} />}
        {copied ? "コピーしました" : "この結果を保存・共有"}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-full border border-cream-400 bg-cream-50 px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:bg-cream-200"
      >
        <Printer size={15} />
        印刷用に表示
      </button>
    </div>
  );
}
