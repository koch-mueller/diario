import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { Task } from '../../domain/task';
import type {
  ReopenTaskCommand,
  ReopenTaskUseCase,
} from '../ports/input/reopen-task.use-case';
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
} from '../ports/output/task-repository.port';
import { ensureTaskBelongsToHousehold } from './task-access.helper';

/**
 * Öffnet eine bereits erledigte Aufgabe erneut.
 */
@Injectable()
export class ReopenTaskService implements ReopenTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Aufgabenzuordnung und speichert die wieder geöffnete Aufgabe.
   */
  async execute(command: ReopenTaskCommand): Promise<Task> {
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

    return this.taskRepository.save(existingTask.reopen());
  }
}
