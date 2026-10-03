import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { tasksApi } from "../api/tasks.api";
import { translationsApi } from "../features/translation/translations.api";
import type { Task, TaskRecurrence } from "../api/types";
import { useTranslation } from "../features/translation/TranslationContext";
import { useHousehold } from "../context/HouseholdContext";
import { useRealtimeReload } from "../realtime/useRealtimeReload";

/**
 * Liefert den übersetzten Aufgabentitel, falls eine Übersetzung vorhanden ist.
 */
function getTaskTitle(task: Task): string {
  return task.displayTitle ?? task.title;
}

/**
 * Wandelt die optionale Deadline in einen sortierbaren Zeitwert um.
 */
function getDeadlineTime(task: Task): number {
  return task.deadline
    ? new Date(task.deadline).getTime()
    : Number.MAX_SAFE_INTEGER;
}

/**
 * Sortiert Aufgaben nach Deadline und berücksichtigt Aufgaben ohne Deadline zuletzt.
 */
function sortTasksByDeadline(tasks: Task[]): Task[] {
  return [...tasks].sort((firstTask, secondTask) => {
    const deadlineDifference =
      getDeadlineTime(firstTask) - getDeadlineTime(secondTask);

    if (deadlineDifference !== 0) {
      return deadlineDifference;
    }

    return (
      new Date(firstTask.createdAt).getTime() -
      new Date(secondTask.createdAt).getTime()
    );
  });
}

/**
 * Prüft, ob eine offene Aufgabe ihre Deadline bereits überschritten hat.
 */
function isTaskOverdue(task: Task): boolean {
  if (task.completed || !task.deadline) {
    return false;
  }

  return new Date(task.deadline).getTime() < Date.now();
}

/**
 * Formatiert die Deadline einer Aufgabe für die deutsche Anzeige.
 */
function formatTaskDeadline(deadline: string | null): string {
  if (!deadline) {
    return "Keine Deadline";
  }

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return "Keine gültige Deadline";
  }

  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Übersetzt die Wiederholungsart in eine verständliche Beschriftung.
 */
function getRecurrenceLabel(recurrence: TaskRecurrence): string | null {
  if (recurrence === "WEEKLY") {
    return "Wöchentlich";
  }

  if (recurrence === "MONTHLY") {
    return "Monatlich";
  }

  return null;
}

/**
 * Zeigt die Aufgaben einer Wohnung an und verwaltet deren Bearbeitung.
 */
export function TasksPage() {
  const { activeHouseholdId, isLoading } = useHousehold();
  const { mode } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("NONE");
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!activeHouseholdId) {
      return;
    }

    setError(null);

    try {
      const loadedTasks = await tasksApi.list(activeHouseholdId);

      if (mode === "original" || loadedTasks.length === 0) {
        setTasks(loadedTasks);
        return;
      }

      const translatedItems = await translationsApi.translateItems(
        activeHouseholdId,
        mode,
        loadedTasks.map((task) => ({
          id: task.id,
          fields: { title: task.title },
        })),
      );
      const translatedById = new Map(
        translatedItems.map((item) => [item.id, item]),
      );

      setTasks(
        loadedTasks.map((task) => ({
          ...task,
          displayTitle: translatedById.get(task.id)?.fields.title ?? task.title,
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "To-dos konnten nicht geladen werden.",
      );
    }
  }, [activeHouseholdId, mode]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useRealtimeReload(() => {
    void loadTasks();
  });

  const openTasks = useMemo(
    () => sortTasksByDeadline(tasks.filter((task) => !task.completed)),
    [tasks],
  );

  const completedTasks = useMemo(
    () => sortTasksByDeadline(tasks.filter((task) => task.completed)),
    [tasks],
  );

  if (!isLoading && !activeHouseholdId) {
    return <Navigate to="/household" replace />;
  }

  /**
   * Erstellt aus den Formulardaten eine neue Aufgabe.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeHouseholdId) {
      return;
    }

    if (recurrence !== "NONE" && !deadline) {
      setError("Wiederkehrende Aufgaben benötigen eine Deadline.");
      return;
    }

    setError(null);

    try {
      await tasksApi.create(activeHouseholdId, {
        title,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        recurrence,
      });
      setTitle("");
      setDeadline("");
      setRecurrence("NONE");
      await loadTasks();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "To-do konnte nicht erstellt werden.",
      );
    }
  }

  /**
   * Wechselt den Erledigt-Status einer Aufgabe.
   */
  async function toggleTask(task: Task) {
    if (!activeHouseholdId) {
      return;
    }

    if (task.completed) {
      await tasksApi.reopen(activeHouseholdId, task.id);
    } else {
      await tasksApi.complete(activeHouseholdId, task.id);
    }

    await loadTasks();
  }

  /**
   * Löscht eine Aufgabe nach Bestätigung.
   */
  async function deleteTask(taskId: string) {
    if (!activeHouseholdId) {
      return;
    }

    await tasksApi.delete(activeHouseholdId, taskId);
    await loadTasks();
  }

  /**
   * Erstellt die Darstellung eines einzelnen Aufgabeneintrags.
   */
  function renderTask(task: Task, done: boolean) {
    const overdue = isTaskOverdue(task);
    const recurrenceLabel = getRecurrenceLabel(task.recurrence);
    const rowClassName = [
      "list-row",
      done ? "list-row--done" : "",
      overdue ? "list-row--overdue" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={rowClassName} key={task.id}>
        <button
          type="button"
          className="check-button"
          onClick={() => void toggleTask(task)}
          aria-label={done ? "Aufgabe wieder öffnen" : "Aufgabe erledigen"}
        >
          {done ? "✓" : "□"}
        </button>
        <span>
          <strong>{getTaskTitle(task)}</strong>
          <small>Fällig: {formatTaskDeadline(task.deadline)}</small>
          {recurrenceLabel ? (
            <small>Wiederholung: {recurrenceLabel}</small>
          ) : null}
        </span>
        <button
          type="button"
          className="icon-button"
          onClick={() => void deleteTask(task.id)}
          aria-label="Aufgabe löschen"
        >
          🗑
        </button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <p className="eyebrow">To-dos</p>
        <h1>Aufgaben</h1>
        <p>
          Erstelle Aufgaben für eure Wohnung, setze eine Deadline und hake sie
          ab.
        </p>
      </section>

      <form className="panel form form--inline" onSubmit={handleSubmit}>
        <label>
          Neue Aufgabe
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Aufgabe"
            required
          />
        </label>
        <label>
          Deadline
          <input
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>
        <label>
          Wiederholung
          <select
            className="task-recurrence-select"
            value={recurrence}
            onChange={(event) =>
              setRecurrence(event.target.value as TaskRecurrence)
            }
          >
            <option value="NONE">Einmalig</option>
            <option value="WEEKLY">Wöchentlich</option>
            <option value="MONTHLY">Monatlich</option>
          </select>
        </label>
        <button type="submit" className="button button--primary">
          Hinzufügen
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="grid grid--two">
        <article className="panel panel--scroll">
          <h2>Offen</h2>
          <div className="list">
            {openTasks.length === 0 ? (
              <p className="muted">Keine offenen Aufgaben.</p>
            ) : null}
            {openTasks.map((task) => renderTask(task, false))}
          </div>
        </article>

        <article className="panel panel--scroll">
          <h2>Erledigt</h2>
          <div className="list">
            {completedTasks.length === 0 ? (
              <p className="muted">Noch nichts erledigt.</p>
            ) : null}
            {completedTasks.map((task) => renderTask(task, true))}
          </div>
        </article>
      </section>
    </div>
  );
}
