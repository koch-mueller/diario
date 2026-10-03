import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { Task } from '../../domain/task';
import type {
  UpdateTaskTitleCommand,
  UpdateTaskTitleUseCase,
} from '../ports/input/update-task-title.use-case';
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
} from '../ports/output/task-repository.port';
import { ensureTaskBelongsToHousehold } from './task-access.helper';

/**
 * Aktualisiert Titel, Deadline und Wiederholung einer Aufgabe.
 */
@Injectable()
export class UpdateTaskTitleService implements UpdateTaskTitleUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Aufgabenzuordnung und speichert die aktualisierte Aufgabe.
   */
  async execute(command: UpdateTaskTitleCommand): Promise<Task> {
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

    return this.taskRepository.save(
      existingTask.rename(command.title, command.deadline, command.recurrence),
    );
  }
}
