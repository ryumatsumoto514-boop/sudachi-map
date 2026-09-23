import {
  Home,
  Coins,
  Briefcase,
  GraduationCap,
  FileText,
  MessageCircle,
  Siren,
  type LucideIcon,
} from "lucide-react";
import type { Resource, ResourceCategory } from "@/types/resource";

interface CategoryMeta {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

export const CATEGORY_META: Record<ResourceCategory, CategoryMeta> = {
  housing: {
    label: "住まい",
    shortLabel: "住まい",
    icon: Home,
    color: "text-amber-800",
    bg: "bg-amber-100",
    border: "border-amber-200",
  },
  money: {
    label: "お金",
    shortLabel: "お金",
    icon: Coins,
    color: "text-emerald-800",
    bg: "bg-emerald-100",
    border: "border-emerald-200",
  },
  work: {
    label: "仕事",
    shortLabel: "仕事",
    icon: Briefcase,
    color: "text-sky-800",
    bg: "bg-sky-100",
    border: "border-sky-200",
  },
  education: {
    label: "進学・奨学金",
    shortLabel: "進学",
    icon: GraduationCap,
    color: "text-violet-800",
    bg: "bg-violet-100",
    border: "border-violet-200",
  },
  procedures: {
    label: "手続き・書類",
    shortLabel: "手続き",
    icon: FileText,
    color: "text-slate-800",
    bg: "bg-slate-200",
    border: "border-slate-300",
  },
  consultation: {
    label: "相談",
    shortLabel: "相談",
    icon: MessageCircle,
    color: "text-teal-800",
    bg: "bg-teal-100",
    border: "border-teal-200",
  },
  emergency: {
    label: "緊急",
    shortLabel: "緊急",
    icon: Siren,
    color: "text-crimson-700",
    bg: "bg-crimson-100",
    border: "border-crimson-200",
  },
};

// The current dataset has no entries filed under the "consultation" category
// itself — general consultation windows (法テラス, よりそいホットライン etc.)
// are instead filed under their primary category (procedures/work/emergency)
// with a "相談" tag. Treat those as consultation matches too, so the
// "相談したい" entry points don't come back empty.
const CONSULTATION_TAG_HINTS = ["相談"];

export function resourceCategories(resource: Resource): ResourceCategory[] {
  const categories: ResourceCategory[] = [resource.category];
  if (
    resource.category !== "consultation" &&
    resource.tags.some((tag) => CONSULTATION_TAG_HINTS.some((hint) => tag.includes(hint)))
  ) {
    categories.push("consultation");
  }
  return categories;
}
