import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import type { Task } from '../../domain/task';
import type {
  ListTasksQuery,
  ListTasksUseCase,
} from '../ports/input/list-tasks.use-case';
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
} from '../ports/output/task-repository.port';

/**
 * Lädt alle Aufgaben der ausgewählten Wohnung.
 */
@Injectable()
export class ListTasksService implements ListTasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Wohnungszugriff und liefert anschließend die Aufgaben der Wohnung.
   */
  async execute(query: ListTasksQuery): Promise<Task[]> {
    await this.householdAccessService.ensureAccess(
      query.householdId,
      query.userId,
    );

    return this.taskRepository.findByHouseholdId(query.householdId);
  }
}
