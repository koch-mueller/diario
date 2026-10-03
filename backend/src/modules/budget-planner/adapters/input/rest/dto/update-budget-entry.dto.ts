import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
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
 * Validiert die optionalen Änderungen eines Budgeteintrags.
 */
export class UpdateBudgetEntryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountCents?: number;

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
}
