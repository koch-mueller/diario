import { randomBytes, randomUUID } from 'node:crypto';

export interface HouseholdProps {
  id: string;
  name: string;
  inviteCode: string;
  createdByUserId: string;
  createdAt: Date;
}

/**
 * Repräsentiert eine Wohnung mit Einladungscode und Ersteller.
 */
export class Household {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly inviteCode: string,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
  ) {}

  /**
   * Erstellt eine neue Wohnung und erzeugt dafür einen eindeutigen Einladungscode.
   */
  static create(name: string, createdByUserId: string): Household {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new Error('Der Wohnungsname darf nicht leer sein.');
    }

    if (!createdByUserId.trim()) {
      throw new Error('Die Benutzer-ID des Erstellers darf nicht leer sein.');
    }

    return new Household(
      randomUUID(),
      normalizedName,
      Household.generateInviteCode(),
      createdByUserId,
      new Date(),
    );
  }

  /**
   * Baut eine Wohnung aus bereits gespeicherten Daten wieder auf.
   */
  static restore(props: HouseholdProps): Household {
    return new Household(
      props.id,
      props.name.trim(),
      props.inviteCode.toUpperCase(),
      props.createdByUserId,
      props.createdAt,
    );
  }

  /**
   * Erzeugt einen zufälligen Einladungscode für eine Wohnung.
   */
  private static generateInviteCode(): string {
    return randomBytes(5).toString('hex').slice(0, 8).toUpperCase();
  }
}
