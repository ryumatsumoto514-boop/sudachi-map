import type { Metadata } from "next";
import { ScriptsClient } from "./ScriptsClient";

export const metadata: Metadata = {
  title: "言うことスクリプト | 巣立ちマップ",
  description:
    "電話やチャットが苦手でも使える、相談窓口への話し方テンプレート集。コピーしてそのまま使えます。",
};

export default function ScriptsPage() {
  return <ScriptsClient />;
}
