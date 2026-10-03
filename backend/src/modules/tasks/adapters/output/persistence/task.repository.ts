import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import type { TaskRepositoryPort } from '../../../application/ports/output/task-repository.port';
import type { Task } from '../../../domain/task';
import { TaskEntity } from './task.entity';
import { TaskMapper } from './task.mapper';

/**
 * Implementiert den Aufgaben-Datenzugriff mit TypeORM.
 */
@Injectable()
export class TaskRepository implements TaskRepositoryPort {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly repository: Repository<TaskEntity>,
  ) {}

  /**
   * Speichert eine neue oder veränderte Aufgabe.
   */
  async save(task: Task): Promise<Task> {
    const entity = TaskMapper.toPersistence(task);
    const savedEntity = await this.repository.save(entity);

    return TaskMapper.toDomain(savedEntity);
  }

  /**
   * Sucht eine Aufgabe anhand ihrer ID.
   */
  async findById(id: string): Promise<Task | null> {
    const entity = await this.repository.findOne({
      where: {
        id,
      },
    });

    return entity ? TaskMapper.toDomain(entity) : null;
  }

  /**
   * Lädt alle Aufgaben der angegebenen Wohnung.
   */
  async findByHouseholdId(householdId: string): Promise<Task[]> {
    const entities = await this.repository.find({
      where: {
        householdId,
      },
      order: {
        completed: 'ASC',
        deadline: 'ASC',
        createdAt: 'ASC',
      },
    });

    return entities.map((entity) => TaskMapper.toDomain(entity));
  }

  /**
   * Löscht die Aufgabe mit der angegebenen ID.
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await this.repository.delete({
      id,
    });

    return result.affected === 1;
  }
}
