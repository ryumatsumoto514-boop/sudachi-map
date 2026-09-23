"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import { Search, X } from "lucide-react";
import { ResourceCard } from "@/components/ResourceCard";
import { CATEGORY_META, resourceCategories } from "@/lib/categories";
import { PREFECTURES, isNationwide } from "@/lib/prefectures";
import { cn } from "@/lib/utils";
import resourcesData from "@/data/resources.json";
import type { Resource, ResourceCategory } from "@/types/resource";

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as ResourceCategory[];

type SortMode = "recommended" | "newest" | "name";

export function DatabaseClient() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") as ResourceCategory | null;

  const resources = resourcesData as Resource[];
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Set<ResourceCategory>>(
    new Set(initialCategory && ALL_CATEGORIES.includes(initialCategory) ? [initialCategory] : [])
  );
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState<SortMode>("recommended");

  const fuse = useMemo(
    () =>
      new Fuse(resources, {
        keys: ["name", "summary", "operator", "tags", "eligibility"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [resources]
  );

  function toggleCategory(c: ResourceCategory) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let list = query.trim() ? fuse.search(query.trim()).map((r) => r.item) : [...resources];

    if (categories.size > 0) {
      list = list.filter((r) => resourceCategories(r).some((c) => categories.has(c)));
    }
    if (region) {
      list = list.filter((r) => r.region === region || isNationwide(r.region));
    }

    if (sort === "newest") {
      list = [...list].reverse();
    } else if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ja"));
    }

    return list;
  }, [query, categories, region, sort, fuse, resources]);

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">支援制度をさがす</h1>
      <p className="mt-2 text-sm text-ink-700">
        キーワード検索や絞り込みで、必要な支援をすぐに見つけられます。
      </p>

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-cream-400 bg-cream-50 px-4 py-3">
        <Search size={18} className="shrink-0 text-ink-500" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="制度名・キーワードで検索"
          className="w-full bg-transparent text-[15px] text-ink-900 outline-none placeholder:text-ink-500"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="検索をクリア">
            <X size={16} className="text-ink-500" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategories(new Set())}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
            categories.size === 0
              ? "border-crimson-500 bg-crimson-500 text-white"
              : "border-cream-400 bg-cream-50 text-ink-700 hover:bg-cream-200"
          )}
        >
          すべて
        </button>
        {ALL_CATEGORIES.map((c) => {
          const meta = CATEGORY_META[c];
          const active = categories.has(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "border-crimson-500 bg-crimson-500 text-white"
                  : "border-cream-400 bg-cream-50 text-ink-700 hover:bg-cream-200"
              )}
            >
              <meta.icon size={13} aria-hidden="true" />
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded-lg border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm text-ink-800"
        >
          <option value="">すべての地域</option>
          <option value="全国">全国</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="rounded-lg border border-cream-400 bg-cream-50 px-3 py-2.5 text-sm text-ink-800"
        >
          <option value="recommended">おすすめ順</option>
          <option value="newest">新着順</option>
          <option value="name">名前順（あいうえお順）</option>
        </select>
      </div>

      <p className="mt-5 text-xs font-medium text-ink-500">
        全{resources.length}件中 {filtered.length}件を表示
      </p>

      {filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-cream-300 bg-cream-50 p-6 text-center text-sm text-ink-500">
          条件に合う制度が見つかりませんでした。検索キーワードや絞り込みを変えてみてください。
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}
    </div>
  );
}
