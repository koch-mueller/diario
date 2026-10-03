import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { HouseholdsModule } from '../households/households.module';
import { ShoppingListController } from './adapters/input/rest/shopping-list.controller';
import { ShoppingListItemEntity } from './adapters/output/persistence/shopping-list-item.entity';
import { TypeOrmShoppingListRepository } from './adapters/output/persistence/typeorm-shopping-list.repository';
import { CREATE_SHOPPING_LIST_ITEM_USE_CASE } from './application/ports/input/create-shopping-list-item.use-case';
import { DELETE_SHOPPING_LIST_ITEM_USE_CASE } from './application/ports/input/delete-shopping-list-item.use-case';
import { LIST_SHOPPING_LIST_ITEMS_USE_CASE } from './application/ports/input/list-shopping-list-items.use-case';
import { UPDATE_SHOPPING_LIST_ITEM_USE_CASE } from './application/ports/input/update-shopping-list-item.use-case';
import { SHOPPING_LIST_REPOSITORY } from './application/ports/output/shopping-list-repository.port';
import { CreateShoppingListItemService } from './application/use-cases/create-shopping-list-item.service';
import { DeleteShoppingListItemService } from './application/use-cases/delete-shopping-list-item.service';
import { ListShoppingListItemsService } from './application/use-cases/list-shopping-list-items.service';
import { UpdateShoppingListItemService } from './application/use-cases/update-shopping-list-item.service';

/**
 * Konfiguriert Einkaufsliste, zugehörige Use-Cases und Persistenz.
 */
@Module({
  imports: [
    AuthModule,
    HouseholdsModule,
    TypeOrmModule.forFeature([ShoppingListItemEntity]),
  ],

  controllers: [ShoppingListController],

  providers: [
    TypeOrmShoppingListRepository,

    {
      provide: SHOPPING_LIST_REPOSITORY,
      useExisting: TypeOrmShoppingListRepository,
    },

    {
      provide: CREATE_SHOPPING_LIST_ITEM_USE_CASE,
      useClass: CreateShoppingListItemService,
    },

    {
      provide: LIST_SHOPPING_LIST_ITEMS_USE_CASE,
      useClass: ListShoppingListItemsService,
    },

    {
      provide: UPDATE_SHOPPING_LIST_ITEM_USE_CASE,
      useClass: UpdateShoppingListItemService,
    },

    {
      provide: DELETE_SHOPPING_LIST_ITEM_USE_CASE,
      useClass: DeleteShoppingListItemService,
    },
  ],
})
export class ShoppingListModule {}
