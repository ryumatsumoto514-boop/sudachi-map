export interface TimelinePhase {
  id: string;
  label: string;
  shortLabel: string;
  monthsOffset: number;
  description: string;
  checklist: string[];
  relatedResourceIds: string[];
}
