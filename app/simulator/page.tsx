import type { Metadata } from "next";
import { SimulatorClient } from "./SimulatorClient";

export const metadata: Metadata = {
  title: "生活費シミュレーター | 巣立ちマップ",
  description: "地域と暮らし方を選ぶと、毎月の生活費の目安がわかる簡易シミュレーターです。",
};

export default function SimulatorPage() {
  return <SimulatorClient />;
}
