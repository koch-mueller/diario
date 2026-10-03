import { Task } from '../../../domain/task';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface TaskRepositoryPort {
  save(task: Task): Promise<Task>;

  findById(id: string): Promise<Task | null>;

  findByHouseholdId(householdId: string): Promise<Task[]>;

  deleteById(id: string): Promise<boolean>;
}
