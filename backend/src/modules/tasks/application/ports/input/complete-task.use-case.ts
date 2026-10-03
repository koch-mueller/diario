import { Task } from '../../../domain/task';

export const COMPLETE_TASK_USE_CASE = Symbol('COMPLETE_TASK_USE_CASE');

export interface CompleteTaskCommand {
  householdId: string;
  id: string;
  userId: string;
}

export interface CompleteTaskUseCase {
  execute(command: CompleteTaskCommand): Promise<Task>;
}
