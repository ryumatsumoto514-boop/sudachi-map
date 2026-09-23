import Link from "next/link";
import { ArrowRight, Clock, Calculator, MessageSquareText, Search } from "lucide-react";
import { BarsDivider, ProgressBars } from "@/components/FadingBars";
import { CATEGORY_META } from "@/lib/categories";
import type { ResourceCategory } from "@/types/resource";

const SITUATION_BUTTONS: { label: string; category: ResourceCategory }[] = [
  { label: "住む場所がない", category: "housing" },
  { label: "お金が足りない", category: "money" },
  { label: "仕事を探したい", category: "work" },
  { label: "進学したい", category: "education" },
  { label: "手続き・契約のこと", category: "procedures" },
  { label: "誰かに相談したい", category: "consultation" },
];

const QUICK_LINKS = [
  {
    href: "/timeline",
    label: "巣立ちタイムライン",
    desc: "6か月前から3か月後までの流れとやることリスト",
    icon: Clock,
  },
  {
    href: "/simulator",
    label: "生活費シミュレーター",
    desc: "一人暮らしなどの生活費の目安を計算",
    icon: Calculator,
  },
  {
    href: "/scripts",
    label: "電話スクリプト",
    desc: "電話が苦手でも話しやすくなるテンプレート",
    icon: MessageSquareText,
  },
  {
    href: "/database",
    label: "さがす（データベース）",
    desc: "すべての支援制度を検索・絞り込み",
    icon: Search,
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-content px-4 pb-14 pt-14 sm:px-6 sm:pt-20">
        <BarsDivider className="mb-8 w-28" />
        <h1 className="max-w-2xl text-3xl font-black leading-[1.3] tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.25]">
          ひとりで
          <br className="sm:hidden" />
          抱えなくていい。
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-[1.9] text-ink-700 sm:text-base">
          住まい、お金、仕事、進学、手続き——施設や里親家庭を巣立つときに必要な情報を、
          あなたの状況に合わせてまとめて紹介します。ログイン不要、すべて無料で使えます。
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/wizard"
            className="group flex items-center justify-center gap-2 rounded-full bg-crimson-500 px-6 py-3.5 text-[15px] font-bold text-white shadow-card transition-colors hover:bg-crimson-600"
          >
            3分でわかる診断をはじめる
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="#situations"
            className="flex items-center justify-center rounded-full border border-cream-400 bg-cream-50 px-6 py-3.5 text-[15px] font-semibold text-ink-800 transition-colors hover:bg-cream-200"
          >
            気になることから探す
          </Link>
        </div>
      </section>

      {/* Situation buttons */}
      <section id="situations" className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <h2 className="text-lg font-bold text-ink-900 sm:text-xl">
          今、何に困っていますか？
        </h2>
        <p className="mt-1.5 text-sm text-ink-500">
          タップすると、関連する支援をすぐに見られます。
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SITUATION_BUTTONS.map((btn) => {
            const meta = CATEGORY_META[btn.category];
            const Icon = meta.icon;
            return (
              <Link
                key={btn.category}
                href={`/database?category=${btn.category}`}
                className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold leading-snug text-ink-900">
                  {btn.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Wizard CTA */}
      <section className="mx-auto max-w-content px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-ink-900 px-6 py-9 sm:px-10 sm:py-12">
          <p className="text-xs font-bold uppercase tracking-wide text-crimson-300">
            マッチング診断
          </p>
          <h2 className="mt-2 max-w-md text-2xl font-bold leading-snug text-white sm:text-3xl">
            5つの質問で、あなたに合った支援を見つけます
          </h2>
          <p className="mt-3 max-w-md text-sm leading-[1.8] text-white/70">
            状況・学年・希望する進路・地域・困っていることを教えてください。
            ランキング形式で支援制度を紹介し、結果はURLで保存・共有できます。
          </p>
          <div className="mt-6 max-w-xs">
            <ProgressBars total={5} current={3} />
          </div>
          <Link
            href="/wizard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-crimson-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-crimson-400"
          >
            診断をはじめる
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Quick links */}
      <section className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <h2 className="text-lg font-bold text-ink-900 sm:text-xl">こんなこともできます</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex flex-col gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-crimson-100 text-crimson-600">
                <q.icon size={18} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink-900">{q.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-500">{q.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* About Economix JP */}
      <section className="mx-auto max-w-content px-4 py-14 sm:px-6">
        <div className="rounded-3xl border border-cream-300 bg-cream-50 p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-wide text-crimson-600">
            Economix JP について
          </p>
          <h2 className="mt-2 text-xl font-bold text-ink-900 sm:text-2xl">
            高校生がはじめた、経済教育の先にある挑戦
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-[1.9] text-ink-700">
            Economix JPは、都内6校の高校生およそ20名で運営する学生団体です。
            2025年12月の設立以来、同世代に向けた金融教育活動に取り組む中で、
            「本当に情報を必要としているのは、児童養護施設を巣立つ子どもたちだ」
            という気づきを得ました。
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-[1.9] text-ink-700">
            現在は複数のNPO法人と共同で自立支援ガイドを制作し、その内容を土台にした
            Webプラットフォームとして巣立ちマップを開発しています。
            私たちは「高校生がつくったこと」自体に価値があるとは考えていません。
            専門家の知見を、同じ世代の視点で分かりやすく翻訳して届けること——
            それが私たちの役割だと考えています。
          </p>
        </div>
      </section>
    </div>
  );
}
