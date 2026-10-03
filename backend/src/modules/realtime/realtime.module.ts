import { Global, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { HouseholdsModule } from '../households/households.module';
import { RealtimeEventsService } from './realtime-events.service';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Konfiguriert WebSocket-Gateway und Verteilung der Realtime-Ereignisse.
 */
@Global()
@Module({
  imports: [AuthModule, HouseholdsModule],
  providers: [RealtimeGateway, RealtimeEventsService],
  exports: [RealtimeEventsService],
})
export class RealtimeModule {}
