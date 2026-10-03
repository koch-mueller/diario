/**
 * Signalisiert, dass eine Aufgabe nicht existiert oder nicht zur Wohnung gehört.
 */
export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Aufgabe mit der ID "${taskId}" wurde nicht gefunden.`);

    this.name = 'TaskNotFoundError';
  }
}
