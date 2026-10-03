import { Inject, Injectable } from '@nestjs/common';

import { HouseholdAccessService } from '../../../households/application/services/household-access.service';
import { Task } from '../../domain/task';
import type {
  CreateTaskCommand,
  CreateTaskUseCase,
} from '../ports/input/create-task.use-case';
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
} from '../ports/output/task-repository.port';

/**
 * Erstellt Aufgaben für Mitglieder einer Wohnung.
 */
@Injectable()
export class CreateTaskService implements CreateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepositoryPort,

    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Prüft den Zugriff und speichert eine neue Aufgabe.
   */
  async execute(command: CreateTaskCommand): Promise<Task> {
    await this.householdAccessService.ensureAccess(
      command.householdId,
      command.userId,
    );

    const task = Task.create({
      householdId: command.householdId,
      title: command.title,
      createdByUserId: command.userId,
      deadline: command.deadline ?? null,
      recurrence: command.recurrence,
    });

    return this.taskRepository.save(task);
  }
}
