import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Optional,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../../../auth/adapters/input/rest/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/adapters/input/rest/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../../auth/application/authenticated-user';
import { HouseholdAccessDeniedError } from '../../../../households/application/errors/household-access-denied.error';
import { HouseholdNotFoundError } from '../../../../households/application/errors/household-not-found.error';
import { RealtimeEventsService } from '../../../../realtime/realtime-events.service';
import { TaskNotFoundError } from '../../../application/errors/task-not-found.error';
import {
  COMPLETE_TASK_USE_CASE,
  type CompleteTaskUseCase,
} from '../../../application/ports/input/complete-task.use-case';
import {
  CREATE_TASK_USE_CASE,
  type CreateTaskUseCase,
} from '../../../application/ports/input/create-task.use-case';
import {
  DELETE_TASK_USE_CASE,
  type DeleteTaskUseCase,
} from '../../../application/ports/input/delete-task.use-case';
import {
  GET_TASK_USE_CASE,
  type GetTaskUseCase,
} from '../../../application/ports/input/get-task.use-case';
import {
  LIST_TASKS_USE_CASE,
  type ListTasksUseCase,
} from '../../../application/ports/input/list-tasks.use-case';
import {
  REOPEN_TASK_USE_CASE,
  type ReopenTaskUseCase,
} from '../../../application/ports/input/reopen-task.use-case';
import {
  UPDATE_TASK_TITLE_USE_CASE,
  type UpdateTaskTitleUseCase,
} from '../../../application/ports/input/update-task-title.use-case';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

/**
 * Stellt die REST-Endpunkte für Aufgaben einer Wohnung bereit.
 */
@Controller('households/:householdId/tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    @Inject(CREATE_TASK_USE_CASE)
    private readonly createTaskUseCase: CreateTaskUseCase,

    @Inject(LIST_TASKS_USE_CASE)
    private readonly listTasksUseCase: ListTasksUseCase,

    @Inject(GET_TASK_USE_CASE)
    private readonly getTaskUseCase: GetTaskUseCase,

    @Inject(COMPLETE_TASK_USE_CASE)
    private readonly completeTaskUseCase: CompleteTaskUseCase,

    @Inject(REOPEN_TASK_USE_CASE)
    private readonly reopenTaskUseCase: ReopenTaskUseCase,

    @Inject(UPDATE_TASK_TITLE_USE_CASE)
    private readonly updateTaskTitleUseCase: UpdateTaskTitleUseCase,

    @Inject(DELETE_TASK_USE_CASE)
    private readonly deleteTaskUseCase: DeleteTaskUseCase,

    @Optional()
    private readonly realtimeEvents?: RealtimeEventsService,
  ) {}

  /**
   * Erstellt eine neue Aufgabe und veröffentlicht die Änderung in Echtzeit.
   */
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Body() dto: CreateTaskDto,
  ) {
    try {
      const task = await this.createTaskUseCase.execute({
        householdId,
        title: dto.title,
        deadline: dto.deadline ?? null,
        recurrence: dto.recurrence,
        userId: user.id,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'tasks',
        action: 'created',
        entityId: task.id,
        changedByUserId: user.id,
        payload: task,
      });

      return task;
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Liefert alle Aufgaben der ausgewählten Wohnung.
   */
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
  ) {
    try {
      return await this.listTasksUseCase.execute({
        householdId,
        userId: user.id,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Liefert eine einzelne Aufgabe der ausgewählten Wohnung.
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('id')
    id: string,
  ) {
    try {
      return await this.getTaskUseCase.execute({
        householdId,
        id,
        userId: user.id,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Markiert eine Aufgabe als erledigt und veröffentlicht die Änderung in Echtzeit.
   */
  @Patch(':id/complete')
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('id')
    id: string,
  ) {
    try {
      const task = await this.completeTaskUseCase.execute({
        householdId,
        id,
        userId: user.id,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'tasks',
        action: 'completed',
        entityId: task.id,
        changedByUserId: user.id,
        payload: task,
      });

      return task;
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Öffnet eine erledigte Aufgabe erneut und veröffentlicht die Änderung in Echtzeit.
   */
  @Patch(':id/reopen')
  async reopen(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('id')
    id: string,
  ) {
    try {
      const task = await this.reopenTaskUseCase.execute({
        householdId,
        id,
        userId: user.id,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'tasks',
        action: 'reopened',
        entityId: task.id,
        changedByUserId: user.id,
        payload: task,
      });

      return task;
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Ändert den Titel einer Aufgabe.
   */
  @Patch(':id')
  async updateTitle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('id')
    id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    try {
      const task = await this.updateTaskTitleUseCase.execute({
        householdId,
        id,
        title: dto.title,
        deadline: dto.deadline,
        recurrence: dto.recurrence,
        userId: user.id,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'tasks',
        action: 'updated',
        entityId: task.id,
        changedByUserId: user.id,
        payload: task,
      });

      return task;
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Löscht eine Aufgabe und veröffentlicht die Änderung in Echtzeit.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('id')
    id: string,
  ): Promise<void> {
    try {
      await this.deleteTaskUseCase.execute({
        householdId,
        id,
        userId: user.id,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'tasks',
        action: 'deleted',
        entityId: id,
        changedByUserId: user.id,
        payload: { id },
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Übersetzt fachliche Fehler in passende HTTP-Fehler.
   */
  private throwHttpError(error: unknown): never {
    if (error instanceof HouseholdAccessDeniedError) {
      throw new ForbiddenException(error.message);
    }

    if (error instanceof HouseholdNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof TaskNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (
      error instanceof Error &&
      (error.message === 'Der Aufgabentitel darf nicht leer sein.' ||
        error.message === 'Die Deadline der Aufgabe ist ungültig.' ||
        error.message === 'Die Wiederholung der Aufgabe ist ungültig.' ||
        error.message ===
          'Wiederkehrende Aufgaben benötigen eine gültige Deadline.')
    ) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
