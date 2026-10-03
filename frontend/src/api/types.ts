export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
};

export type AuthResult = {
  accessToken: string;
  user: AuthUser;
};

export type Household = {
  id: string;
  name: string;
  inviteCode: string;
  createdByUserId: string;
  createdAt: string;
};

export type HouseholdMember = {
  id: string;
  householdId: string;
  userId: string;
  userName?: string;
  userEmail?: string | null;
  role: "OWNER" | "MEMBER";
  joinedAt: string;
};

export type TaskRecurrence = "NONE" | "WEEKLY" | "MONTHLY";

export type Task = {
  id: string;
  householdId: string;
  title: string;
  displayTitle?: string;
  completed: boolean;
  createdByUserId: string;
  deadline: string | null;
  recurrence: TaskRecurrence;
  nextOccurrenceCreated: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingListItem = {
  id: string;
  householdId: string;
  name: string;
  displayName?: string;
  quantity: string | null;
  displayQuantity?: string | null;
  isChecked: boolean;
  createdByUserId: string;
  checkedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  checkedAt: string | null;
};

export type BudgetEntryType = "EXPENSE" | "INCOME";

export type BudgetEntry = {
  id: string;
  householdId: string;
  description: string;
  displayDescription?: string;
  amountCents: number;
  type: BudgetEntryType;
  category: string | null;
  displayCategory?: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  bookedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isRecurring: boolean;
};

export type BudgetSummary = {
  householdId: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  entriesCount: number;
};

export type CalendarEvent = {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  displayTitle?: string;
  displayDescription?: string | null;
  displayLocation?: string | null;
  originalTitle?: string;
  originalDescription?: string | null;
  originalLocation?: string | null;
};
