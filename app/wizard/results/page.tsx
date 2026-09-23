import Link from "next/link";
import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import { ResourceCard } from "@/components/ResourceCard";
import { ResultActions } from "./ResultActions";
import resourcesData from "@/data/resources.json";
import type { Resource } from "@/types/resource";
import {
  paramsToAnswers,
  scoreResources,
  SITUATION_OPTIONS,
  STAGE_OPTIONS,
  PATH_OPTIONS,
  CONCERN_OPTIONS,
} from "@/lib/wizard";

export const metadata: Metadata = {
  title: "診断結果 | 巣立ちマップ",
};

function labelOf<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string
): string | null {
  return options.find((o) => o.value === value)?.label ?? null;
}

export default function ResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const answers = paramsToAnswers(searchParams);
  const resources = resourcesData as Resource[];
  const scored = scoreResources(resources, answers);
  const hasStrongMatch = scored.some((s) => s.score >= 30);

  const summaryChips = [
    labelOf(SITUATION_OPTIONS, answers.situation),
    labelOf(STAGE_OPTIONS, answers.stage),
    labelOf(PATH_OPTIONS, answers.path),
    answers.region || null,
    ...answers.concerns.map((c) => labelOf(CONCERN_OPTIONS, c)),
  ].filter((v): v is string => Boolean(v));

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <div className="print:hidden">
        <Link
          href="/wizard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-crimson-600"
        >
          <RotateCcw size={14} />
          もう一度答えを選び直す
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-ink-900 sm:text-3xl">診断結果</h1>
      <p className="mt-2 text-sm text-ink-700">
        あなたの回答に合わせて、支援制度をおすすめ順に並べています。
      </p>

      {summaryChips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {summaryChips.map((c, i) => (
            <span
              key={i}
              className="rounded-full bg-cream-200 px-3 py-1 text-xs font-medium text-ink-700"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ResultActions />
      </div>

      {!hasStrongMatch && (
        <p className="mt-6 rounded-xl border border-cream-300 bg-cream-50 p-4 text-sm leading-relaxed text-ink-700">
          ぴったり一致する制度は見つかりませんでしたが、参考になりそうな情報を表示しています。
          「さがす」ページでは、もっと条件を変えて探すこともできます。
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {scored.map(({ resource, reasons }) => (
          <ResourceCard key={resource.id} resource={resource} matchReasons={reasons} />
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-cream-300 bg-cream-50 p-4 text-xs leading-relaxed text-ink-500 print:hidden">
        <Link href="/database" className="font-semibold text-crimson-600 hover:underline">
          すべての支援制度を見る →
        </Link>
      </div>
    </div>
  );
}
