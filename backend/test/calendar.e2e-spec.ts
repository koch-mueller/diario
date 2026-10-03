import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AuthController } from '../src/modules/auth/adapters/input/rest/auth.controller';
import { JwtAuthGuard } from '../src/modules/auth/adapters/input/rest/jwt-auth.guard';
import { BcryptPasswordHasher } from '../src/modules/auth/adapters/output/security/bcrypt-password-hasher';
import { JwtTokenService } from '../src/modules/auth/adapters/output/security/jwt-token.service';
import { LOGIN_USE_CASE } from '../src/modules/auth/application/ports/input/login.use-case';
import { REGISTER_USER_USE_CASE } from '../src/modules/auth/application/ports/input/register-user.use-case';
import { PASSWORD_HASHER } from '../src/modules/auth/application/ports/output/password-hasher.port';
import { TOKEN_SERVICE } from '../src/modules/auth/application/ports/output/token-service.port';
import { LoginService } from '../src/modules/auth/application/use-cases/login.service';
import { RegisterUserService } from '../src/modules/auth/application/use-cases/register-user.service';
import { CalendarController } from '../src/modules/calendar/adapters/input/rest/calendar.controller';
import { CREATE_CALENDAR_EVENT_USE_CASE } from '../src/modules/calendar/application/ports/input/create-calendar-event.use-case';
import { DELETE_CALENDAR_EVENT_USE_CASE } from '../src/modules/calendar/application/ports/input/delete-calendar-event.use-case';
import { GET_CALENDAR_EVENT_USE_CASE } from '../src/modules/calendar/application/ports/input/get-calendar-event.use-case';
import { LIST_CALENDAR_EVENTS_USE_CASE } from '../src/modules/calendar/application/ports/input/list-calendar-events.use-case';
import { UPDATE_CALENDAR_EVENT_USE_CASE } from '../src/modules/calendar/application/ports/input/update-calendar-event.use-case';
import {
  CALENDAR_REPOSITORY,
  type CalendarEventDateRange,
  type CalendarRepositoryPort,
} from '../src/modules/calendar/application/ports/output/calendar-repository.port';
import { CreateCalendarEventService } from '../src/modules/calendar/application/use-cases/create-calendar-event.service';
import { DeleteCalendarEventService } from '../src/modules/calendar/application/use-cases/delete-calendar-event.service';
import { GetCalendarEventService } from '../src/modules/calendar/application/use-cases/get-calendar-event.service';
import { ListCalendarEventsService } from '../src/modules/calendar/application/use-cases/list-calendar-events.service';
import { UpdateCalendarEventService } from '../src/modules/calendar/application/use-cases/update-calendar-event.service';
import { CalendarEvent } from '../src/modules/calendar/domain/calendar-event';
import { HouseholdsController } from '../src/modules/households/adapters/input/rest/households.controller';
import { CREATE_HOUSEHOLD_USE_CASE } from '../src/modules/households/application/ports/input/create-household.use-case';
import { DELETE_HOUSEHOLD_USE_CASE } from '../src/modules/households/application/ports/input/delete-household.use-case';
import { GET_HOUSEHOLD_USE_CASE } from '../src/modules/households/application/ports/input/get-household.use-case';
import { JOIN_HOUSEHOLD_USE_CASE } from '../src/modules/households/application/ports/input/join-household.use-case';
import { LIST_HOUSEHOLD_MEMBERS_USE_CASE } from '../src/modules/households/application/ports/input/list-household-members.use-case';
import { LIST_USER_HOUSEHOLDS_USE_CASE } from '../src/modules/households/application/ports/input/list-user-households.use-case';
import {
  HOUSEHOLD_REPOSITORY,
  type HouseholdRepositoryPort,
} from '../src/modules/households/application/ports/output/household-repository.port';
import { HouseholdAccessService } from '../src/modules/households/application/services/household-access.service';
import { CreateHouseholdService } from '../src/modules/households/application/use-cases/create-household.service';
import { DeleteHouseholdService } from '../src/modules/households/application/use-cases/delete-household.service';
import { GetHouseholdService } from '../src/modules/households/application/use-cases/get-household.service';
import { JoinHouseholdService } from '../src/modules/households/application/use-cases/join-household.service';
import { ListHouseholdMembersService } from '../src/modules/households/application/use-cases/list-household-members.service';
import { ListUserHouseholdsService } from '../src/modules/households/application/use-cases/list-user-households.service';
import { Household } from '../src/modules/households/domain/household';
import { HouseholdMember } from '../src/modules/households/domain/household-member';
import { InMemoryUserRepository } from './support/in-memory-user.repository';
import { USER_REPOSITORY } from '../src/modules/users/application/ports/user-repository.port';

interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

interface HouseholdResponse {
  id: string;
  name: string;
  inviteCode: string;
  createdByUserId: string;
  createdAt: string;
}

interface CalendarEventResponse {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

class InMemoryHouseholdRepository implements HouseholdRepositoryPort {
  private readonly households: Household[] = [];
  private readonly members: HouseholdMember[] = [];

  save(household: Household): Promise<void> {
    const existingIndex = this.households.findIndex(
      (existingHousehold) => existingHousehold.id === household.id,
    );

    if (existingIndex === -1) {
      this.households.push(household);
    } else {
      this.households[existingIndex] = household;
    }

    return Promise.resolve();
  }

  findById(id: string): Promise<Household | null> {
    return Promise.resolve(
      this.households.find((household) => household.id === id) ?? null,
    );
  }

  findByInviteCode(inviteCode: string): Promise<Household | null> {
    return Promise.resolve(
      this.households.find(
        (household) => household.inviteCode === inviteCode.trim().toUpperCase(),
      ) ?? null,
    );
  }

  findByUserId(userId: string): Promise<Household[]> {
    const ids = new Set(
      this.members
        .filter((member) => member.userId === userId)
        .map((member) => member.householdId),
    );

    return Promise.resolve(
      this.households.filter((household) => ids.has(household.id)),
    );
  }

  addMember(member: HouseholdMember): Promise<void> {
    this.members.push(member);

    return Promise.resolve();
  }

  isMember(householdId: string, userId: string): Promise<boolean> {
    return Promise.resolve(
      this.members.some(
        (member) =>
          member.householdId === householdId && member.userId === userId,
      ),
    );
  }

  findMembersByHouseholdId(householdId: string): Promise<HouseholdMember[]> {
    return Promise.resolve(
      this.members.filter((member) => member.householdId === householdId),
    );
  }

  deleteById(householdId: string): Promise<void> {
    const householdIndex = this.households.findIndex(
      (household) => household.id === householdId,
    );

    if (householdIndex !== -1) {
      this.households.splice(householdIndex, 1);
    }

    for (let index = this.members.length - 1; index >= 0; index -= 1) {
      if (this.members[index].householdId === householdId) {
        this.members.splice(index, 1);
      }
    }

    return Promise.resolve();
  }
}

class InMemoryCalendarRepository implements CalendarRepositoryPort {
  private readonly events: CalendarEvent[] = [];

  save(event: CalendarEvent): Promise<CalendarEvent> {
    const existingIndex = this.events.findIndex(
      (existingEvent) => existingEvent.id === event.id,
    );

    if (existingIndex === -1) {
      this.events.push(event);
    } else {
      this.events[existingIndex] = event;
    }

    return Promise.resolve(event);
  }

  findById(id: string): Promise<CalendarEvent | null> {
    return Promise.resolve(
      this.events.find((event) => event.id === id) ?? null,
    );
  }

  findByHouseholdId(
    householdId: string,
    dateRange?: CalendarEventDateRange,
  ): Promise<CalendarEvent[]> {
    const events = this.events
      .filter((event) => event.householdId === householdId)
      .filter((event) => {
        if (dateRange?.from && event.endsAt < dateRange.from) {
          return false;
        }

        if (dateRange?.to && event.startsAt > dateRange.to) {
          return false;
        }

        return true;
      })
      .sort(
        (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
      );

    return Promise.resolve(events);
  }

  deleteById(id: string): Promise<void> {
    const index = this.events.findIndex((event) => event.id === id);

    if (index !== -1) {
      this.events.splice(index, 1);
    }

    return Promise.resolve();
  }
}

describe('Calendar API (E2E)', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'e2e-test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController, HouseholdsController, CalendarController],
      providers: [
        InMemoryUserRepository,
        InMemoryHouseholdRepository,
        HouseholdAccessService,
        InMemoryCalendarRepository,
        {
          provide: USER_REPOSITORY,
          useExisting: InMemoryUserRepository,
        },
        {
          provide: HOUSEHOLD_REPOSITORY,
          useExisting: InMemoryHouseholdRepository,
        },
        {
          provide: CALENDAR_REPOSITORY,
          useExisting: InMemoryCalendarRepository,
        },
        {
          provide: BcryptPasswordHasher,
          useFactory: () => new BcryptPasswordHasher(4),
        },
        JwtTokenService,
        JwtAuthGuard,
        {
          provide: PASSWORD_HASHER,
          useExisting: BcryptPasswordHasher,
        },
        {
          provide: TOKEN_SERVICE,
          useExisting: JwtTokenService,
        },
        {
          provide: REGISTER_USER_USE_CASE,
          useClass: RegisterUserService,
        },
        {
          provide: LOGIN_USE_CASE,
          useClass: LoginService,
        },
        {
          provide: CREATE_HOUSEHOLD_USE_CASE,
          useClass: CreateHouseholdService,
        },
        {
          provide: JOIN_HOUSEHOLD_USE_CASE,
          useClass: JoinHouseholdService,
        },
        {
          provide: LIST_USER_HOUSEHOLDS_USE_CASE,
          useClass: ListUserHouseholdsService,
        },
        {
          provide: GET_HOUSEHOLD_USE_CASE,
          useClass: GetHouseholdService,
        },
        {
          provide: LIST_HOUSEHOLD_MEMBERS_USE_CASE,
          useClass: ListHouseholdMembersService,
        },
        {
          provide: DELETE_HOUSEHOLD_USE_CASE,
          useClass: DeleteHouseholdService,
        },
        {
          provide: CREATE_CALENDAR_EVENT_USE_CASE,
          useClass: CreateCalendarEventService,
        },
        {
          provide: LIST_CALENDAR_EVENTS_USE_CASE,
          useClass: ListCalendarEventsService,
        },
        {
          provide: GET_CALENDAR_EVENT_USE_CASE,
          useClass: GetCalendarEventService,
        },
        {
          provide: UPDATE_CALENDAR_EVENT_USE_CASE,
          useClass: UpdateCalendarEventService,
        },
        {
          provide: DELETE_CALENDAR_EVENT_USE_CASE,
          useClass: DeleteCalendarEventService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  const register = async (
    name: string,
    email: string,
  ): Promise<AuthResponse> => {
    const response = await request(httpServer)
      .post('/api/auth/register')
      .send({
        name,
        email,
        password: 'password123',
      })
      .expect(201);

    return response.body as AuthResponse;
  };

  const createHousehold = async (
    accessToken: string,
    name: string,
  ): Promise<HouseholdResponse> => {
    const response = await request(httpServer)
      .post('/api/households')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name })
      .expect(201);

    return response.body as HouseholdResponse;
  };

  it('creates, lists, reads, updates and deletes calendar events', async () => {
    const user = await register('Marie', 'calendar-marie@example.com');
    const household = await createHousehold(
      user.accessToken,
      'Wohnung am Park',
    );

    const createResponse = await request(httpServer)
      .post(`/api/households/${household.id}/calendar/events`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        title: '  WG-Abend  ',
        description: '  Gemeinsam kochen  ',
        location: '  Küche  ',
        startsAt: '2026-08-01T18:00:00.000Z',
        endsAt: '2026-08-01T22:00:00.000Z',
      })
      .expect(201);

    const createdEvent = createResponse.body as CalendarEventResponse;
    expect(createdEvent.title).toBe('WG-Abend');
    expect(createdEvent.description).toBe('Gemeinsam kochen');
    expect(createdEvent.location).toBe('Küche');
    expect(createdEvent.createdByUserId).toBe(user.user.id);

    await request(httpServer)
      .post(`/api/households/${household.id}/calendar/events`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        title: 'Putzplan',
        startsAt: '2026-09-01T10:00:00.000Z',
        endsAt: '2026-09-01T11:00:00.000Z',
      })
      .expect(201);

    const listResponse = await request(httpServer)
      .get(`/api/households/${household.id}/calendar/events`)
      .query({
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.000Z',
      })
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    const listedEvents = listResponse.body as CalendarEventResponse[];
    expect(listedEvents.map((event) => event.title)).toEqual(['WG-Abend']);

    const getResponse = await request(httpServer)
      .get(`/api/households/${household.id}/calendar/events/${createdEvent.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect((getResponse.body as CalendarEventResponse).id).toBe(
      createdEvent.id,
    );

    const updateResponse = await request(httpServer)
      .patch(
        `/api/households/${household.id}/calendar/events/${createdEvent.id}`,
      )
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        title: 'WG-Abend mit Essen',
        isAllDay: false,
      })
      .expect(200);

    const updatedEvent = updateResponse.body as CalendarEventResponse;
    expect(updatedEvent.title).toBe('WG-Abend mit Essen');
    expect(updatedEvent.updatedByUserId).toBe(user.user.id);

    await request(httpServer)
      .delete(
        `/api/households/${household.id}/calendar/events/${createdEvent.id}`,
      )
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(204);

    await request(httpServer)
      .get(`/api/households/${household.id}/calendar/events/${createdEvent.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(404);
  });

  it('rejects calendar access without token', async () => {
    await request(httpServer)
      .get(
        '/api/households/00000000-0000-4000-8000-000000000001/calendar/events',
      )
      .expect(401);
  });

  it('rejects calendar access for a non-member', async () => {
    const owner = await register('Owner', 'calendar-owner@example.com');
    const stranger = await register(
      'Stranger',
      'calendar-stranger@example.com',
    );
    const household = await createHousehold(
      owner.accessToken,
      'Private Wohnung',
    );

    await request(httpServer)
      .post(`/api/households/${household.id}/calendar/events`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .send({
        title: 'Fremder Termin',
        startsAt: '2026-08-01T10:00:00.000Z',
        endsAt: '2026-08-01T11:00:00.000Z',
      })
      .expect(403);
  });

  it('allows a joined member to use the household calendar', async () => {
    const owner = await register('Owner', 'calendar-owner-2@example.com');
    const member = await register('Member', 'calendar-member@example.com');
    const household = await createHousehold(owner.accessToken, 'WG Kalender');

    await request(httpServer)
      .post('/api/households/join')
      .set('Authorization', `Bearer ${member.accessToken}`)
      .send({
        inviteCode: household.inviteCode,
      })
      .expect(200);

    await request(httpServer)
      .post(`/api/households/${household.id}/calendar/events`)
      .set('Authorization', `Bearer ${member.accessToken}`)
      .send({
        title: 'Termin vom Mitglied',
        startsAt: '2026-08-01T10:00:00.000Z',
        endsAt: '2026-08-01T11:00:00.000Z',
      })
      .expect(201);
  });

  it('rejects invalid UUIDs and invalid date ranges', async () => {
    const user = await register('UUID Test', 'calendar-uuid@example.com');
    const household = await createHousehold(user.accessToken, 'UUID Wohnung');

    await request(httpServer)
      .get('/api/households/not-a-uuid/calendar/events')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(404);

    await request(httpServer)
      .post(`/api/households/${household.id}/calendar/events`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        title: 'Falsche Zeit',
        startsAt: '2026-08-01T12:00:00.000Z',
        endsAt: '2026-08-01T11:00:00.000Z',
      })
      .expect(400);
  });
});
