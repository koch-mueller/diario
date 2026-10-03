import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import type { TaskRecurrence } from '../../../../domain/task';

const taskRecurrences = ['NONE', 'WEEKLY', 'MONTHLY'] as const;

/**
 * Prüft die Eingaben zum Aktualisieren einer Aufgabe.
 */
export class UpdateTaskDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue === '' ? null : trimmedValue;
  })
  @IsOptional()
  @IsISO8601()
  deadline?: string | null;

  @IsOptional()
  @IsEnum(taskRecurrences)
  recurrence?: TaskRecurrence;
}
