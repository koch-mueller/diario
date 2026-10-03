import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { Task } from '../../domain/task';
import type {
  CompleteTaskCommand,
  CompleteTaskUseCase,
} from '../ports/input/complete-task.use-case';
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
} from '../ports/output/task-repository.port';
import { ensureTaskBelongsToHousehold } from './task-access.helper';

/**
 * Schließt Aufgaben ab und legt bei Wiederholungen die nächste Aufgabe an.
 */
@Injectable()
export class CompleteTaskService implements CompleteTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Markiert eine Aufgabe als erledigt und verarbeitet ihre Wiederholung.
   */
  async execute(command: CompleteTaskCommand): Promise<Task> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const task = await this.taskRepository.findById(command.id);
    const existingTask = ensureTaskBelongsToHousehold(
      task,
      command.householdId,
      command.id,
    );

    if (existingTask.completed) {
      return existingTask;
    }

    const nextOccurrence = existingTask.createNextOccurrence();
    const completedTask = nextOccurrence
      ? existingTask.complete().markNextOccurrenceCreated()
      : existingTask.complete();

    const savedTask = await this.taskRepository.save(completedTask);

    if (nextOccurrence) {
      await this.taskRepository.save(nextOccurrence);
    }

    return savedTask;
  }
}
