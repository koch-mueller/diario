import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { HouseholdsModule } from '../households/households.module';
import { BudgetPlannerController } from './adapters/input/rest/budget-planner.controller';
import { BudgetCategoryEntity } from './adapters/output/persistence/budget-category.entity';
import { BudgetEntryEntity } from './adapters/output/persistence/budget-entry.entity';
import { TypeOrmBudgetRepository } from './adapters/output/persistence/typeorm-budget.repository';
import { CREATE_BUDGET_ENTRY_USE_CASE } from './application/ports/input/create-budget-entry.use-case';
import { DELETE_BUDGET_ENTRY_USE_CASE } from './application/ports/input/delete-budget-entry.use-case';
import { GET_BUDGET_SUMMARY_USE_CASE } from './application/ports/input/get-budget-summary.use-case';
import { LIST_BUDGET_CATEGORIES_USE_CASE } from './application/ports/input/list-budget-categories.use-case';
import { LIST_BUDGET_ENTRIES_USE_CASE } from './application/ports/input/list-budget-entries.use-case';
import { UPDATE_BUDGET_ENTRY_USE_CASE } from './application/ports/input/update-budget-entry.use-case';
import { BUDGET_REPOSITORY } from './application/ports/output/budget-repository.port';
import { CreateBudgetEntryService } from './application/use-cases/create-budget-entry.service';
import { DeleteBudgetEntryService } from './application/use-cases/delete-budget-entry.service';
import { GetBudgetSummaryService } from './application/use-cases/get-budget-summary.service';
import { ListBudgetCategoriesService } from './application/use-cases/list-budget-categories.service';
import { ListBudgetEntriesService } from './application/use-cases/list-budget-entries.service';
import { UpdateBudgetEntryService } from './application/use-cases/update-budget-entry.service';

/**
 * Konfiguriert Budgetplaner, zugehörige Use-Cases und Persistenz.
 */
@Module({
  imports: [
    AuthModule,
    HouseholdsModule,
    TypeOrmModule.forFeature([BudgetEntryEntity, BudgetCategoryEntity]),
  ],
  controllers: [BudgetPlannerController],
  providers: [
    TypeOrmBudgetRepository,
    {
      provide: BUDGET_REPOSITORY,
      useExisting: TypeOrmBudgetRepository,
    },
    {
      provide: CREATE_BUDGET_ENTRY_USE_CASE,
      useClass: CreateBudgetEntryService,
    },
    {
      provide: LIST_BUDGET_CATEGORIES_USE_CASE,
      useClass: ListBudgetCategoriesService,
    },
    {
      provide: LIST_BUDGET_ENTRIES_USE_CASE,
      useClass: ListBudgetEntriesService,
    },
    {
      provide: GET_BUDGET_SUMMARY_USE_CASE,
      useClass: GetBudgetSummaryService,
    },
    {
      provide: UPDATE_BUDGET_ENTRY_USE_CASE,
      useClass: UpdateBudgetEntryService,
    },
    {
      provide: DELETE_BUDGET_ENTRY_USE_CASE,
      useClass: DeleteBudgetEntryService,
    },
  ],
})
export class BudgetPlannerModule {}
