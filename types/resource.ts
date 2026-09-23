export type ResourceCategory =
  | "housing"
  | "money"
  | "work"
  | "education"
  | "procedures"
  | "consultation"
  | "emergency";

export interface ResourceContact {
  org: string;
  phone: string | null;
  url: string | null;
}

export interface Resource {
  id: string;
  name: string;
  operator: string;
  category: ResourceCategory;
  region: string;
  summary: string;
  eligibility: string[];
  benefit: string;
  deadline: string;
  contact: ResourceContact;
  tags: string[];
  source_url: string;
}
