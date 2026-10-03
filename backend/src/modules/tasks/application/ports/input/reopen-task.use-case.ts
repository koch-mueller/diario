import type { Task } from '../../../domain/task';

export const REOPEN_TASK_USE_CASE = Symbol('REOPEN_TASK_USE_CASE');

export interface ReopenTaskCommand {
  householdId: string;
  id: string;
  userId: string;
}

export interface ReopenTaskUseCase {
  execute(command: ReopenTaskCommand): Promise<Task>;
}
