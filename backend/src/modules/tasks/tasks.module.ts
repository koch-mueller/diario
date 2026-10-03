import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { HouseholdsModule } from '../households/households.module';
import { TasksController } from './adapters/input/rest/tasks.controller';
import { TaskEntity } from './adapters/output/persistence/task.entity';
import { TaskRepository } from './adapters/output/persistence/task.repository';
import { COMPLETE_TASK_USE_CASE } from './application/ports/input/complete-task.use-case';
import { CREATE_TASK_USE_CASE } from './application/ports/input/create-task.use-case';
import { DELETE_TASK_USE_CASE } from './application/ports/input/delete-task.use-case';
import { GET_TASK_USE_CASE } from './application/ports/input/get-task.use-case';
import { LIST_TASKS_USE_CASE } from './application/ports/input/list-tasks.use-case';
import { REOPEN_TASK_USE_CASE } from './application/ports/input/reopen-task.use-case';
import { UPDATE_TASK_TITLE_USE_CASE } from './application/ports/input/update-task-title.use-case';
import { TASK_REPOSITORY } from './application/ports/output/task-repository.port';
import { CompleteTaskService } from './application/use-cases/complete-task.service';
import { CreateTaskService } from './application/use-cases/create-task.service';
import { DeleteTaskService } from './application/use-cases/delete-task.service';
import { GetTaskService } from './application/use-cases/get-task.service';
import { ListTasksService } from './application/use-cases/list-tasks.service';
import { ReopenTaskService } from './application/use-cases/reopen-task.service';
import { UpdateTaskTitleService } from './application/use-cases/update-task-title.service';

/**
 * Konfiguriert Aufgaben-Controller, Use-Cases und Persistenz.
 */
@Module({
  imports: [
    AuthModule,
    HouseholdsModule,
    TypeOrmModule.forFeature([TaskEntity]),
  ],

  controllers: [TasksController],

  providers: [
    TaskRepository,

    {
      provide: TASK_REPOSITORY,
      useExisting: TaskRepository,
    },
    {
      provide: CREATE_TASK_USE_CASE,
      useClass: CreateTaskService,
    },
    {
      provide: LIST_TASKS_USE_CASE,
      useClass: ListTasksService,
    },
    {
      provide: GET_TASK_USE_CASE,
      useClass: GetTaskService,
    },
    {
      provide: COMPLETE_TASK_USE_CASE,
      useClass: CompleteTaskService,
    },
    {
      provide: REOPEN_TASK_USE_CASE,
      useClass: ReopenTaskService,
    },
    {
      provide: DELETE_TASK_USE_CASE,
      useClass: DeleteTaskService,
    },
    {
      provide: UPDATE_TASK_TITLE_USE_CASE,
      useClass: UpdateTaskTitleService,
    },
  ],
})
export class TasksModule {}
