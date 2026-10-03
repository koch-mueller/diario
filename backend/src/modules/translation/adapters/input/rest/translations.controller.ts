import {
  BadGatewayException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../../../auth/adapters/input/rest/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/adapters/input/rest/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../../auth/application/authenticated-user';
import { HouseholdAccessDeniedError } from '../../../../households/application/errors/household-access-denied.error';
import { HouseholdNotFoundError } from '../../../../households/application/errors/household-not-found.error';
import { HouseholdAccessService } from '../../../../households/application/services/household-access.service';
import {
  MyMemoryTranslationService,
  TranslationProviderError,
} from '../../output/mymemory/mymemory-translation.service';
import { TranslateItemsDto } from './dto/translate-items.dto';

/**
 * Stellt einen allgemeinen Übersetzungsendpunkt für gemeinsame Wohnungsdaten bereit.
 */
@Controller('households/:householdId/translations')
@UseGuards(JwtAuthGuard)
export class TranslationsController {
  /**
   * Verbindet den Übersetzungsservice mit der Zugriffsprüfung der Wohnung.
   */
  constructor(
    private readonly translationService: MyMemoryTranslationService,
    private readonly householdAccessService: HouseholdAccessService,
  ) {}

  /**
   * Übersetzt die im Request übergebenen Textfelder.
   */
  @Post('items')
  async translateItems(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId')
    householdId: string,
    @Body() dto: TranslateItemsDto,
  ) {
    try {
      await this.householdAccessService.ensureAccess(householdId, user.id);

      return await this.translationService.translateItems(dto.items, dto.mode);
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Wandelt fachliche Fehler in passende HTTP-Fehler um.
   */
  private throwHttpError(error: unknown): never {
    if (error instanceof HouseholdNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof HouseholdAccessDeniedError) {
      throw new ForbiddenException(error.message);
    }

    if (error instanceof TranslationProviderError) {
      throw new BadGatewayException(error.message);
    }

    throw error;
  }
}
