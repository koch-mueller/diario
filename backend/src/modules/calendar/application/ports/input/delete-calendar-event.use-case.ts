export const DELETE_CALENDAR_EVENT_USE_CASE = Symbol(
  'DELETE_CALENDAR_EVENT_USE_CASE',
);

export interface DeleteCalendarEventCommand {
  householdId: string;
  eventId: string;
  userId: string;
}

export interface DeleteCalendarEventUseCase {
  execute(command: DeleteCalendarEventCommand): Promise<void>;
}
