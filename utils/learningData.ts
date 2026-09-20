export type ArticleTopic = "Budgeting" | "Savings" | "Debt";
export type AudienceType = "Students" | "Workers";

export const LEARNING_CATEGORIES = ["All", "Budgeting", "Savings", "Debt"] as const;
export type LearningCategory = (typeof LEARNING_CATEGORIES)[number];

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  icon: string;
  topic: ArticleTopic;
  minutes: number;
  audience: AudienceType;
}

export const LEARNING_RESOURCES: LearningResource[] = [
  {
    id: "budgeting_101",
    title: "Budgeting 101",
    description: "Learn the basics of managing your money effectively.",
    icon: "book-open-page-variant",
    topic: "Budgeting",
    minutes: 3,
    audience: "Students",
  },
  {
    id: "understanding_debt",
    title: "Understanding Debt",
    description: "How to manage and pay off debt strategically.",
    icon: "credit-card-off-outline",
    topic: "Debt",
    minutes: 4,
    audience: "Workers",
  },
  {
    id: "saving_future",
    title: "Saving for the Future",
    description: "The importance of an emergency fund and long-term savings.",
    icon: "piggy-bank-outline",
    topic: "Savings",
    minutes: 3,
    audience: "Students",
  },
  {
    id: "understanding_interest_rates",
    title: "Understanding Interest Rates & Loans",
    description: "Explains how interest rates work, fixed vs. variable rates, and tips for managing loan repayments.",
    icon: "percent-outline",
    topic: "Debt",
    minutes: 4,
    audience: "Workers",
  },
  {
    id: "emergency_fund_essentials",
    title: "Emergency Fund Essentials",
    description: "Guidelines on how much to save for emergency funds and where to keep them safely.",
    icon: "shield-check-outline",
    topic: "Savings",
    minutes: 3,
    audience: "Students",
  },
  {
    id: "smart_expense_tracking",
    title: "Smart Expense Tracking & Categorization",
    description: "Practical techniques for tracking daily spending habits to prevent overspending.",
    icon: "clipboard-text-outline",
    topic: "Budgeting",
    minutes: 3,
    audience: "Students",
  },
];
