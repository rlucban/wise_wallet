export type ArticleTopic = "Budgeting" | "Savings" | "Debt";

export const LEARNING_CATEGORIES = ["All", "Budgeting", "Savings", "Debt"] as const;
export type LearningCategory = (typeof LEARNING_CATEGORIES)[number];

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  icon: string;
  topic: ArticleTopic;
  minutes: number;
}

export const LEARNING_RESOURCES: LearningResource[] = [
  {
    id: "budgeting_101",
    title: "Budgeting 101",
    description: "Learn the basics of managing your money effectively.",
    icon: "book-open-page-variant",
    topic: "Budgeting",
    minutes: 3,
  },
  {
    id: "understanding_debt",
    title: "Understanding Debt",
    description: "How to manage and pay off debt strategically.",
    icon: "credit-card-off-outline",
    topic: "Debt",
    minutes: 4,
  },
  {
    id: "saving_future",
    title: "Saving for the Future",
    description: "The importance of an emergency fund and long-term savings.",
    icon: "piggy-bank-outline",
    topic: "Savings",
    minutes: 3,
  },
];
