import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Validiert die übersetzbaren Textfelder eines Eintrags.
 */
class TranslationFieldsDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  quantity?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

/**
 * Validiert einen Eintrag mit ID und übersetzbaren Textfeldern.
 */
class TranslationItemDto {
  @IsString()
  id!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => TranslationFieldsDto)
  fields!: TranslationFieldsDto;
}

/**
 * Validiert Sprachmodus und Einträge einer Übersetzungsanfrage.
 */
export class TranslateItemsDto {
  @IsIn(['deutsch', 'marie'])
  mode!: 'deutsch' | 'marie';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationItemDto)
  items!: TranslationItemDto[];
}
