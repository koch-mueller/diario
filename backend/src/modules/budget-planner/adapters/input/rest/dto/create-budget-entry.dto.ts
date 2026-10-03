import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import type { BudgetEntryType } from '../../../../domain/budget-entry';

const budgetEntryTypes = ['EXPENSE', 'INCOME'] as const;

/**
 * Prüft die Daten zum Erstellen eines Budgeteintrags.
 */
export class CreateBudgetEntryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  description!: string;

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountCents!: number;

  @IsOptional()
  @IsEnum(budgetEntryTypes)
  type?: BudgetEntryType;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? null : trimmedValue;
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  bookedAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  createdAt?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}
