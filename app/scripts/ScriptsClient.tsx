"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Info } from "lucide-react";
import { CATEGORY_META } from "@/lib/categories";
import { SCRIPT_GROUPS } from "@/lib/scripts";
import { cn } from "@/lib/utils";

export function ScriptsClient() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">言うことスクリプト</h1>
      <p className="mt-2 max-w-xl text-sm leading-[1.8] text-ink-700">
        電話や対面で話すのが苦手でも大丈夫です。そのまま読み上げたり、コピーしてチャットや
        LINEに貼り付けて使ってください。「◯◯」の部分は自分の状況に合わせて置きかえてください。
      </p>

      <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-cream-200 p-4 text-xs leading-relaxed text-ink-700">
        <Info size={16} className="mt-0.5 shrink-0 text-ink-500" aria-hidden="true" />
        <p>
          全部きれいに言えなくても問題ありません。困っていることと名前だけ伝われば、
          あとは窓口の人が質問しながら聞いてくれます。緊急のときはページ下部の連絡先も使えます。
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-10">
        {SCRIPT_GROUPS.map((group) => {
          const meta = CATEGORY_META[group.category];
          const Icon = meta.icon;
          return (
            <section key={group.category}>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    meta.bg,
                    meta.color
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
                <h2 className="text-lg font-bold text-ink-900">{meta.label}</h2>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-[1.8] text-ink-700">{group.note}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {group.templates.map((t) => {
                  const copied = copiedId === t.id;
                  return (
                    <div
                      key={t.id}
                      className="flex flex-col rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-card"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                            meta.bg,
                            meta.color,
                            meta.border
                          )}
                        >
                          {t.medium}用
                        </span>
                        <span className="text-xs font-medium text-ink-500">{t.situation}</span>
                      </div>
                      <p className="mt-3 flex-1 text-sm leading-[1.8] text-ink-800">{t.text}</p>
                      <button
                        type="button"
                        onClick={() => handleCopy(t.id, t.text)}
                        className="mt-4 flex items-center justify-center gap-1.5 self-start rounded-full border border-cream-400 bg-cream-100 px-4 py-2 text-xs font-semibold text-ink-800 transition-colors hover:bg-cream-200"
                      >
                        {copied ? (
                          <Check size={14} className="text-crimson-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copied ? "コピーしました" : "文章をコピー"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 rounded-xl border border-cream-300 bg-cream-50 p-4 text-xs leading-relaxed text-ink-500">
        窓口の連絡先がまだ分からない場合は、
        <Link href="/database" className="font-semibold text-crimson-600 hover:underline">
          さがす（データベース）
        </Link>
        で探せます。
      </div>
    </div>
  );
}
