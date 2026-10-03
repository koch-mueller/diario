import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import type { ShoppingListRepositoryPort } from '../../../application/ports/output/shopping-list-repository.port';
import { ShoppingListItem } from '../../../domain/shopping-list-item';
import { ShoppingListItemEntity } from './shopping-list-item.entity';

/**
 * Implementiert den Datenzugriff der Einkaufsliste mit TypeORM.
 */
@Injectable()
export class TypeOrmShoppingListRepository implements ShoppingListRepositoryPort {
  constructor(
    @InjectRepository(ShoppingListItemEntity)
    private readonly repository: Repository<ShoppingListItemEntity>,
  ) {}

  /**
   * Speichert einen neuen oder veränderten Einkaufslisteneintrag.
   */
  async save(item: ShoppingListItem): Promise<ShoppingListItem> {
    const savedEntity = await this.repository.save({
      id: item.id,
      householdId: item.householdId,
      name: item.name,
      quantity: item.quantity,
      isChecked: item.isChecked,
      createdByUserId: item.createdByUserId,
      checkedByUserId: item.checkedByUserId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      checkedAt: item.checkedAt,
    });

    return this.toDomain(savedEntity);
  }

  /**
   * Sucht einen Einkaufslisteneintrag anhand seiner ID.
   */
  async findById(id: string): Promise<ShoppingListItem | null> {
    const entity = await this.repository.findOne({
      where: {
        id,
      },
    });

    return entity ? this.toDomain(entity) : null;
  }

  /**
   * Lädt alle Einkaufslisteneinträge der angegebenen Wohnung.
   */
  async findByHouseholdId(householdId: string): Promise<ShoppingListItem[]> {
    const entities = await this.repository.find({
      where: {
        householdId,
      },
      order: {
        isChecked: 'ASC',
        createdAt: 'ASC',
      },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  /**
   * Löscht den Einkaufslisteneintrag mit der angegebenen ID.
   */
  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  /**
   * Wandelt eine TypeORM-Entität in einen fachlichen Einkaufslisteneintrag um.
   */
  private toDomain(entity: ShoppingListItemEntity): ShoppingListItem {
    return ShoppingListItem.restore({
      id: entity.id,
      householdId: entity.householdId,
      name: entity.name,
      quantity: entity.quantity,
      isChecked: entity.isChecked,
      createdByUserId: entity.createdByUserId,
      checkedByUserId: entity.checkedByUserId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      checkedAt: entity.checkedAt,
    });
  }
}
