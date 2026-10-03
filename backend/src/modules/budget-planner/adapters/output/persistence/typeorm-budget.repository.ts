import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import type { BudgetRepositoryPort } from '../../../application/ports/output/budget-repository.port';
import { BudgetEntry } from '../../../domain/budget-entry';
import { BudgetCategoryEntity } from './budget-category.entity';
import { BudgetEntryEntity } from './budget-entry.entity';

/**
 * Speichert und lädt Budgetdaten über TypeORM aus PostgreSQL.
 */
@Injectable()
export class TypeOrmBudgetRepository implements BudgetRepositoryPort {
  /**
   * Erstellt das Repository mit den beiden benötigten TypeORM-Repositories.
   */
  constructor(
    @InjectRepository(BudgetEntryEntity)
    private readonly repository: Repository<BudgetEntryEntity>,

    @InjectRepository(BudgetCategoryEntity)
    private readonly categoryRepository: Repository<BudgetCategoryEntity>,
  ) {}

  /**
   * Speichert einen neuen oder veränderten Budgeteintrag.
   */
  async save(entry: BudgetEntry): Promise<BudgetEntry> {
    const savedEntity = await this.repository.save({
      id: entry.id,
      householdId: entry.householdId,
      description: entry.description,
      amountCents: entry.amountCents,
      type: entry.type,
      category: entry.category,
      createdByUserId: entry.createdByUserId,
      updatedByUserId: entry.updatedByUserId,
      bookedAt: entry.bookedAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      isRecurring: entry.isRecurring,
    });

    return this.toDomain(savedEntity);
  }

  /**
   * Sucht einen Budgeteintrag anhand seiner ID.
   */
  async findById(id: string): Promise<BudgetEntry | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Lädt alle Budgeteinträge einer Wohnung in zeitlicher Reihenfolge.
   */
  async findByHouseholdId(householdId: string): Promise<BudgetEntry[]> {
    const entities = await this.repository.find({
      where: { householdId },
      order: {
        bookedAt: 'DESC',
        createdAt: 'DESC',
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  /**
   * Löscht einen Budgeteintrag dauerhaft aus der Datenbank.
   */
  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  /**
   * Speichert eine Kategorie für die spätere Wiederverwendung.
   */
  async saveCategory(householdId: string, category: string): Promise<void> {
    await this.categoryRepository.save({
      householdId,
      name: category,
      createdAt: new Date(),
    });
  }

  /**
   * Lädt alle gespeicherten Kategorien einer Wohnung.
   */
  async findCategoriesByHouseholdId(householdId: string): Promise<string[]> {
    const categories = await this.categoryRepository.find({
      where: { householdId },
      order: { name: 'ASC' },
    });

    return categories.map((category) => category.name);
  }

  /**
   * Wandelt eine Datenbankentität in das Domainobjekt um.
   */
  private toDomain(entity: BudgetEntryEntity): BudgetEntry {
    return BudgetEntry.restore({
      id: entity.id,
      householdId: entity.householdId,
      description: entity.description,
      amountCents: entity.amountCents,
      type: entity.type,
      category: entity.category,
      createdByUserId: entity.createdByUserId,
      updatedByUserId: entity.updatedByUserId,
      bookedAt: entity.bookedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isRecurring: entity.isRecurring,
    });
  }
}
