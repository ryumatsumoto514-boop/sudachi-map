import type { Metadata } from "next";
import { WizardClient } from "./WizardClient";

export const metadata: Metadata = {
  title: "診断ウィザード | 巣立ちマップ",
  description: "5つの質問に答えるだけで、あなたに合った支援制度をランキング形式で紹介します。",
};

export default function WizardPage() {
  return <WizardClient />;
}
