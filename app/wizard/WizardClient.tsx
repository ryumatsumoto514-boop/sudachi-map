"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { ProgressBars } from "@/components/FadingBars";
import { cn } from "@/lib/utils";
import {
  SITUATION_OPTIONS,
  STAGE_OPTIONS,
  PATH_OPTIONS,
  CONCERN_OPTIONS,
  EMPTY_ANSWERS,
  answersToParams,
  type WizardAnswers,
  type ConcernValue,
} from "@/lib/wizard";
import { PREFECTURES } from "@/lib/prefectures";

const TOTAL_STEPS = 5;

export function WizardClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>(EMPTY_ANSWERS);

  const isValid = (() => {
    switch (step) {
      case 0:
        return Boolean(answers.situation);
      case 1:
        return Boolean(answers.stage);
      case 2:
        return Boolean(answers.path);
      case 3:
        return true; // region is optional ("まだ決めていない" allowed)
      case 4:
        return answers.concerns.length > 0;
      default:
        return false;
    }
  })();

  function goNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    const params = answersToParams(answers);
    router.push(`/wizard/results?${params.toString()}`);
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function toggleConcern(v: ConcernValue) {
    setAnswers((a) => ({
      ...a,
      concerns: a.concerns.includes(v)
        ? a.concerns.filter((c) => c !== v)
        : [...a.concerns, v],
    }));
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col px-4 py-10 sm:px-6">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-500">
        <span>
          質問 {step + 1} / {TOTAL_STEPS}
        </span>
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-crimson-600 hover:underline"
          >
            <ArrowLeft size={14} />
            戻る
          </button>
        )}
      </div>
      <ProgressBars total={TOTAL_STEPS} current={step + 1} />

      <div className="mt-10 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === 0 && (
              <QuestionStep title="今の状況を教えてください">
                <OptionGrid>
                  {SITUATION_OPTIONS.map((o) => (
                    <OptionButton
                      key={o.value}
                      label={o.label}
                      selected={answers.situation === o.value}
                      onClick={() => setAnswers((a) => ({ ...a, situation: o.value }))}
                    />
                  ))}
                </OptionGrid>
              </QuestionStep>
            )}

            {step === 1 && (
              <QuestionStep title="今の学年・年齢に近いものは？" subtitle="正確な生年月日は不要です">
                <OptionGrid>
                  {STAGE_OPTIONS.map((o) => (
                    <OptionButton
                      key={o.value}
                      label={o.label}
                      selected={answers.stage === o.value}
                      onClick={() => setAnswers((a) => ({ ...a, stage: o.value }))}
                    />
                  ))}
                </OptionGrid>
              </QuestionStep>
            )}

            {step === 2 && (
              <QuestionStep title="希望する進路は？">
                <OptionGrid>
                  {PATH_OPTIONS.map((o) => (
                    <OptionButton
                      key={o.value}
                      label={o.label}
                      selected={answers.path === o.value}
                      onClick={() => setAnswers((a) => ({ ...a, path: o.value }))}
                    />
                  ))}
                </OptionGrid>
              </QuestionStep>
            )}

            {step === 3 && (
              <QuestionStep title="お住まいの地域は？" subtitle="都道府県ごとの制度を優先して表示します">
                <select
                  value={answers.region}
                  onChange={(e) => setAnswers((a) => ({ ...a, region: e.target.value }))}
                  className="w-full rounded-xl border border-cream-400 bg-cream-50 px-4 py-3.5 text-[15px] text-ink-900 focus:border-crimson-400"
                >
                  <option value="">まだ決めていない・分からない</option>
                  {PREFECTURES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </QuestionStep>
            )}

            {step === 4 && (
              <QuestionStep title="今いちばん困っていることは？" subtitle="いくつでも選べます">
                <OptionGrid>
                  {CONCERN_OPTIONS.map((o) => (
                    <OptionButton
                      key={o.value}
                      label={o.label}
                      selected={answers.concerns.includes(o.value)}
                      onClick={() => toggleConcern(o.value)}
                      multi
                    />
                  ))}
                </OptionGrid>
              </QuestionStep>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        disabled={!isValid}
        onClick={goNext}
        className={cn(
          "mt-8 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-[15px] font-bold text-white transition-colors",
          isValid ? "bg-crimson-500 hover:bg-crimson-600" : "cursor-not-allowed bg-ink-300"
        )}
      >
        {step === TOTAL_STEPS - 1 ? "結果を見る" : "次へ"}
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

function QuestionStep({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-xl font-bold leading-snug text-ink-900 sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function OptionGrid({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2.5">{children}</div>;
}

function OptionButton({
  label,
  selected,
  onClick,
  multi = false,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[56px] w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[15px] font-medium transition-colors",
        selected
          ? "border-crimson-500 bg-crimson-50 text-crimson-700"
          : "border-cream-400 bg-cream-50 text-ink-800 hover:border-crimson-300"
      )}
    >
      {label}
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border",
          multi ? "rounded-md" : "rounded-full",
          selected ? "border-crimson-500 bg-crimson-500" : "border-cream-400 bg-transparent"
        )}
      >
        {selected && <Check size={13} className="text-white" />}
      </span>
    </button>
  );
}
