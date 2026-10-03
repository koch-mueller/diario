import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Validiert die optionalen Änderungen eines Einkaufslisteneintrags.
 */
export class UpdateShoppingListItemDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

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
  quantity?: string | null;

  @IsOptional()
  @IsBoolean()
  isChecked?: boolean;
}
