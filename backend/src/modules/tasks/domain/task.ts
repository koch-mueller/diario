import { randomUUID } from 'node:crypto';

export type TaskRecurrence = 'NONE' | 'WEEKLY' | 'MONTHLY';

export interface CreateTaskProperties {
  householdId: string;
  title: string;
  createdByUserId: string;
  deadline?: Date | string | null;
  recurrence?: TaskRecurrence;
}

export interface RestoreTaskProperties {
  id: string;
  householdId: string;
  title: string;
  completed: boolean;
  createdByUserId: string;
  deadline: Date | string | null;
  createdAt: Date;
  updatedAt: Date;
  recurrence?: TaskRecurrence;
  nextOccurrenceCreated?: boolean;
}

/**
 * Repräsentiert eine Aufgabe innerhalb einer Wohnung.
 * Wiederkehrende Aufgaben erzeugen beim ersten Abschließen automatisch
 * eine neue offene Aufgabe mit der nächsten Deadline.
 */
export class Task {
  private constructor(
    public readonly id: string,
    public readonly householdId: string,
    public readonly title: string,
    public readonly completed: boolean,
    public readonly createdByUserId: string,
    public readonly deadline: Date | null,
    public readonly recurrence: TaskRecurrence,
    public readonly nextOccurrenceCreated: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /**
   * Erstellt eine neue, noch nicht erledigte Aufgabe.
   */
  static create(properties: CreateTaskProperties): Task {
    const now = new Date();
    const recurrence = Task.normalizeRecurrence(
      properties.recurrence ?? 'NONE',
    );
    const deadline = Task.normalizeDeadline(properties.deadline ?? null);

    Task.ensureRecurringTaskHasDeadline(recurrence, deadline);

    return new Task(
      randomUUID(),
      properties.householdId,
      Task.normalizeTitle(properties.title),
      false,
      properties.createdByUserId,
      deadline,
      recurrence,
      false,
      now,
      now,
    );
  }

  /**
   * Baut eine Aufgabe aus gespeicherten Daten wieder auf.
   */
  static restore(properties: RestoreTaskProperties): Task {
    const recurrence = Task.normalizeRecurrence(
      properties.recurrence ?? 'NONE',
    );
    const deadline = Task.normalizeDeadline(properties.deadline);

    Task.ensureRecurringTaskHasDeadline(recurrence, deadline);

    return new Task(
      properties.id,
      properties.householdId,
      Task.normalizeTitle(properties.title),
      properties.completed,
      properties.createdByUserId,
      deadline,
      recurrence,
      properties.nextOccurrenceCreated ?? false,
      new Date(properties.createdAt),
      new Date(properties.updatedAt),
    );
  }

  /**
   * Ändert Titel, Deadline und optional die Wiederholung der Aufgabe.
   */
  rename(
    title: string,
    deadline?: Date | string | null,
    recurrence?: TaskRecurrence,
  ): Task {
    const normalizedTitle = Task.normalizeTitle(title);
    const normalizedDeadline =
      deadline === undefined ? this.deadline : Task.normalizeDeadline(deadline);
    const normalizedRecurrence =
      recurrence === undefined
        ? this.recurrence
        : Task.normalizeRecurrence(recurrence);

    Task.ensureRecurringTaskHasDeadline(
      normalizedRecurrence,
      normalizedDeadline,
    );

    if (
      normalizedTitle === this.title &&
      Task.isSameDeadline(normalizedDeadline, this.deadline) &&
      normalizedRecurrence === this.recurrence
    ) {
      return this;
    }

    return new Task(
      this.id,
      this.householdId,
      normalizedTitle,
      this.completed,
      this.createdByUserId,
      normalizedDeadline,
      normalizedRecurrence,
      normalizedRecurrence === this.recurrence
        ? this.nextOccurrenceCreated
        : false,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Markiert die Aufgabe als erledigt.
   */
  complete(): Task {
    if (this.completed) {
      return this;
    }

    return new Task(
      this.id,
      this.householdId,
      this.title,
      true,
      this.createdByUserId,
      this.deadline,
      this.recurrence,
      this.nextOccurrenceCreated,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Öffnet eine erledigte Aufgabe wieder.
   */
  reopen(): Task {
    if (!this.completed) {
      return this;
    }

    return new Task(
      this.id,
      this.householdId,
      this.title,
      false,
      this.createdByUserId,
      this.deadline,
      this.recurrence,
      this.nextOccurrenceCreated,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Erstellt die nächste Aufgabe einer Wiederholungsserie.
   * Bei einmaligen oder bereits fortgeschriebenen Aufgaben wird null geliefert.
   */
  createNextOccurrence(): Task | null {
    if (
      this.recurrence === 'NONE' ||
      !this.deadline ||
      this.nextOccurrenceCreated
    ) {
      return null;
    }

    return Task.create({
      householdId: this.householdId,
      title: this.title,
      createdByUserId: this.createdByUserId,
      deadline: Task.addRecurrence(this.deadline, this.recurrence),
      recurrence: this.recurrence,
    });
  }

  /**
   * Merkt, dass die nächste Aufgabe dieser Serie bereits angelegt wurde.
   */
  markNextOccurrenceCreated(): Task {
    if (this.nextOccurrenceCreated || this.recurrence === 'NONE') {
      return this;
    }

    return new Task(
      this.id,
      this.householdId,
      this.title,
      this.completed,
      this.createdByUserId,
      this.deadline,
      this.recurrence,
      true,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Entfernt Leerzeichen und verhindert leere Aufgabentitel.
   */
  private static normalizeTitle(title: string): string {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      throw new Error('Der Aufgabentitel darf nicht leer sein.');
    }

    return normalizedTitle;
  }

  /**
   * Wandelt eine optionale Deadline in ein gültiges Datum um.
   */
  private static normalizeDeadline(
    deadline: Date | string | null,
  ): Date | null {
    if (deadline === null) {
      return null;
    }

    const normalizedDeadline =
      deadline instanceof Date ? new Date(deadline) : new Date(deadline);

    if (Number.isNaN(normalizedDeadline.getTime())) {
      throw new Error('Die Deadline der Aufgabe ist ungültig.');
    }

    return normalizedDeadline;
  }

  /**
   * Prüft die ausgewählte Wiederholungsart.
   */
  private static normalizeRecurrence(
    recurrence: TaskRecurrence,
  ): TaskRecurrence {
    if (
      recurrence !== 'NONE' &&
      recurrence !== 'WEEKLY' &&
      recurrence !== 'MONTHLY'
    ) {
      throw new Error('Die Wiederholung der Aufgabe ist ungültig.');
    }

    return recurrence;
  }

  /**
   * Wiederkehrende Aufgaben benötigen eine Deadline als Startpunkt.
   */
  private static ensureRecurringTaskHasDeadline(
    recurrence: TaskRecurrence,
    deadline: Date | null,
  ): void {
    if (recurrence !== 'NONE' && !deadline) {
      throw new Error(
        'Wiederkehrende Aufgaben benötigen eine gültige Deadline.',
      );
    }
  }

  /**
   * Berechnet die nächste wöchentliche oder monatliche Deadline.
   */
  private static addRecurrence(
    deadline: Date,
    recurrence: Exclude<TaskRecurrence, 'NONE'>,
  ): Date {
    const nextDeadline = new Date(deadline);

    if (recurrence === 'WEEKLY') {
      nextDeadline.setUTCDate(nextDeadline.getUTCDate() + 7);
      return nextDeadline;
    }

    const originalDay = nextDeadline.getUTCDate();
    nextDeadline.setUTCDate(1);
    nextDeadline.setUTCMonth(nextDeadline.getUTCMonth() + 1);
    const lastDayOfNextMonth = new Date(
      Date.UTC(
        nextDeadline.getUTCFullYear(),
        nextDeadline.getUTCMonth() + 1,
        0,
      ),
    ).getUTCDate();
    nextDeadline.setUTCDate(Math.min(originalDay, lastDayOfNextMonth));

    return nextDeadline;
  }

  /**
   * Vergleicht zwei optionale Deadlines miteinander.
   */
  private static isSameDeadline(
    firstDeadline: Date | null,
    secondDeadline: Date | null,
  ): boolean {
    if (!firstDeadline && !secondDeadline) {
      return true;
    }

    if (!firstDeadline || !secondDeadline) {
      return false;
    }

    return firstDeadline.getTime() === secondDeadline.getTime();
  }
}
