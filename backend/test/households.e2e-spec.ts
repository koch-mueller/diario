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
import { CreateHouseholdService } from '../src/modules/households/application/use-cases/create-household.service';
import { DeleteHouseholdService } from '../src/modules/households/application/use-cases/delete-household.service';
import { GetHouseholdService } from '../src/modules/households/application/use-cases/get-household.service';
import { JoinHouseholdService } from '../src/modules/households/application/use-cases/join-household.service';
import { ListHouseholdMembersService } from '../src/modules/households/application/use-cases/list-household-members.service';
import { ListUserHouseholdsService } from '../src/modules/households/application/use-cases/list-user-households.service';
import { Household } from '../src/modules/households/domain/household';
import { HouseholdMember } from '../src/modules/households/domain/household-member';
import { HouseholdAccessService } from '../src/modules/households/application/services/household-access.service';
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

interface HouseholdMemberResponse {
  id: string;
  householdId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
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

describe('Authentication and households API (E2E)', () => {
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
      controllers: [AuthController, HouseholdsController],
      providers: [
        InMemoryUserRepository,
        InMemoryHouseholdRepository,
        HouseholdAccessService,
        {
          provide: USER_REPOSITORY,
          useExisting: InMemoryUserRepository,
        },
        {
          provide: HOUSEHOLD_REPOSITORY,
          useExisting: InMemoryHouseholdRepository,
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

  it('registers, logs in and returns the current user', async () => {
    const registered = await register('Marie', 'marie@example.com');

    const loginResponse = await request(httpServer)
      .post('/api/auth/login')
      .send({
        email: 'MARIE@example.com',
        password: 'password123',
      })
      .expect(200);

    const loggedIn = loginResponse.body as AuthResponse;
    expect(loggedIn.user.id).toBe(registered.user.id);

    const meResponse = await request(httpServer)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loggedIn.accessToken}`)
      .expect(200);

    expect(meResponse.body).toEqual({
      id: registered.user.id,
      name: 'Marie',
      email: 'marie@example.com',
    });
  });

  it('rejects protected household routes without a token', async () => {
    await request(httpServer).get('/api/households').expect(401);
  });

  it('creates a household, joins it and lists its members', async () => {
    const owner = await register('Owner', 'owner@example.com');
    const member = await register('Member', 'member@example.com');

    const createResponse = await request(httpServer)
      .post('/api/households')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Wohnung am Park' })
      .expect(201);

    const household = createResponse.body as HouseholdResponse;
    expect(household.name).toBe('Wohnung am Park');
    expect(household.createdByUserId).toBe(owner.user.id);

    await request(httpServer)
      .post('/api/households/join')
      .set('Authorization', `Bearer ${member.accessToken}`)
      .send({ inviteCode: household.inviteCode.toLowerCase() })
      .expect(200);

    const listResponse = await request(httpServer)
      .get('/api/households')
      .set('Authorization', `Bearer ${member.accessToken}`)
      .expect(200);

    const listedHouseholds = listResponse.body as HouseholdResponse[];
    expect(listedHouseholds.map((entry) => entry.id)).toContain(household.id);

    const membersResponse = await request(httpServer)
      .get(`/api/households/${household.id}/members`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    const members = membersResponse.body as HouseholdMemberResponse[];
    expect(members).toHaveLength(2);
    expect(members.map((entry) => entry.userId)).toEqual([
      owner.user.id,
      member.user.id,
    ]);
    expect(members.map((entry) => entry.role)).toEqual(['OWNER', 'MEMBER']);
  });

  it('returns 404 for an invalid household UUID', async () => {
    const user = await register('UUID Test', 'uuid@example.com');

    await request(httpServer)
      .get('/api/households/not-a-uuid')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(404);
  });
});
