import { randomUUID } from 'node:crypto';

export type BudgetEntryType = 'EXPENSE' | 'INCOME';

export interface CreateBudgetEntryProps {
  householdId: string;
  description: string;
  amountCents: number;
  type?: BudgetEntryType;
  category?: string | null;
  createdByUserId: string;
  bookedAt?: Date;
  createdAt?: Date;
  isRecurring?: boolean;
}

export interface UpdateBudgetEntryProps {
  description?: string;
  amountCents?: number;
  type?: BudgetEntryType;
  category?: string | null;
  changedByUserId: string;
}

export interface BudgetEntryProps {
  id: string;
  householdId: string;
  description: string;
  amountCents: number;
  type: BudgetEntryType;
  category: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  bookedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isRecurring?: boolean;
}

/**
 * Repräsentiert einen einzelnen Budgeteintrag einer Wohnung.
 * Ein Eintrag kann einmalig oder monatlich wiederkehrend sein.
 */
export class BudgetEntry {
  private constructor(
    public readonly id: string,
    public readonly householdId: string,
    public readonly description: string,
    public readonly amountCents: number,
    public readonly type: BudgetEntryType,
    public readonly category: string | null,
    public readonly createdByUserId: string,
    public readonly updatedByUserId: string | null,
    public readonly bookedAt: Date,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly isRecurring: boolean,
  ) {}

  /**
   * Erstellt einen neuen Budgeteintrag und prüft die übergebenen Werte.
   */
  static create(props: CreateBudgetEntryProps): BudgetEntry {
    const now = new Date();
    const createdAt = BudgetEntry.normalizeDate(props.createdAt ?? now);
    const bookedAt = BudgetEntry.normalizeDate(props.bookedAt ?? createdAt);

    if (!props.householdId.trim()) {
      throw new Error('Die Wohnungs-ID darf nicht leer sein.');
    }

    if (!props.createdByUserId.trim()) {
      throw new Error('Die Benutzer-ID darf nicht leer sein.');
    }

    return new BudgetEntry(
      randomUUID(),
      props.householdId,
      BudgetEntry.normalizeDescription(props.description),
      BudgetEntry.normalizeAmount(props.amountCents),
      BudgetEntry.normalizeType(props.type ?? 'EXPENSE'),
      BudgetEntry.normalizeCategory(props.category),
      props.createdByUserId,
      null,
      bookedAt,
      createdAt,
      now,
      props.isRecurring ?? false,
    );
  }

  /**
   * Baut ein Domainobjekt aus bereits gespeicherten Daten wieder auf.
   */
  static restore(props: BudgetEntryProps): BudgetEntry {
    return new BudgetEntry(
      props.id,
      props.householdId,
      BudgetEntry.normalizeDescription(props.description),
      BudgetEntry.normalizeAmount(props.amountCents),
      BudgetEntry.normalizeType(props.type),
      BudgetEntry.normalizeCategory(props.category),
      props.createdByUserId,
      props.updatedByUserId,
      BudgetEntry.normalizeDate(props.bookedAt ?? props.createdAt),
      props.createdAt,
      props.updatedAt,
      props.isRecurring ?? false,
    );
  }

  /**
   * Gibt eine aktualisierte Kopie des Budgeteintrags zurück.
   */
  update(props: UpdateBudgetEntryProps): BudgetEntry {
    if (!props.changedByUserId.trim()) {
      throw new Error('Die Benutzer-ID darf nicht leer sein.');
    }

    return new BudgetEntry(
      this.id,
      this.householdId,
      props.description === undefined
        ? this.description
        : BudgetEntry.normalizeDescription(props.description),
      props.amountCents === undefined
        ? this.amountCents
        : BudgetEntry.normalizeAmount(props.amountCents),
      props.type === undefined
        ? this.type
        : BudgetEntry.normalizeType(props.type),
      props.category === undefined
        ? this.category
        : BudgetEntry.normalizeCategory(props.category),
      this.createdByUserId,
      props.changedByUserId,
      this.bookedAt,
      this.createdAt,
      new Date(),
      this.isRecurring,
    );
  }

  /**
   * Entfernt Leerzeichen und verhindert leere Beschreibungen.
   */
  private static normalizeDescription(description: string): string {
    const normalizedDescription = description.trim();

    if (!normalizedDescription) {
      throw new Error('Die Beschreibung darf nicht leer sein.');
    }

    return normalizedDescription;
  }

  /**
   * Prüft, ob der Betrag als positive ganze Cent-Zahl vorliegt.
   */
  private static normalizeAmount(amountCents: number): number {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error(
        'Der Betrag muss als positive Cent-Zahl angegeben werden.',
      );
    }

    return amountCents;
  }

  /**
   * Erstellt eine sichere Datumskopie und prüft ihre Gültigkeit.
   */
  private static normalizeDate(value: Date): Date {
    const normalizedDate = new Date(value);

    if (Number.isNaN(normalizedDate.getTime())) {
      throw new Error('Das Datum ist ungültig.');
    }

    return normalizedDate;
  }

  /**
   * Stellt sicher, dass nur unterstützte Budgettypen verwendet werden.
   */
  private static normalizeType(type: BudgetEntryType): BudgetEntryType {
    if (type !== 'EXPENSE' && type !== 'INCOME') {
      throw new Error('Der Budget-Typ ist ungültig.');
    }

    return type;
  }

  /**
   * Vereinheitlicht optionale Kategorien und behandelt leere Werte als null.
   */
  private static normalizeCategory(
    category: string | null | undefined,
  ): string | null {
    if (category === null || category === undefined) {
      return null;
    }

    const normalizedCategory = category.trim();

    return normalizedCategory.length === 0 ? null : normalizedCategory;
  }
}
