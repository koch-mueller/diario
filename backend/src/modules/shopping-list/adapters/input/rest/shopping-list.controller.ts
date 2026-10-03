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
import { ShoppingListItemNotFoundError } from '../../../application/errors/shopping-list-item-not-found.error';
import {
  CREATE_SHOPPING_LIST_ITEM_USE_CASE,
  type CreateShoppingListItemUseCase,
} from '../../../application/ports/input/create-shopping-list-item.use-case';
import {
  DELETE_SHOPPING_LIST_ITEM_USE_CASE,
  type DeleteShoppingListItemUseCase,
} from '../../../application/ports/input/delete-shopping-list-item.use-case';
import {
  LIST_SHOPPING_LIST_ITEMS_USE_CASE,
  type ListShoppingListItemsUseCase,
} from '../../../application/ports/input/list-shopping-list-items.use-case';
import {
  UPDATE_SHOPPING_LIST_ITEM_USE_CASE,
  type UpdateShoppingListItemUseCase,
} from '../../../application/ports/input/update-shopping-list-item.use-case';
import { CreateShoppingListItemDto } from './dto/create-shopping-list-item.dto';
import { UpdateShoppingListItemDto } from './dto/update-shopping-list-item.dto';

/**
 * Stellt die REST-Endpunkte für die gemeinsame Einkaufsliste einer Wohnung bereit.
 */
@Controller('households/:householdId/shopping-list/items')
@UseGuards(JwtAuthGuard)
export class ShoppingListController {
  constructor(
    @Inject(CREATE_SHOPPING_LIST_ITEM_USE_CASE)
    private readonly createShoppingListItemUseCase: CreateShoppingListItemUseCase,

    @Inject(LIST_SHOPPING_LIST_ITEMS_USE_CASE)
    private readonly listShoppingListItemsUseCase: ListShoppingListItemsUseCase,

    @Inject(UPDATE_SHOPPING_LIST_ITEM_USE_CASE)
    private readonly updateShoppingListItemUseCase: UpdateShoppingListItemUseCase,

    @Inject(DELETE_SHOPPING_LIST_ITEM_USE_CASE)
    private readonly deleteShoppingListItemUseCase: DeleteShoppingListItemUseCase,

    @Optional()
    private readonly realtimeEvents?: RealtimeEventsService,
  ) {}

  /**
   * Erstellt einen neuen Einkaufslisteneintrag und veröffentlicht die Änderung in Echtzeit.
   */
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Body() dto: CreateShoppingListItemDto,
  ) {
    try {
      const item = await this.createShoppingListItemUseCase.execute({
        householdId,
        name: dto.name,
        quantity: dto.quantity,
        userId: user.id,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'shopping-list',
        action: 'created',
        entityId: item.id,
        changedByUserId: user.id,
        payload: item,
      });

      return item;
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Liefert alle Einkaufslisteneinträge der ausgewählten Wohnung.
   */
  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
  ) {
    try {
      return await this.listShoppingListItemsUseCase.execute({
        householdId,
        userId: user.id,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Aktualisiert einen Einkaufslisteneintrag und veröffentlicht die Änderung in Echtzeit.
   */
  @Patch(':itemId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateShoppingListItemDto,
  ) {
    try {
      const item = await this.updateShoppingListItemUseCase.execute({
        householdId,
        itemId,
        userId: user.id,
        name: dto.name,
        quantity: dto.quantity,
        isChecked: dto.isChecked,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'shopping-list',
        action: 'updated',
        entityId: item.id,
        changedByUserId: user.id,
        payload: item,
      });

      return item;
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Löscht einen Einkaufslisteneintrag und veröffentlicht die Änderung in Echtzeit.
   */
  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    try {
      await this.deleteShoppingListItemUseCase.execute({
        householdId,
        itemId,
        userId: user.id,
      });

      this.realtimeEvents?.publishHouseholdChanged({
        householdId,
        resource: 'shopping-list',
        action: 'deleted',
        entityId: itemId,
        changedByUserId: user.id,
        payload: { id: itemId },
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

    if (error instanceof ShoppingListItemNotFoundError) {
      throw new NotFoundException(error.message);
    }

    throw error;
  }
}
