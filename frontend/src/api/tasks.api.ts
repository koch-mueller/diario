import { apiFetch } from "./api";
import type { Task, TaskRecurrence } from "./types";

export type TaskPayload = {
  title: string;
  deadline?: string | null;
  recurrence?: TaskRecurrence;
};

export const tasksApi = {
  /**
   * Lädt alle Aufgaben der ausgewählten Wohnung.
   */
  list(householdId: string): Promise<Task[]> {
    return apiFetch<Task[]>(`/households/${householdId}/tasks`);
  },

  /**
   * Erstellt eine neue Aufgabe in der ausgewählten Wohnung.
   */
  create(householdId: string, payload: TaskPayload): Promise<Task> {
    return apiFetch<Task>(`/households/${householdId}/tasks`, {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Aktualisiert Titel, Deadline und Wiederholung einer Aufgabe.
   */
  rename(
    householdId: string,
    taskId: string,
    payload: TaskPayload,
  ): Promise<Task> {
    return apiFetch<Task>(`/households/${householdId}/tasks/${taskId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  /**
   * Markiert eine Aufgabe als erledigt.
   */
  complete(householdId: string, taskId: string): Promise<Task> {
    return apiFetch<Task>(
      `/households/${householdId}/tasks/${taskId}/complete`,
      { method: "PATCH" },
    );
  },

  /**
   * Öffnet eine erledigte Aufgabe erneut.
   */
  reopen(householdId: string, taskId: string): Promise<Task> {
    return apiFetch<Task>(`/households/${householdId}/tasks/${taskId}/reopen`, {
      method: "PATCH",
    });
  },

  /**
   * Löscht die angegebene Aufgabe.
   */
  delete(householdId: string, taskId: string): Promise<void> {
    return apiFetch<void>(`/households/${householdId}/tasks/${taskId}`, {
      method: "DELETE",
    });
  },
};
