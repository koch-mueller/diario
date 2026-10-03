import { IsISO8601, IsOptional } from 'class-validator';

/**
 * Validiert den optionalen Zeitraum zum Filtern von Kalendereinträgen.
 */
export class ListCalendarEventsQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
