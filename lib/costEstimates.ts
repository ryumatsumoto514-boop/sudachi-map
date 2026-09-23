export const SIMULATOR_REGIONS = [
  { value: "tokyo23", label: "東京23区" },
  { value: "designated-city", label: "政令指定都市" },
  { value: "other", label: "その他の地域" },
] as const;

export const SIMULATOR_LIVING = [
  { value: "alone", label: "一人暮らし" },
  { value: "shared", label: "シェアハウス" },
  { value: "dorm", label: "社員寮・住み込み" },
] as const;

export type SimulatorRegion = (typeof SIMULATOR_REGIONS)[number]["value"];
export type SimulatorLiving = (typeof SIMULATOR_LIVING)[number]["value"];

export interface CostBreakdown {
  rent: number;
  utilities: number;
  food: number;
  communication: number;
  insuranceTax: number;
  savings: number;
}

export const COST_TABLE: Record<SimulatorRegion, Record<SimulatorLiving, CostBreakdown>> = {
  tokyo23: {
    alone: { rent: 70000, utilities: 10000, food: 35000, communication: 6000, insuranceTax: 15000, savings: 15000 },
    shared: { rent: 55000, utilities: 3000, food: 30000, communication: 5000, insuranceTax: 15000, savings: 15000 },
    dorm: { rent: 20000, utilities: 5000, food: 30000, communication: 5000, insuranceTax: 15000, savings: 20000 },
  },
  "designated-city": {
    alone: { rent: 50000, utilities: 9000, food: 32000, communication: 6000, insuranceTax: 13000, savings: 15000 },
    shared: { rent: 40000, utilities: 3000, food: 28000, communication: 5000, insuranceTax: 13000, savings: 15000 },
    dorm: { rent: 15000, utilities: 5000, food: 28000, communication: 5000, insuranceTax: 13000, savings: 20000 },
  },
  other: {
    alone: { rent: 40000, utilities: 8000, food: 30000, communication: 6000, insuranceTax: 12000, savings: 15000 },
    shared: { rent: 32000, utilities: 3000, food: 26000, communication: 5000, insuranceTax: 12000, savings: 15000 },
    dorm: { rent: 10000, utilities: 5000, food: 26000, communication: 5000, insuranceTax: 12000, savings: 20000 },
  },
};

export const COST_LABELS: Record<keyof CostBreakdown, string> = {
  rent: "家賃目安",
  utilities: "光熱費",
  food: "食費",
  communication: "通信費",
  insuranceTax: "保険・税",
  savings: "貯金目安",
};

export function totalOf(b: CostBreakdown): number {
  return b.rent + b.utilities + b.food + b.communication + b.insuranceTax + b.savings;
}
