import { randomUUID } from 'node:crypto';

export interface CreateCalendarEventProps {
  householdId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  isAllDay?: boolean;
  createdByUserId: string;
}

export interface UpdateCalendarEventProps {
  title?: string;
  description?: string | null;
  location?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  isAllDay?: boolean;
  changedByUserId: string;
}

export interface CalendarEventProps {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Signalisiert ungültige fachliche Daten eines Kalendereintrags.
 */
export class CalendarEventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarEventValidationError';
  }
}

/**
 * Repräsentiert einen Kalendereintrag einer Wohnung und prüft seine fachlichen Regeln.
 */
export class CalendarEvent {
  private constructor(
    public readonly id: string,
    public readonly householdId: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly location: string | null,
    public readonly startsAt: Date,
    public readonly endsAt: Date,
    public readonly isAllDay: boolean,
    public readonly createdByUserId: string,
    public readonly updatedByUserId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /**
   * Erstellt einen neuen Kalendereintrag und validiert Zeitraum sowie Textfelder.
   */
  static create(props: CreateCalendarEventProps): CalendarEvent {
    const now = new Date();
    const title = CalendarEvent.normalizeTitle(props.title);

    CalendarEvent.assertNotBlank(
      props.householdId,
      'Die Wohnungs-ID darf nicht leer sein.',
    );
    CalendarEvent.assertNotBlank(
      props.createdByUserId,
      'Die Benutzer-ID darf nicht leer sein.',
    );
    CalendarEvent.assertDateRange(props.startsAt, props.endsAt);

    return new CalendarEvent(
      randomUUID(),
      props.householdId,
      title,
      CalendarEvent.normalizeOptionalText(props.description),
      CalendarEvent.normalizeOptionalText(props.location),
      props.startsAt,
      props.endsAt,
      props.isAllDay ?? false,
      props.createdByUserId,
      null,
      now,
      now,
    );
  }

  /**
   * Baut einen Kalendereintrag aus bereits gespeicherten Daten wieder auf.
   */
  static restore(props: CalendarEventProps): CalendarEvent {
    CalendarEvent.assertDateRange(props.startsAt, props.endsAt);

    return new CalendarEvent(
      props.id,
      props.householdId,
      CalendarEvent.normalizeTitle(props.title),
      CalendarEvent.normalizeOptionalText(props.description),
      CalendarEvent.normalizeOptionalText(props.location),
      props.startsAt,
      props.endsAt,
      props.isAllDay,
      props.createdByUserId,
      props.updatedByUserId,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * Gibt eine aktualisierte Kopie des Kalendereintrags zurück.
   */
  update(props: UpdateCalendarEventProps): CalendarEvent {
    CalendarEvent.assertNotBlank(
      props.changedByUserId,
      'Die Benutzer-ID darf nicht leer sein.',
    );

    const startsAt = props.startsAt ?? this.startsAt;
    const endsAt = props.endsAt ?? this.endsAt;

    CalendarEvent.assertDateRange(startsAt, endsAt);

    return new CalendarEvent(
      this.id,
      this.householdId,
      props.title === undefined
        ? this.title
        : CalendarEvent.normalizeTitle(props.title),
      props.description === undefined
        ? this.description
        : CalendarEvent.normalizeOptionalText(props.description),
      props.location === undefined
        ? this.location
        : CalendarEvent.normalizeOptionalText(props.location),
      startsAt,
      endsAt,
      props.isAllDay ?? this.isAllDay,
      this.createdByUserId,
      props.changedByUserId,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Entfernt Leerzeichen und verhindert leere Termintitel.
   */
  private static normalizeTitle(title: string): string {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      throw new CalendarEventValidationError(
        'Der Termin-Titel darf nicht leer sein.',
      );
    }

    return normalizedTitle;
  }

  /**
   * Normalisiert optionale Textfelder und behandelt leere Werte als null.
   */
  private static normalizeOptionalText(
    value: string | null | undefined,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length === 0 ? null : normalizedValue;
  }

  /**
   * Prüft, ob ein Pflichttext einen Inhalt besitzt.
   */
  private static assertNotBlank(value: string, message: string): void {
    if (!value.trim()) {
      throw new CalendarEventValidationError(message);
    }
  }

  /**
   * Prüft, ob Beginn und Ende eines Termins zusammenpassen.
   */
  static assertDateRange(startsAt: Date, endsAt: Date): void {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new CalendarEventValidationError(
        'Start- und Endzeit müssen gültige Datumswerte sein.',
      );
    }

    if (endsAt <= startsAt) {
      throw new CalendarEventValidationError(
        'Die Endzeit muss nach der Startzeit liegen.',
      );
    }
  }
}
