import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type {
  DeleteTaskCommand,
  DeleteTaskUseCase,
} from '../ports/input/delete-task.use-case';
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
} from '../ports/output/task-repository.port';
import { ensureTaskBelongsToHousehold } from './task-access.helper';

/**
 * Löscht eine Aufgabe aus der ausgewählten Wohnung.
 */
@Injectable()
export class DeleteTaskService implements DeleteTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft Wohnungszugriff und Aufgabenzuordnung und löscht anschließend die Aufgabe.
   */
  async execute(command: DeleteTaskCommand): Promise<void> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const task = await this.taskRepository.findById(command.id);

    ensureTaskBelongsToHousehold(task, command.householdId, command.id);

    await this.taskRepository.deleteById(command.id);
  }
}
