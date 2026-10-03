import type { TaskRepositoryPort } from '../../src/modules/tasks/application/ports/output/task-repository.port';
import type { Task } from '../../src/modules/tasks/domain/task';

/**
 * Speichert Aufgaben für E2E-Tests ausschließlich im Arbeitsspeicher.
 */
export class InMemoryTaskRepository implements TaskRepositoryPort {
  private readonly tasks: Task[] = [];

  save(task: Task): Promise<Task> {
    const existingIndex = this.tasks.findIndex(
      (existingTask) => existingTask.id === task.id,
    );

    if (existingIndex === -1) {
      this.tasks.push(task);
    } else {
      this.tasks[existingIndex] = task;
    }

    return Promise.resolve(task);
  }

  findById(id: string): Promise<Task | null> {
    return Promise.resolve(this.tasks.find((task) => task.id === id) ?? null);
  }

  findByHouseholdId(householdId: string): Promise<Task[]> {
    const householdTasks = this.tasks.filter(
      (task) => task.householdId === householdId,
    );

    return Promise.resolve(
      [...householdTasks].sort((firstTask, secondTask) => {
        if (firstTask.completed !== secondTask.completed) {
          return Number(firstTask.completed) - Number(secondTask.completed);
        }

        const firstDeadline =
          firstTask.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const secondDeadline =
          secondTask.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;

        if (firstDeadline !== secondDeadline) {
          return firstDeadline - secondDeadline;
        }

        return firstTask.createdAt.getTime() - secondTask.createdAt.getTime();
      }),
    );
  }

  deleteById(id: string): Promise<boolean> {
    const taskIndex = this.tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
      return Promise.resolve(false);
    }

    this.tasks.splice(taskIndex, 1);

    return Promise.resolve(true);
  }
}
