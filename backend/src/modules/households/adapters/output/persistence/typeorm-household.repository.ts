import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import type { HouseholdRepositoryPort } from '../../../application/ports/output/household-repository.port';
import { Household } from '../../../domain/household';
import { HouseholdMember } from '../../../domain/household-member';
import { HouseholdEntity } from './household.entity';
import { HouseholdMemberEntity } from './household-member.entity';

/**
 * Implementiert Wohnungs- und Mitgliedschaftsdatenzugriffe mit TypeORM.
 */
@Injectable()
export class TypeOrmHouseholdRepository implements HouseholdRepositoryPort {
  constructor(
    @InjectRepository(HouseholdEntity)
    private readonly householdRepository: Repository<HouseholdEntity>,
    @InjectRepository(HouseholdMemberEntity)
    private readonly memberRepository: Repository<HouseholdMemberEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Speichert eine neue oder veränderte Wohnung.
   */
  async save(household: Household): Promise<void> {
    await this.householdRepository.save({
      id: household.id,
      name: household.name,
      inviteCode: household.inviteCode,
      createdByUserId: household.createdByUserId,
      createdAt: household.createdAt,
    });
  }

  /**
   * Sucht eine Wohnung anhand ihrer ID.
   */
  async findById(id: string): Promise<Household | null> {
    const entity = await this.householdRepository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Sucht eine Wohnung anhand ihres Einladungscodes.
   */
  async findByInviteCode(inviteCode: string): Promise<Household | null> {
    const entity = await this.householdRepository.findOne({
      where: { inviteCode: inviteCode.toUpperCase() },
    });

    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Lädt alle Wohnungen, in denen der angegebene Benutzer Mitglied ist.
   */
  async findByUserId(userId: string): Promise<Household[]> {
    const memberships = await this.memberRepository.find({
      where: { userId },
      order: { joinedAt: 'ASC' },
    });

    if (memberships.length === 0) {
      return [];
    }

    const order = new Map(
      memberships.map((membership, index) => [membership.householdId, index]),
    );

    const entities = await this.householdRepository.find({
      where: {
        id: In(memberships.map((membership) => membership.householdId)),
      },
    });

    return entities
      .sort(
        (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
      )
      .map((entity) => this.toDomain(entity));
  }

  /**
   * Fügt der Wohnung ein neues Mitglied hinzu.
   */
  async addMember(member: HouseholdMember): Promise<void> {
    await this.memberRepository.save({
      id: member.id,
      householdId: member.householdId,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
    });
  }

  /**
   * Prüft, ob der Benutzer Mitglied der Wohnung ist.
   */
  async isMember(householdId: string, userId: string): Promise<boolean> {
    return (
      (await this.memberRepository.count({
        where: { householdId, userId },
      })) > 0
    );
  }

  /**
   * Lädt alle Mitglieder der angegebenen Wohnung.
   */
  async findMembersByHouseholdId(
    householdId: string,
  ): Promise<HouseholdMember[]> {
    const entities = await this.memberRepository.find({
      where: { householdId },
      order: { joinedAt: 'ASC' },
    });

    return entities.map((entity) =>
      HouseholdMember.restore({
        id: entity.id,
        householdId: entity.householdId,
        userId: entity.userId,
        role: entity.role,
        joinedAt: entity.joinedAt,
      }),
    );
  }

  /**
   * Löscht eine Wohnung und ihre zugehörigen Fachdaten innerhalb einer Transaktion.
   */
  async deleteById(householdId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .delete()
        .from('tasks')
        .where('household_id = :householdId', { householdId })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from('shopping_list_items')
        .where('household_id = :householdId', { householdId })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from('budget_entries')
        .where('household_id = :householdId', { householdId })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from('budget_categories')
        .where('household_id = :householdId', { householdId })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from('calendar_events')
        .where('household_id = :householdId', { householdId })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from('household_members')
        .where('household_id = :householdId', { householdId })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from('households')
        .where('id = :householdId', { householdId })
        .execute();
    });
  }

  /**
   * Wandelt eine TypeORM-Entität in ein fachliches Wohnungsobjekt um.
   */
  private toDomain(entity: HouseholdEntity): Household {
    return Household.restore({
      id: entity.id,
      name: entity.name,
      inviteCode: entity.inviteCode,
      createdByUserId: entity.createdByUserId,
      createdAt: entity.createdAt,
    });
  }
}
