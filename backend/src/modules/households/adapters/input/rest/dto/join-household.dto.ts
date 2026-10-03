import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

/**
 * Validiert den Einladungscode zum Beitritt in eine Wohnung.
 */
export class JoinHouseholdDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(8, 8)
  @Matches(/^[A-F0-9]{8}$/)
  inviteCode!: string;
}
