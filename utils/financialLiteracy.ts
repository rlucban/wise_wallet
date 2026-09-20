import { Due, Transaction } from "../types";

export interface FinancialTipData {
  title: string;
  message: string;
  icon: string;
}

export type MonthPeriod = "start" | "mid" | "end";

export function getMonthPeriod(date: Date): MonthPeriod {
  const day = date.getDate();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  if (day <= 7) return "start";
  if (day >= lastDay - 6) return "end";
  return "mid";
}

export function getDayOfWeekTip(date: Date): FinancialTipData {
  switch (date.getDay()) {
    case 0:
      return {
        title: "Sunday reset",
        message: "Plan next week's spending and meals ahead of time so the week starts on budget.",
        icon: "weather-sunny",
      };
    case 1:
      return {
        title: "Monday money check",
        message: "Review your weekly budget to start the week in control of your money.",
        icon: "notebook-check-outline",
      };
    case 2:
    case 3:
      return {
        title: "Midweek habits",
        message: "Small daily spends add up — log every expense this week to stay on track.",
        icon: "pencil-outline",
      };
    case 4:
      return {
        title: "Payday planning",
        message: "If today is payday, pay yourself first — automate savings before spending.",
        icon: "bank-outline",
      };
    case 5:
      return {
        title: "Weekend prep",
        message: "Set a weekend spending limit so you don't dip into your savings.",
        icon: "wallet-outline",
      };
    default:
      return {
        title: "Budget check",
        message: "Review what you've spent this week and adjust before the week ends.",
        icon: "chart-box-outline",
      };
  }
}

export function getTimeOfMonthTip(date: Date): FinancialTipData {
  const period = getMonthPeriod(date);
  const monthName = date.toLocaleString(undefined, { month: "long" });
  switch (period) {
    case "start":
      return {
        title: "Fresh month, fresh budget",
        message: `It's the start of ${monthName}. Set a realistic budget now and allocate savings before spending.`,
        icon: "calendar-star",
      };
    case "mid":
      return {
        title: "Mid-month check-in",
        message: `Halfway through ${monthName} — track your spending so far and adjust before the month ends.`,
        icon: "chart-timeline-variant",
      };
    case "end":
      return {
        title: "Month-end review",
        message: `${monthName} is winding down. Review your remaining budget and avoid last-minute impulse buys.`,
        icon: "calendar-check",
      };
  }
}

export function getSeasonTip(date: Date): FinancialTipData {
  const month = date.getMonth();
  if (month === 11 || month <= 1) {
    return {
      title: "Holiday spending",
      message: "Holiday season is costly — set a gift budget early and stick to it.",
      icon: "gift-outline",
    };
  }
  if (month === 2 || month === 3) {
    return {
      title: "Seasonal bills ahead",
      message: "Back-to-school and seasonal bills add up — set money aside before large purchases.",
      icon: "school-outline",
    };
  }
  if (month === 4 || month === 5) {
    return {
      title: "Spring-clean your finances",
      message: "Cancel unused subscriptions and review recurring charges you no longer need.",
      icon: "broom",
    };
  }
  if (month === 6 || month === 7) {
    return {
      title: "Vacation budgeting",
      message: "Summer trips strain budgets — save a little each week before you travel.",
      icon: "airplane",
    };
  }
  return {
    title: "Stay the course",
    message: "Aim to save at least 20% of your income every month, no matter the season.",
    icon: "piggy-bank-outline",
  };
}

export function getDateContextTips(date: Date): FinancialTipData[] {
  return [getDayOfWeekTip(date), getTimeOfMonthTip(date), getSeasonTip(date)];
}

export interface DayAnalysis {
  netFlow: number;
  income: number;
  expense: number;
  topCategory?: string;
  topCategoryAmount: number;
  avgDailyExpense: number;
  daysTracked: number;
}

export function getDayAnalysis(date: string, transactions: Transaction[]): DayAnalysis {
  const dayTxs = transactions.filter((t) => t.date.startsWith(date));
  const income = dayTxs.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const expense = dayTxs.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

  const catMap: Record<string, number> = {};
  dayTxs
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const name = t.category?.name || "Others";
      catMap[name] = (catMap[name] || 0) + (t.amount || 0);
    });
  const top = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

  const selectedTime = new Date(date + "T00:00:00").getTime();
  const expenseDays = new Set<string>();
  let priorExpense = 0;
  transactions.forEach((t) => {
    if (t.type !== "expense") return;
    const day = t.date.split("T")[0];
    if (new Date(day + "T00:00:00").getTime() <= selectedTime) {
      priorExpense += t.amount || 0;
      expenseDays.add(day);
    }
  });
  const avgDailyExpense = expenseDays.size > 0 ? priorExpense / expenseDays.size : 0;

  return {
    netFlow: income - expense,
    income,
    expense,
    topCategory: top?.[0],
    topCategoryAmount: top?.[1] || 0,
    avgDailyExpense,
    daysTracked: expenseDays.size,
  };
}

export function getDayFinancialTips(
  date: string,
  transactions: Transaction[],
  formatAmount: (amount: number) => string
): FinancialTipData[] {
  const a = getDayAnalysis(date, transactions);
  const tips: FinancialTipData[] = [];

  if (a.expense === 0 && a.income === 0) {
    tips.push({
      title: "No transactions yet",
      message: "This day has no records. Logging every expense, no matter how small, reveals spending leaks.",
      icon: "pencil-outline",
    });
    return tips;
  }

  if (a.netFlow < 0) {
    tips.push({
      title: "Net outflow day",
      message: `You spent ${formatAmount(a.expense)} while earning ${formatAmount(a.income)} — a net loss of ${formatAmount(Math.abs(a.netFlow))} today.`,
      icon: "trending-down",
    });
  } else if (a.netFlow > 0) {
    tips.push({
      title: "Positive cash day",
      message: `You came out ${formatAmount(a.netFlow)} ahead today. Consider moving a portion into savings.`,
      icon: "trending-up",
    });
  }

  if (a.daysTracked > 0 && a.expense > a.avgDailyExpense) {
    tips.push({
      title: "Above-average spend",
      message: `Today's spending (${formatAmount(a.expense)}) is above your daily average of ${formatAmount(a.avgDailyExpense)}.`,
      icon: "alert-circle-outline",
    });
  }

  if (a.topCategory) {
    tips.push({
      title: `Top category: ${a.topCategory}`,
      message: `${a.topCategory} was your biggest expense today at ${formatAmount(a.topCategoryAmount)}.`,
      icon: "tag-outline",
    });
  }

  return tips;
}

export function getPeriodLabel(period: string): string {
  switch (period) {
    case "weekly":
      return "week";
    case "monthly":
      return "month";
    case "annually":
      return "year";
    default:
      return "period";
  }
}

export function getPeriodFinancialTips(
  period: string,
  income: number,
  expense: number,
  formatAmount: (amount: number) => string
): FinancialTipData[] {
  const tips: FinancialTipData[] = [];
  const label = getPeriodLabel(period);

  if (income === 0 && expense === 0) {
    tips.push({
      title: "No data for this period",
      message: "Add transactions to unlock insights about your spending habits.",
      icon: "chart-bar",
    });
    return tips;
  }

  const net = income - expense;
  const savingsRate = income > 0 ? net / income : 0;

  if (income > 0 && savingsRate < 0) {
    tips.push({
      title: "Spending more than earning",
      message: `Expenses (${formatAmount(expense)}) exceeded income (${formatAmount(income)}) this ${label}. Trim variable expenses to protect your savings.`,
      icon: "alert-octagon",
    });
  } else if (income > 0 && savingsRate < 0.2) {
    tips.push({
      title: "Low savings rate",
      message: `You're saving ${Math.round(savingsRate * 100)}% of income this ${label}. The 50/30/20 rule suggests saving at least 20%.`,
      icon: "alert",
    });
  } else if (income > 0) {
    tips.push({
      title: "Healthy savings rate",
      message: `You saved ${Math.round(savingsRate * 100)}% of your income this ${label} — keep it up!`,
      icon: "check-circle",
    });
  }

  if (income > 0 && expense > 0 && expense / income > 0.8) {
    tips.push({
      title: "Expenses eating your income",
      message: `${Math.round((expense / income) * 100)}% of income went to expenses. Consider cutting wants to free up more for savings.`,
      icon: "fire",
    });
  }

  if (period === "weekly" && expense > 0) {
    tips.push({
      title: "Daily average",
      message: `You're spending about ${formatAmount(expense / 7)} per day this week.`,
      icon: "calendar-week",
    });
  }

  if (period === "monthly" && expense > 0) {
    tips.push({
      title: "Monthly pulse",
      message: `Total monthly expense is ${formatAmount(expense)}. An emergency fund of 3-6× this amount provides a strong safety net.`,
      icon: "shield-alert-outline",
    });
  }

  return tips;
}

export function isOverdue(due: Due): boolean {
  if (due.completed) return false;
  return new Date(due.date).getTime() < new Date().getTime();
}

export function getRecurringProjectionMessage(
  due: Due,
  formatAmount: (amount: number) => string
): string | null {
  if (!due.frequency || due.frequency === "once") return null;
  let periods = 12;
  switch (due.frequency) {
    case "weekly":
      periods = 52;
      break;
    case "biweekly":
      periods = 26;
      break;
    case "yearly":
      periods = 1;
      break;
  }
  const yearly = due.amount * periods;
  return `This ${due.frequency} item adds up to about ${formatAmount(yearly)} per year — small recurring charges grow fast.`;
}
