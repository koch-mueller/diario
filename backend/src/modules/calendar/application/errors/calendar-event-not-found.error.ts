/**
 * Signalisiert, dass ein Kalendereintrag nicht existiert oder nicht zur Wohnung gehört.
 */
export class CalendarEventNotFoundError extends Error {
  constructor() {
    super('Der Kalendertermin wurde nicht gefunden.');
    this.name = 'CalendarEventNotFoundError';
  }
}
