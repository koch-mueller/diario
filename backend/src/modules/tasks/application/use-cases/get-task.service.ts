import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { Task } from '../../domain/task';
import type {
  GetTaskCommand,
  GetTaskUseCase,
} from '../ports/input/get-task.use-case';
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
} from '../ports/output/task-repository.port';
import { ensureTaskBelongsToHousehold } from './task-access.helper';

/**
 * Lädt eine einzelne Aufgabe der ausgewählten Wohnung.
 */
@Injectable()
export class GetTaskService implements GetTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Aufgabenzuordnung und gibt die Aufgabe zurück.
   */
  async execute(command: GetTaskCommand): Promise<Task> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const task = await this.taskRepository.findById(command.id);

    return ensureTaskBelongsToHousehold(task, command.householdId, command.id);
  }
}
