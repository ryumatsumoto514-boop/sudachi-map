import { Suspense } from "react";
import type { Metadata } from "next";
import { DatabaseClient } from "./DatabaseClient";

export const metadata: Metadata = {
  title: "さがす | 巣立ちマップ",
  description: "カテゴリ・地域で絞り込み、キーワード検索で支援制度をさがせます。",
};

export default function DatabasePage() {
  return (
    <Suspense fallback={null}>
      <DatabaseClient />
    </Suspense>
  );
}
