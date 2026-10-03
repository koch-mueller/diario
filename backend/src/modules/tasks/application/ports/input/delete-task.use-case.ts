export const DELETE_TASK_USE_CASE = Symbol('DELETE_TASK_USE_CASE');

export interface DeleteTaskCommand {
  householdId: string;
  id: string;
  userId: string;
}

export interface DeleteTaskUseCase {
  execute(command: DeleteTaskCommand): Promise<void>;
}
