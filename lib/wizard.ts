import type { Resource, ResourceCategory } from "@/types/resource";
import { resourceCategories } from "@/lib/categories";
import { isNationwide } from "@/lib/prefectures";

export const SITUATION_OPTIONS = [
  { value: "high-school", label: "在学中の高校生" },
  { value: "leaving-soon", label: "施設を出る準備中" },
  { value: "independent", label: "すでに自立して生活中" },
  { value: "supporter", label: "支援者・職員として見ている" },
] as const;

export const STAGE_OPTIONS = [
  { value: "hs1", label: "高校1年生" },
  { value: "hs2", label: "高校2年生" },
  { value: "hs3", label: "高校3年生" },
  { value: "18-19", label: "18〜19歳（高校卒業後）" },
  { value: "20plus", label: "20歳以上" },
] as const;

export const PATH_OPTIONS = [
  { value: "university", label: "大学・短大" },
  { value: "vocational", label: "専門学校" },
  { value: "work", label: "就職" },
  { value: "undecided", label: "まだ決めていない" },
] as const;

export const CONCERN_OPTIONS = [
  { value: "housing", label: "住まい", category: "housing" as ResourceCategory },
  { value: "money", label: "お金・奨学金", category: "money" as ResourceCategory },
  { value: "work", label: "仕事", category: "work" as ResourceCategory },
  { value: "procedures", label: "手続き・書類", category: "procedures" as ResourceCategory },
  { value: "consultation", label: "相談したい", category: "consultation" as ResourceCategory },
  { value: "emergency", label: "今すぐ助けが要る", category: "emergency" as ResourceCategory },
] as const;

export type SituationValue = (typeof SITUATION_OPTIONS)[number]["value"];
export type StageValue = (typeof STAGE_OPTIONS)[number]["value"];
export type PathValue = (typeof PATH_OPTIONS)[number]["value"];
export type ConcernValue = (typeof CONCERN_OPTIONS)[number]["value"];

export interface WizardAnswers {
  situation: SituationValue | "";
  stage: StageValue | "";
  path: PathValue | "";
  region: string;
  concerns: ConcernValue[];
}

export const EMPTY_ANSWERS: WizardAnswers = {
  situation: "",
  stage: "",
  path: "",
  region: "",
  concerns: [],
};

export function answersToParams(answers: WizardAnswers): URLSearchParams {
  const params = new URLSearchParams();
  if (answers.situation) params.set("situation", answers.situation);
  if (answers.stage) params.set("stage", answers.stage);
  if (answers.path) params.set("path", answers.path);
  if (answers.region) params.set("region", answers.region);
  if (answers.concerns.length) params.set("concerns", answers.concerns.join(","));
  return params;
}

export function paramsToAnswers(
  searchParams: Record<string, string | string[] | undefined>
): WizardAnswers {
  const get = (key: string): string => {
    const v = searchParams[key];
    return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  };
  const concernsRaw = get("concerns");
  return {
    situation: get("situation") as WizardAnswers["situation"],
    stage: get("stage") as WizardAnswers["stage"],
    path: get("path") as WizardAnswers["path"],
    region: get("region"),
    concerns: concernsRaw
      ? (concernsRaw.split(",").filter(Boolean) as ConcernValue[])
      : [],
  };
}

interface ScoredResource {
  resource: Resource;
  score: number;
  reasons: string[];
}

export function scoreResources(
  resources: Resource[],
  answers: WizardAnswers
): ScoredResource[] {
  const concernCategories = new Set(
    answers.concerns
      .map((c) => CONCERN_OPTIONS.find((o) => o.value === c)?.category)
      .filter((c): c is ResourceCategory => Boolean(c))
  );

  const wantsEducation = answers.path === "university" || answers.path === "vocational";
  const wantsWork = answers.path === "work";
  const isLeavingOrIndependent =
    answers.situation === "leaving-soon" || answers.situation === "independent";

  const scored = resources.map((resource) => {
    let score = 0;
    const reasons: string[] = [];

    if (resourceCategories(resource).some((c) => concernCategories.has(c))) {
      score += 40;
      reasons.push("困っていることに合っています");
    }

    if (isNationwide(resource.region)) {
      score += 10;
    } else if (answers.region && resource.region === answers.region) {
      score += 25;
      reasons.push(`${answers.region}の制度です`);
    } else if (answers.region && resource.region !== answers.region) {
      score -= 15;
    }

    if (wantsEducation && resource.category === "education") {
      score += 15;
      reasons.push("希望する進路に関連しています");
    }
    if (wantsWork && resource.category === "work") {
      score += 15;
      reasons.push("希望する進路に関連しています");
    }

    if (isLeavingOrIndependent && resource.tags.includes("施設出身")) {
      score += 10;
    }

    if (answers.concerns.includes("emergency") && resource.category === "emergency") {
      score += 30;
    }

    return { resource, score, reasons };
  });

  return scored.sort((a, b) => b.score - a.score);
}
