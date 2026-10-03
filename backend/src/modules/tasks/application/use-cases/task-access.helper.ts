import type { Task } from '../../domain/task';
import { TaskNotFoundError } from '../errors/task-not-found.error';

/**
 * Stellt sicher, dass die Aufgabe existiert und zur angegebenen Wohnung gehört.
 */
export function ensureTaskBelongsToHousehold(
  task: Task | null,
  householdId: string,
  taskId: string,
): Task {
  if (!task || task.householdId !== householdId) {
    throw new TaskNotFoundError(taskId);
  }

  return task;
}
