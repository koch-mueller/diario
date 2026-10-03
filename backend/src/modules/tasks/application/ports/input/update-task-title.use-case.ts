import type { Task, TaskRecurrence } from '../../../domain/task';

export const UPDATE_TASK_TITLE_USE_CASE = Symbol('UPDATE_TASK_TITLE_USE_CASE');

export interface UpdateTaskTitleCommand {
  householdId: string;
  id: string;
  title: string;
  userId: string;
  deadline?: string | null;
  recurrence?: TaskRecurrence;
}

export interface UpdateTaskTitleUseCase {
  execute(command: UpdateTaskTitleCommand): Promise<Task>;
}
