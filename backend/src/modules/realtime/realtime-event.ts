export type RealtimeResource =
  'households' | 'tasks' | 'shopping-list' | 'budget' | 'calendar';

export type RealtimeAction =
  'created' | 'updated' | 'deleted' | 'completed' | 'reopened' | 'joined';

export interface HouseholdChangedEvent {
  householdId: string;
  resource: RealtimeResource;
  action: RealtimeAction;
  entityId?: string;
  changedByUserId?: string;
  occurredAt: string;
  payload?: unknown;
}
