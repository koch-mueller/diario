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
import { HouseholdAccessService } from '../src/modules/households/application/services/household-access.service';
import { CreateHouseholdService } from '../src/modules/households/application/use-cases/create-household.service';
import { DeleteHouseholdService } from '../src/modules/households/application/use-cases/delete-household.service';
import { GetHouseholdService } from '../src/modules/households/application/use-cases/get-household.service';
import { JoinHouseholdService } from '../src/modules/households/application/use-cases/join-household.service';
import { ListHouseholdMembersService } from '../src/modules/households/application/use-cases/list-household-members.service';
import { ListUserHouseholdsService } from '../src/modules/households/application/use-cases/list-user-households.service';
import { Household } from '../src/modules/households/domain/household';
import { HouseholdMember } from '../src/modules/households/domain/household-member';
import { ShoppingListController } from '../src/modules/shopping-list/adapters/input/rest/shopping-list.controller';
import { CREATE_SHOPPING_LIST_ITEM_USE_CASE } from '../src/modules/shopping-list/application/ports/input/create-shopping-list-item.use-case';
import { DELETE_SHOPPING_LIST_ITEM_USE_CASE } from '../src/modules/shopping-list/application/ports/input/delete-shopping-list-item.use-case';
import { LIST_SHOPPING_LIST_ITEMS_USE_CASE } from '../src/modules/shopping-list/application/ports/input/list-shopping-list-items.use-case';
import { UPDATE_SHOPPING_LIST_ITEM_USE_CASE } from '../src/modules/shopping-list/application/ports/input/update-shopping-list-item.use-case';
import {
  SHOPPING_LIST_REPOSITORY,
  type ShoppingListRepositoryPort,
} from '../src/modules/shopping-list/application/ports/output/shopping-list-repository.port';
import { CreateShoppingListItemService } from '../src/modules/shopping-list/application/use-cases/create-shopping-list-item.service';
import { DeleteShoppingListItemService } from '../src/modules/shopping-list/application/use-cases/delete-shopping-list-item.service';
import { ListShoppingListItemsService } from '../src/modules/shopping-list/application/use-cases/list-shopping-list-items.service';
import { UpdateShoppingListItemService } from '../src/modules/shopping-list/application/use-cases/update-shopping-list-item.service';
import { ShoppingListItem } from '../src/modules/shopping-list/domain/shopping-list-item';
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

interface ShoppingListItemResponse {
  id: string;
  householdId: string;
  name: string;
  quantity: string | null;
  isChecked: boolean;
  createdByUserId: string;
  checkedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  checkedAt: string | null;
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

class InMemoryShoppingListRepository implements ShoppingListRepositoryPort {
  private readonly items: ShoppingListItem[] = [];

  save(item: ShoppingListItem): Promise<ShoppingListItem> {
    const existingIndex = this.items.findIndex(
      (existingItem) => existingItem.id === item.id,
    );

    if (existingIndex === -1) {
      this.items.push(item);
    } else {
      this.items[existingIndex] = item;
    }

    return Promise.resolve(item);
  }

  findById(id: string): Promise<ShoppingListItem | null> {
    return Promise.resolve(this.items.find((item) => item.id === id) ?? null);
  }

  findByHouseholdId(householdId: string): Promise<ShoppingListItem[]> {
    return Promise.resolve(
      this.items.filter((item) => item.householdId === householdId),
    );
  }

  deleteById(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);

    if (index !== -1) {
      this.items.splice(index, 1);
    }

    return Promise.resolve();
  }
}

describe('Shopping list API (E2E)', () => {
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
      controllers: [
        AuthController,
        HouseholdsController,
        ShoppingListController,
      ],
      providers: [
        InMemoryUserRepository,
        InMemoryHouseholdRepository,
        HouseholdAccessService,
        InMemoryShoppingListRepository,
        {
          provide: USER_REPOSITORY,
          useExisting: InMemoryUserRepository,
        },
        {
          provide: HOUSEHOLD_REPOSITORY,
          useExisting: InMemoryHouseholdRepository,
        },
        {
          provide: SHOPPING_LIST_REPOSITORY,
          useExisting: InMemoryShoppingListRepository,
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
          provide: CREATE_SHOPPING_LIST_ITEM_USE_CASE,
          useClass: CreateShoppingListItemService,
        },
        {
          provide: LIST_SHOPPING_LIST_ITEMS_USE_CASE,
          useClass: ListShoppingListItemsService,
        },
        {
          provide: UPDATE_SHOPPING_LIST_ITEM_USE_CASE,
          useClass: UpdateShoppingListItemService,
        },
        {
          provide: DELETE_SHOPPING_LIST_ITEM_USE_CASE,
          useClass: DeleteShoppingListItemService,
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

  it('creates, lists, updates and deletes shopping-list items', async () => {
    const user = await register('Marie', 'shopping-marie@example.com');
    const household = await createHousehold(
      user.accessToken,
      'Wohnung am Park',
    );

    const createResponse = await request(httpServer)
      .post(`/api/households/${household.id}/shopping-list/items`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        name: '  Milch  ',
        quantity: '  2 Liter  ',
      })
      .expect(201);

    const createdItem = createResponse.body as ShoppingListItemResponse;
    expect(createdItem.name).toBe('Milch');
    expect(createdItem.quantity).toBe('2 Liter');
    expect(createdItem.isChecked).toBe(false);
    expect(createdItem.createdByUserId).toBe(user.user.id);

    const listResponse = await request(httpServer)
      .get(`/api/households/${household.id}/shopping-list/items`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    const listedItems = listResponse.body as ShoppingListItemResponse[];
    expect(listedItems.map((item) => item.id)).toEqual([createdItem.id]);

    const updateResponse = await request(httpServer)
      .patch(
        `/api/households/${household.id}/shopping-list/items/${createdItem.id}`,
      )
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        quantity: '3 Liter',
        isChecked: true,
      })
      .expect(200);

    const updatedItem = updateResponse.body as ShoppingListItemResponse;
    expect(updatedItem.quantity).toBe('3 Liter');
    expect(updatedItem.isChecked).toBe(true);
    expect(updatedItem.checkedByUserId).toBe(user.user.id);
    expect(updatedItem.checkedAt).toEqual(expect.any(String));

    await request(httpServer)
      .delete(
        `/api/households/${household.id}/shopping-list/items/${createdItem.id}`,
      )
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(204);

    const emptyListResponse = await request(httpServer)
      .get(`/api/households/${household.id}/shopping-list/items`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(emptyListResponse.body).toEqual([]);
  });

  it('rejects shopping-list access without a token', async () => {
    await request(httpServer)
      .get(
        '/api/households/00000000-0000-4000-8000-000000000000/shopping-list/items',
      )
      .expect(401);
  });

  it('rejects shopping-list access for a non-member', async () => {
    const owner = await register('Owner', 'shopping-owner@example.com');
    const stranger = await register(
      'Stranger',
      'shopping-stranger@example.com',
    );
    const household = await createHousehold(
      owner.accessToken,
      'Wohnung am See',
    );

    await request(httpServer)
      .post(`/api/households/${household.id}/shopping-list/items`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .send({
        name: 'Brot',
      })
      .expect(403);
  });

  it('allows a joined member to use the shopping list', async () => {
    const owner = await register('Owner 2', 'shopping-owner-2@example.com');
    const member = await register('Member 2', 'shopping-member-2@example.com');
    const household = await createHousehold(
      owner.accessToken,
      'Wohnung am Wald',
    );

    await request(httpServer)
      .post('/api/households/join')
      .set('Authorization', `Bearer ${member.accessToken}`)
      .send({
        inviteCode: household.inviteCode.toLowerCase(),
      })
      .expect(200);

    const createResponse = await request(httpServer)
      .post(`/api/households/${household.id}/shopping-list/items`)
      .set('Authorization', `Bearer ${member.accessToken}`)
      .send({
        name: 'Kaffee',
      })
      .expect(201);

    const createdItem = createResponse.body as ShoppingListItemResponse;
    expect(createdItem.createdByUserId).toBe(member.user.id);

    const ownerListResponse = await request(httpServer)
      .get(`/api/households/${household.id}/shopping-list/items`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    const items = ownerListResponse.body as ShoppingListItemResponse[];
    expect(items.map((item) => item.name)).toEqual(['Kaffee']);
  });

  it('returns 404 for invalid UUID parameters', async () => {
    const user = await register('UUID User', 'shopping-uuid@example.com');

    await request(httpServer)
      .get('/api/households/not-a-uuid/shopping-list/items')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(404);
  });
});
