import {
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
import { BudgetEntryNotFoundError } from '../../../application/errors/budget-entry-not-found.error';
import {
  CREATE_BUDGET_ENTRY_USE_CASE,
  type CreateBudgetEntryUseCase,
} from '../../../application/ports/input/create-budget-entry.use-case';
import {
  DELETE_BUDGET_ENTRY_USE_CASE,
  type DeleteBudgetEntryUseCase,
} from '../../../application/ports/input/delete-budget-entry.use-case';
import {
  GET_BUDGET_SUMMARY_USE_CASE,
  type GetBudgetSummaryUseCase,
} from '../../../application/ports/input/get-budget-summary.use-case';
import {
  LIST_BUDGET_CATEGORIES_USE_CASE,
  type ListBudgetCategoriesUseCase,
} from '../../../application/ports/input/list-budget-categories.use-case';
import {
  LIST_BUDGET_ENTRIES_USE_CASE,
  type ListBudgetEntriesUseCase,
} from '../../../application/ports/input/list-budget-entries.use-case';
import {
  UPDATE_BUDGET_ENTRY_USE_CASE,
  type UpdateBudgetEntryUseCase,
} from '../../../application/ports/input/update-budget-entry.use-case';
import { CreateBudgetEntryDto } from './dto/create-budget-entry.dto';
import { UpdateBudgetEntryDto } from './dto/update-budget-entry.dto';

/**
 * Stellt die REST-Endpunkte für den Budgetplaner bereit.
 */
@Controller('households/:householdId/budget')
@UseGuards(JwtAuthGuard)
export class BudgetPlannerController {
  constructor(
    @Inject(CREATE_BUDGET_ENTRY_USE_CASE)
    private readonly createBudgetEntryUseCase: CreateBudgetEntryUseCase,

    @Inject(LIST_BUDGET_ENTRIES_USE_CASE)
    private readonly listBudgetEntriesUseCase: ListBudgetEntriesUseCase,

    @Inject(LIST_BUDGET_CATEGORIES_USE_CASE)
    private readonly listBudgetCategoriesUseCase: ListBudgetCategoriesUseCase,

    @Inject(GET_BUDGET_SUMMARY_USE_CASE)
    private readonly getBudgetSummaryUseCase: GetBudgetSummaryUseCase,

    @Inject(UPDATE_BUDGET_ENTRY_USE_CASE)
    private readonly updateBudgetEntryUseCase: UpdateBudgetEntryUseCase,

    @Inject(DELETE_BUDGET_ENTRY_USE_CASE)
    private readonly deleteBudgetEntryUseCase: DeleteBudgetEntryUseCase,

    @Optional()
    private readonly realtimeEvents?: RealtimeEventsService,
  ) {}

  /**
   * Erstellt einen Budgeteintrag und veröffentlicht die Änderung in Echtzeit.
   */
  @Post('entries')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Body() dto: CreateBudgetEntryDto,
  ) {
    try {
      const entry = await this.createBudgetEntryUseCase.execute({
        householdId,
        description: dto.description,
        amountCents: dto.amountCents,
        type: dto.type,
        category: dto.category,
        userId: user.id,
        isRecurring: dto.isRecurring,
        bookedAt: dto.bookedAt
          ? new Date(dto.bookedAt)
          : dto.createdAt
            ? new Date(dto.createdAt)
            : undefined,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'budget',
        action: 'created',
        entityId: entry.id,
        changedByUserId: user.id,
        payload: entry,
      });

      return entry;
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Liefert alle Budgeteinträge der ausgewählten Wohnung.
   */
  @Get('entries')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
  ) {
    try {
      return await this.listBudgetEntriesUseCase.execute({
        householdId,
        userId: user.id,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Liefert die gespeicherten Kategorien der Wohnung.
   * @param user Angemeldeter Benutzer.
   * @param householdId ID der Wohnung.
   * @returns Die gespeicherten Kategorien.
   */
  @Get('categories')
  async categories(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
  ) {
    try {
      return await this.listBudgetCategoriesUseCase.execute({
        householdId,
        userId: user.id,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Berechnet und liefert eine Zusammenfassung.
   */
  @Get('summary')
  async summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
  ) {
    try {
      return await this.getBudgetSummaryUseCase.execute({
        householdId,
        userId: user.id,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Aktualisiert einen Budgeteintrag und veröffentlicht die Änderung in Echtzeit.
   */
  @Patch('entries/:entryId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('entryId')
    entryId: string,
    @Body() dto: UpdateBudgetEntryDto,
  ) {
    try {
      const entry = await this.updateBudgetEntryUseCase.execute({
        householdId,
        entryId,
        userId: user.id,
        description: dto.description,
        amountCents: dto.amountCents,
        type: dto.type,
        category: dto.category,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'budget',
        action: 'updated',
        entityId: entry.id,
        changedByUserId: user.id,
        payload: entry,
      });

      return entry;
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Löscht einen Budgeteintrag und veröffentlicht die Änderung in Echtzeit.
   */
  @Delete('entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('entryId')
    entryId: string,
  ): Promise<void> {
    try {
      await this.deleteBudgetEntryUseCase.execute({
        householdId,
        entryId,
        userId: user.id,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'budget',
        action: 'deleted',
        entityId: entryId,
        changedByUserId: user.id,
        payload: { id: entryId },
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

    if (error instanceof BudgetEntryNotFoundError) {
      throw new NotFoundException(error.message);
    }

    throw error;
  }
}
