import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { HouseholdsModule } from '../households/households.module';
import { TranslationsController } from './adapters/input/rest/translations.controller';
import { MyMemoryTranslationService } from './adapters/output/mymemory/mymemory-translation.service';

/**
 * Konfiguriert den Übersetzungsendpunkt und den MyMemory-Übersetzungsdienst.
 */
@Module({
  imports: [AuthModule, HouseholdsModule],
  controllers: [TranslationsController],
  providers: [MyMemoryTranslationService],
})
export class TranslationModule {}
