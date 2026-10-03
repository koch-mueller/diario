import { randomUUID } from 'node:crypto';

export type HouseholdMemberRole = 'OWNER' | 'MEMBER';

export interface HouseholdMemberProps {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdMemberRole;
  joinedAt: Date;
}

/**
 * Repräsentiert die Mitgliedschaft eines Benutzers in einer Wohnung.
 */
export class HouseholdMember {
  private constructor(
    public readonly id: string,
    public readonly householdId: string,
    public readonly userId: string,
    public readonly role: HouseholdMemberRole,
    public readonly joinedAt: Date,
  ) {}

  /**
   * Erstellt eine neue Mitgliedschaft mit der angegebenen Rolle.
   */
  static create(
    householdId: string,
    userId: string,
    role: HouseholdMemberRole,
  ): HouseholdMember {
    if (!householdId.trim() || !userId.trim()) {
      throw new Error('Wohnungs-ID und Benutzer-ID werden benötigt.');
    }

    return new HouseholdMember(
      randomUUID(),
      householdId,
      userId,
      role,
      new Date(),
    );
  }

  /**
   * Baut eine Wohnungsmitgliedschaft aus bereits gespeicherten Daten wieder auf.
   */
  static restore(props: HouseholdMemberProps): HouseholdMember {
    return new HouseholdMember(
      props.id,
      props.householdId,
      props.userId,
      props.role,
      props.joinedAt,
    );
  }
}
