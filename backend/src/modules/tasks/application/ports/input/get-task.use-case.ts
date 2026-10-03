import type { Task } from '../../../domain/task';

export const GET_TASK_USE_CASE = Symbol('GET_TASK_USE_CASE');

export interface GetTaskCommand {
  householdId: string;
  id: string;
  userId: string;
}

export interface GetTaskUseCase {
  execute(command: GetTaskCommand): Promise<Task>;
}
