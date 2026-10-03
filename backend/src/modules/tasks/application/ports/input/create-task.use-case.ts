import type { Task, TaskRecurrence } from '../../../domain/task';

export const CREATE_TASK_USE_CASE = Symbol('CREATE_TASK_USE_CASE');

export interface CreateTaskCommand {
  householdId: string;
  title: string;
  userId: string;
  deadline?: string | null;
  recurrence?: TaskRecurrence;
}

export interface CreateTaskUseCase {
  execute(command: CreateTaskCommand): Promise<Task>;
}
