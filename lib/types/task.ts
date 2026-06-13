export type Urgency = "today" | "this-week" | "this-month" | "someday";

export interface Task {
  id: string;
  title: string;
  description: string;
  urgency: Urgency;
  key: boolean;
  priorityScore: number;
  tags: string[];
  dueDate: string;
  entityId: string;
  owner: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const URGENCY_LABELS: Record<Urgency, string> = {
  "today":      "TODAY",
  "this-week":  "THIS WEEK",
  "this-month": "THIS MONTH",
  "someday":    "SOMEDAY",
};

export const URGENCY_ORDER: Urgency[] = ["today", "this-week", "this-month", "someday"];
