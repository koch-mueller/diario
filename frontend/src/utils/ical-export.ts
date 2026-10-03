import type { CalendarEvent } from "../api/types";
import type { GermanHoliday } from "./german-holidays";

type ExportCalendarItem = CalendarEvent | GermanHoliday;

/**
 * Maskiert Sonderzeichen für das iCalendar-Format.
 */
function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

/**
 * Formatiert einen Zeitpunkt als UTC-Wert für das iCalendar-Format.
 */
function formatUtcDateTime(value: string): string {
  return new Date(value)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

/**
 * Formatiert ein Datum als ganztägigen iCalendar-Datumswert.
 */
function formatDateOnly(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

/**
 * Gibt den Folgetag eines Datums zurück.
 */
function addOneDay(value: string): string {
  const date = new Date(value);
  date.setDate(date.getDate() + 1);

  return date.toISOString();
}

/**
 * Teilt zu lange iCalendar-Zeilen nach dem Standard auf.
 */
function foldIcsLine(line: string): string {
  const maxLength = 73;

  if (line.length <= maxLength) {
    return line;
  }

  const parts: string[] = [];
  let current = line;

  while (current.length > maxLength) {
    parts.push(current.slice(0, maxLength));
    current = ` ${current.slice(maxLength)}`;
  }

  parts.push(current);

  return parts.join("\r\n");
}

/**
 * Liefert den sichtbaren Titel für den Kalenderexport.
 */
function getExportTitle(item: ExportCalendarItem): string {
  return "displayTitle" in item && item.displayTitle
    ? item.displayTitle
    : item.title;
}

/**
 * Erzeugt die optionale Beschreibung für den Kalenderexport.
 */
function getExportDescription(item: ExportCalendarItem): string | null {
  if (!("description" in item)) {
    return null;
  }

  const description = item.displayDescription ?? item.description;

  if (item.originalTitle && item.originalTitle !== getExportTitle(item)) {
    const originalText = `Original: ${item.originalTitle}`;

    return description ? `${description}\n${originalText}` : originalText;
  }

  return description;
}

/**
 * Liefert den optionalen Ort für den Kalenderexport.
 */
function getExportLocation(item: ExportCalendarItem): string | null {
  return "location" in item ? (item.displayLocation ?? item.location) : null;
}

/**
 * Erstellt die iCalendar-Zeilen für einen Termin.
 */
function buildEventLines(item: ExportCalendarItem): string[] {
  const description = getExportDescription(item);
  const location = getExportLocation(item);
  const uid = `diario-${item.id}@diario.local`;

  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatUtcDateTime(new Date().toISOString())}`,
    `SUMMARY:${escapeIcsText(getExportTitle(item))}`,
  ];

  if (item.isAllDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(item.startsAt)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDateOnly(addOneDay(item.startsAt))}`);
  } else {
    lines.push(`DTSTART:${formatUtcDateTime(item.startsAt)}`);
    lines.push(`DTEND:${formatUtcDateTime(item.endsAt)}`);
  }

  if (description) {
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  }

  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }

  lines.push("END:VEVENT");

  return lines;
}

/**
 * Erstellt den vollständigen Inhalt einer iCalendar-Datei.
 */
export function buildIcsCalendar(items: ExportCalendarItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//Diario//Calendar Export//DE",
    "X-WR-CALNAME:Diario",
    ...items.flatMap((item) => buildEventLines(item)),
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

/**
 * Erzeugt eine iCalendar-Datei und startet den Download.
 */
export function downloadIcsFile(
  filename: string,
  items: ExportCalendarItem[],
): void {
  const content = buildIcsCalendar(items);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
