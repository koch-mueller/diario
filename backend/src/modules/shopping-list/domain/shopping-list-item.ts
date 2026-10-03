import { randomUUID } from 'node:crypto';

export interface CreateShoppingListItemProps {
  householdId: string;
  name: string;
  quantity?: string | null;
  createdByUserId: string;
}

export interface UpdateShoppingListItemProps {
  name?: string;
  quantity?: string | null;
  isChecked?: boolean;
  changedByUserId: string;
}

export interface ShoppingListItemProps {
  id: string;
  householdId: string;
  name: string;
  quantity: string | null;
  isChecked: boolean;
  createdByUserId: string;
  checkedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  checkedAt: Date | null;
}

/**
 * Repräsentiert einen Eintrag der gemeinsamen Einkaufsliste einer Wohnung.
 */
export class ShoppingListItem {
  private constructor(
    public readonly id: string,
    public readonly householdId: string,
    public readonly name: string,
    public readonly quantity: string | null,
    public readonly isChecked: boolean,
    public readonly createdByUserId: string,
    public readonly checkedByUserId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly checkedAt: Date | null,
  ) {}

  /**
   * Erstellt einen neuen, noch nicht erledigten Einkaufslisteneintrag.
   */
  static create(props: CreateShoppingListItemProps): ShoppingListItem {
    const now = new Date();
    const name = ShoppingListItem.normalizeName(props.name);

    if (!props.householdId.trim()) {
      throw new Error('Die Wohnungs-ID darf nicht leer sein.');
    }

    if (!props.createdByUserId.trim()) {
      throw new Error('Die Benutzer-ID darf nicht leer sein.');
    }

    return new ShoppingListItem(
      randomUUID(),
      props.householdId,
      name,
      ShoppingListItem.normalizeQuantity(props.quantity),
      false,
      props.createdByUserId,
      null,
      now,
      now,
      null,
    );
  }

  /**
   * Baut einen Einkaufslisteneintrag aus bereits gespeicherten Daten wieder auf.
   */
  static restore(props: ShoppingListItemProps): ShoppingListItem {
    return new ShoppingListItem(
      props.id,
      props.householdId,
      ShoppingListItem.normalizeName(props.name),
      ShoppingListItem.normalizeQuantity(props.quantity),
      props.isChecked,
      props.createdByUserId,
      props.checkedByUserId,
      props.createdAt,
      props.updatedAt,
      props.checkedAt,
    );
  }

  /**
   * Gibt eine aktualisierte Kopie des Einkaufslisteneintrags zurück.
   */
  update(props: UpdateShoppingListItemProps): ShoppingListItem {
    if (!props.changedByUserId.trim()) {
      throw new Error('Die Benutzer-ID darf nicht leer sein.');
    }

    const isChecked = props.isChecked ?? this.isChecked;
    const now = new Date();

    return new ShoppingListItem(
      this.id,
      this.householdId,
      props.name === undefined
        ? this.name
        : ShoppingListItem.normalizeName(props.name),
      props.quantity === undefined
        ? this.quantity
        : ShoppingListItem.normalizeQuantity(props.quantity),
      isChecked,
      this.createdByUserId,
      isChecked ? props.changedByUserId : null,
      this.createdAt,
      now,
      isChecked ? now : null,
    );
  }

  /**
   * Entfernt Leerzeichen und verhindert leere Eintragsnamen.
   */
  private static normalizeName(name: string): string {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new Error('Der Eintrag darf nicht leer sein.');
    }

    return normalizedName;
  }

  /**
   * Normalisiert die optionale Mengenangabe und behandelt leere Werte als null.
   */
  private static normalizeQuantity(
    quantity: string | null | undefined,
  ): string | null {
    if (quantity === null || quantity === undefined) {
      return null;
    }

    const normalizedQuantity = quantity.trim();

    return normalizedQuantity.length === 0 ? null : normalizedQuantity;
  }
}
