import Link from "next/link";
import Image from "next/image";
import economixLogo from "@/assets/economix-logo.png";
import { BarsDivider } from "@/components/FadingBars";

const SITE_LINKS = [
  { href: "/", label: "ホーム" },
  { href: "/wizard", label: "診断ウィザード" },
  { href: "/database", label: "さがす（データベース）" },
  { href: "/timeline", label: "巣立ちタイムライン" },
  { href: "/simulator", label: "生活費シミュレーター" },
  { href: "/scripts", label: "電話スクリプト" },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-cream-300 bg-cream-200/60 print:hidden">
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <BarsDivider className="mb-8 w-32" barCount={10} />

        <div className="grid gap-10 sm:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Image src={economixLogo} alt="Economix JP" width={28} height={28} className="rounded-md" />
              <span className="text-sm font-bold text-ink-900">巣立ちマップ</span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-[1.9] text-ink-700">
              巣立ちマップは、高校生が立ち上げた経済教育団体「Economix JP」が運営する、
              児童養護施設・里親家庭などを巣立つ人のための支援情報サイトです。
              ひとりで悩まず、頼れる場所につながるお手伝いをします。
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              サイトマップ
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {SITE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ink-700 hover:text-crimson-600 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-xs leading-relaxed text-ink-500">
          掲載情報は変更されることがあります。申込や利用の前に、必ず各制度の公式窓口・出典元で最新の内容をご確認ください。
          このサイトの情報だけを理由に不利益が生じても、Economix JPは責任を負いかねます。
        </p>

        <p className="mt-6 text-xs text-ink-500">
          © {new Date().getFullYear()} Economix JP — 巣立ちマップ
        </p>
      </div>
    </footer>
  );
}
