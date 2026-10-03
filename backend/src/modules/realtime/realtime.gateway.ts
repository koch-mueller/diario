import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import type { AuthenticatedUser } from '../auth/application/authenticated-user';
import {
  TOKEN_SERVICE,
  type TokenServicePort,
} from '../auth/application/ports/output/token-service.port';
import {
  HOUSEHOLD_REPOSITORY,
  type HouseholdRepositoryPort,
} from '../households/application/ports/output/household-repository.port';
import { RealtimeEventsService } from './realtime-events.service';

type RealtimeUser = AuthenticatedUser;

type RealtimeSocketData = {
  user?: RealtimeUser;
  joinedHouseholds?: Set<string>;
};

type JoinHouseholdPayload = {
  householdId: string;
};

type LeaveHouseholdPayload = {
  householdId: string;
};

type RealtimeSuccessResponse = {
  success: true;
  householdId?: string;
};

type RealtimeErrorResponse = {
  success: false;
  message: string;
};

type RealtimeResponse = RealtimeSuccessResponse | RealtimeErrorResponse;

type ServerToClientEvents = {
  'connection:ready': (payload: { userId: string }) => void;
  'household:joined': (payload: { householdId: string }) => void;
  'household:left': (payload: { householdId: string }) => void;
  'household:changed': (payload: unknown) => void;

  'task:created': (payload: unknown) => void;
  'task:updated': (payload: unknown) => void;
  'task:deleted': (payload: unknown) => void;

  'shopping-list:item-created': (payload: unknown) => void;
  'shopping-list:item-updated': (payload: unknown) => void;
  'shopping-list:item-deleted': (payload: unknown) => void;

  'budget:created': (payload: unknown) => void;
  'budget:updated': (payload: unknown) => void;
  'budget:deleted': (payload: unknown) => void;

  'calendar:event-created': (payload: unknown) => void;
  'calendar:event-updated': (payload: unknown) => void;
  'calendar:event-deleted': (payload: unknown) => void;

  error: (payload: { message: string }) => void;
};

type ClientToServerEvents = {
  'household:join': (payload: JoinHouseholdPayload) => void;
  'household:leave': (payload: LeaveHouseholdPayload) => void;
  ping: () => void;
};

type InterServerEvents = Record<string, never>;

type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  RealtimeSocketData
>;

type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  RealtimeSocketData
>;

/**
 * Verwaltet authentifizierte WebSocket-Verbindungen und Wohnungsräume.
 */
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: RealtimeServer;
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,

    @Inject(HOUSEHOLD_REPOSITORY)
    private readonly householdRepository: HouseholdRepositoryPort,

    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  /**
   * Übergibt dem Realtime-Service die gestartete Socket.IO-Serverinstanz.
   */
  afterInit(server: RealtimeServer): void {
    this.realtimeEvents.attachServer(server);

    server.use((client, next) => {
      void this.authenticateSocket(client)
        .then(() => {
          next();
        })
        .catch(() => {
          next(new Error('Unauthorized'));
        });
    });
  }

  /**
   * Authentifiziert eine neu aufgebaute WebSocket-Verbindung.
   */
  handleConnection(client: RealtimeSocket): void {
    const user = this.getAuthenticatedUser(client);

    client.data.joinedHouseholds = new Set<string>();

    client.emit('connection:ready', {
      userId: user.id,
    });
  }

  /**
   * Entfernt beim Verbindungsabbruch die gespeicherte Wohnungszuordnung des Clients.
   */
  async handleDisconnect(client: RealtimeSocket): Promise<void> {
    const joinedHouseholds = client.data.joinedHouseholds;

    if (!joinedHouseholds) {
      return;
    }

    for (const householdId of joinedHouseholds) {
      await client.leave(this.getHouseholdRoom(householdId));
    }

    joinedHouseholds.clear();
  }

  /**
   * Prüft den Wohnungszugriff und fügt den Client dem zugehörigen Socket.IO-Raum hinzu.
   */
  @SubscribeMessage('household:join')
  async handleJoinHousehold(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() payload: unknown,
  ): Promise<RealtimeResponse> {
    const user = this.getAuthenticatedUser(client);
    const householdId = this.extractHouseholdId(payload);

    if (!householdId) {
      return {
        success: false,
        message: 'householdId fehlt.',
      };
    }

    const isMember = await this.householdRepository.isMember(
      householdId,
      user.id,
    );

    if (!isMember) {
      return {
        success: false,
        message: 'Du bist kein Mitglied dieser Wohnung.',
      };
    }

    await client.join(this.getHouseholdRoom(householdId));

    client.data.joinedHouseholds ??= new Set<string>();
    client.data.joinedHouseholds.add(householdId);

    client.emit('household:joined', {
      householdId,
    });

    return {
      success: true,
      householdId,
    };
  }

  /**
   * Entfernt den Client aus dem aktuell verbundenen Wohnungsraum.
   */
  @SubscribeMessage('household:leave')
  async handleLeaveHousehold(
    @ConnectedSocket() client: RealtimeSocket,
    @MessageBody() payload: unknown,
  ): Promise<RealtimeResponse> {
    this.getAuthenticatedUser(client);

    const householdId = this.extractHouseholdId(payload);

    if (!householdId) {
      return {
        success: false,
        message: 'householdId fehlt.',
      };
    }

    await client.leave(this.getHouseholdRoom(householdId));

    client.data.joinedHouseholds?.delete(householdId);

    client.emit('household:left', {
      householdId,
    });

    return {
      success: true,
      householdId,
    };
  }

  /**
   * Beantwortet einen Ping des Clients zur Prüfung der WebSocket-Verbindung.
   */
  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: RealtimeSocket,
  ): RealtimeSuccessResponse {
    this.getAuthenticatedUser(client);

    return {
      success: true,
    };
  }

  /**
   * Prüft den JWT einer neu aufgebauten WebSocket-Verbindung.
   */
  private async authenticateSocket(client: RealtimeSocket): Promise<void> {
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Unauthorized');
    }

    const user = await this.tokenService.verify(token);

    client.data.user = user;
  }

  /**
   * Liest den Zugriffstoken aus Handshake oder Authorization-Header.
   */
  private extractToken(client: RealtimeSocket): string | null {
    const auth: unknown = client.handshake.auth;

    if (this.isRecord(auth)) {
      const token = auth.token;

      if (typeof token === 'string' && token.trim().length > 0) {
        return token;
      }
    }

    const authorizationHeader = client.handshake.headers.authorization;

    if (typeof authorizationHeader !== 'string') {
      return null;
    }

    const [type, token] = authorizationHeader.trim().split(/\s+/);

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  /**
   * Liest den authentifizierten Benutzer aus den Verbindungsdaten des Clients.
   */
  private getAuthenticatedUser(client: RealtimeSocket): RealtimeUser {
    const user = client.data.user;

    if (!user) {
      throw new WsException('Unauthorized');
    }

    return user;
  }

  /**
   * Liest die Wohnungs-ID aus den Verbindungsdaten des Clients.
   */
  private extractHouseholdId(payload: unknown): string | null {
    if (!this.isRecord(payload)) {
      return null;
    }

    const householdId = payload.householdId;

    if (typeof householdId !== 'string' || householdId.trim().length === 0) {
      return null;
    }

    return householdId;
  }

  /**
   * Erzeugt den Socket.IO-Raumnamen für die angegebene Wohnung.
   */
  private getHouseholdRoom(householdId: string): string {
    return `household:${householdId}`;
  }

  /**
   * Prüft, ob ein unbekannter Wert ein objektartiger Datensatz ist.
   */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
