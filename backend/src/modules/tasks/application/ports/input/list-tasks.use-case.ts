import { Task } from '../../../domain/task';

export const LIST_TASKS_USE_CASE = Symbol('LIST_TASKS_USE_CASE');

export interface ListTasksQuery {
  householdId: string;
  userId: string;
}

export interface ListTasksUseCase {
  execute(query: ListTasksQuery): Promise<Task[]>;
}
