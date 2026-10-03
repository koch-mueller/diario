import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

import type {
  HouseholdChangedEvent,
  RealtimeAction,
  RealtimeResource,
} from './realtime-event';

/**
 * Veröffentlicht fachliche Änderungen als Socket.IO-Ereignisse in Wohnungsräumen.
 */
@Injectable()
export class RealtimeEventsService {
  private readonly logger = new Logger(RealtimeEventsService.name);
  private server?: Server;

  /**
   * Speichert die Socket.IO-Serverinstanz für spätere Realtime-Nachrichten.
   */
  attachServer(server: Server): void {
    this.server = server;
  }

  /**
   * Erzeugt den Namen des Socket.IO-Raums einer Wohnung.
   */
  householdRoom(householdId: string): string {
    return `household:${householdId}`;
  }

  /**
   * Veröffentlicht eine Änderung innerhalb einer Wohnung.
   */
  publishHouseholdChanged(
    event: Omit<HouseholdChangedEvent, 'occurredAt'> & {
      occurredAt?: string;
    },
  ): void {
    const payload: HouseholdChangedEvent = {
      ...event,
      occurredAt: event.occurredAt ?? new Date().toISOString(),
    };

    if (!this.server) {
      this.logger.warn(
        `Realtime-Server ist noch nicht bereit. Event wurde nicht gesendet: ${payload.resource}:${payload.action}`,
      );

      return;
    }

    const room = this.householdRoom(payload.householdId);

    this.server.to(room).emit('household:changed', payload);

    const specificEventName = this.getSpecificEventName(
      payload.resource,
      payload.action,
    );

    if (!specificEventName || specificEventName === 'household:changed') {
      return;
    }

    this.server.to(room).emit(specificEventName, payload.payload ?? payload);
  }

  /**
   * Leitet aus einem allgemeinen Realtime-Ereignis den konkreten Socket.IO-Ereignisnamen ab.
   */
  private getSpecificEventName(
    resource: RealtimeResource,
    action: RealtimeAction,
  ): string | null {
    if (resource === 'tasks') {
      if (action === 'created') {
        return 'task:created';
      }

      if (
        action === 'updated' ||
        action === 'completed' ||
        action === 'reopened'
      ) {
        return 'task:updated';
      }

      if (action === 'deleted') {
        return 'task:deleted';
      }
    }

    if (resource === 'shopping-list') {
      if (action === 'created') {
        return 'shopping-list:item-created';
      }

      if (action === 'updated') {
        return 'shopping-list:item-updated';
      }

      if (action === 'deleted') {
        return 'shopping-list:item-deleted';
      }
    }

    if (resource === 'budget') {
      if (action === 'created') {
        return 'budget:created';
      }

      if (action === 'updated') {
        return 'budget:updated';
      }

      if (action === 'deleted') {
        return 'budget:deleted';
      }
    }

    if (resource === 'calendar') {
      if (action === 'created') {
        return 'calendar:event-created';
      }

      if (action === 'updated') {
        return 'calendar:event-updated';
      }

      if (action === 'deleted') {
        return 'calendar:event-deleted';
      }
    }

    return null;
  }
}
