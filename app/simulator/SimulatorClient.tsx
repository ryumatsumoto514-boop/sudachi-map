"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SIMULATOR_REGIONS,
  SIMULATOR_LIVING,
  COST_TABLE,
  COST_LABELS,
  totalOf,
  type SimulatorRegion,
  type SimulatorLiving,
} from "@/lib/costEstimates";

export function SimulatorClient() {
  const [region, setRegion] = useState<SimulatorRegion>("tokyo23");
  const [living, setLiving] = useState<SimulatorLiving>("alone");

  const breakdown = COST_TABLE[region][living];
  const total = totalOf(breakdown);
  const maxValue = Math.max(...Object.values(breakdown));

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">生活費シミュレーター</h1>
      <p className="mt-2 max-w-xl text-sm leading-[1.8] text-ink-700">
        地域と暮らし方を選ぶと、毎月の生活費の目安がわかります。まずはイメージをつかむための参考ツールです。
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-500">地域</p>
          <div className="flex flex-col gap-2">
            {SIMULATOR_REGIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRegion(r.value)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                  region === r.value
                    ? "border-crimson-500 bg-crimson-50 text-crimson-700"
                    : "border-cream-400 bg-cream-50 text-ink-800 hover:border-crimson-300"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-ink-500">暮らし方</p>
          <div className="flex flex-col gap-2">
            {SIMULATOR_LIVING.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLiving(l.value)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                  living === l.value
                    ? "border-crimson-500 bg-crimson-50 text-crimson-700"
                    : "border-cream-400 bg-cream-50 text-ink-800 hover:border-crimson-300"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        key={`${region}-${living}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-8 rounded-2xl border border-cream-300 bg-cream-50 p-5 sm:p-7"
      >
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink-700">1か月の目安合計</p>
          <p className="text-3xl font-black text-crimson-600">
            {total.toLocaleString()}
            <span className="ml-1 text-base font-bold text-ink-500">円</span>
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {(Object.keys(breakdown) as Array<keyof typeof breakdown>).map((key) => (
            <div key={key}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{COST_LABELS[key]}</span>
                <span className="font-semibold text-ink-900">
                  {breakdown[key].toLocaleString()}円
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-cream-200">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(breakdown[key] / maxValue) * 100}%`,
                    background: "linear-gradient(90deg, #EEA29B, #C6303E)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-cream-200 p-4 text-xs leading-relaxed text-ink-700">
        <Info size={16} className="mt-0.5 shrink-0 text-ink-500" aria-hidden="true" />
        <p>
          これはあくまで参考の目安です。実際の金額は物件・地域・生活スタイルによって大きく異なります。
          正確な金額は、契約前に不動産会社や勤務先、各制度の窓口に必ずご確認ください。
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl bg-ink-900 px-5 py-5 sm:px-7">
        <div>
          <p className="text-sm font-bold text-white">お金が足りなそうなときは</p>
          <p className="mt-1 text-xs text-white/70">使える支援制度を探してみましょう</p>
        </div>
        <Link
          href="/database?category=money"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-crimson-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-crimson-400"
        >
          さがす
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
