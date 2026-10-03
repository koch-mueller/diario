import { Task } from '../../../domain/task';
import { TaskEntity } from './task.entity';

/**
 * Übersetzt Aufgaben zwischen Domainmodell und Datenbankentität.
 */
export class TaskMapper {
  /**
   * Wandelt eine Domainaufgabe in eine TypeORM-Entität um.
   */
  static toPersistence(task: Task): TaskEntity {
    const entity = new TaskEntity();

    entity.id = task.id;
    entity.householdId = task.householdId;
    entity.title = task.title;
    entity.completed = task.completed;
    entity.createdByUserId = task.createdByUserId;
    entity.deadline = task.deadline;
    entity.recurrence = task.recurrence;
    entity.nextOccurrenceCreated = task.nextOccurrenceCreated;
    entity.createdAt = task.createdAt;
    entity.updatedAt = task.updatedAt;

    return entity;
  }

  /**
   * Baut aus einer TypeORM-Entität eine Domainaufgabe auf.
   */
  static toDomain(entity: TaskEntity): Task {
    return Task.restore({
      id: entity.id,
      householdId: entity.householdId,
      title: entity.title,
      completed: entity.completed,
      createdByUserId: entity.createdByUserId,
      deadline: entity.deadline,
      recurrence: entity.recurrence,
      nextOccurrenceCreated: entity.nextOccurrenceCreated,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
