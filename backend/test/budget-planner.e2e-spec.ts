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
import { BudgetPlannerController } from '../src/modules/budget-planner/adapters/input/rest/budget-planner.controller';
import { CREATE_BUDGET_ENTRY_USE_CASE } from '../src/modules/budget-planner/application/ports/input/create-budget-entry.use-case';
import { DELETE_BUDGET_ENTRY_USE_CASE } from '../src/modules/budget-planner/application/ports/input/delete-budget-entry.use-case';
import { GET_BUDGET_SUMMARY_USE_CASE } from '../src/modules/budget-planner/application/ports/input/get-budget-summary.use-case';
import { LIST_BUDGET_CATEGORIES_USE_CASE } from '../src/modules/budget-planner/application/ports/input/list-budget-categories.use-case';
import { LIST_BUDGET_ENTRIES_USE_CASE } from '../src/modules/budget-planner/application/ports/input/list-budget-entries.use-case';
import { UPDATE_BUDGET_ENTRY_USE_CASE } from '../src/modules/budget-planner/application/ports/input/update-budget-entry.use-case';
import {
  BUDGET_REPOSITORY,
  type BudgetRepositoryPort,
} from '../src/modules/budget-planner/application/ports/output/budget-repository.port';
import { CreateBudgetEntryService } from '../src/modules/budget-planner/application/use-cases/create-budget-entry.service';
import { DeleteBudgetEntryService } from '../src/modules/budget-planner/application/use-cases/delete-budget-entry.service';
import { GetBudgetSummaryService } from '../src/modules/budget-planner/application/use-cases/get-budget-summary.service';
import { ListBudgetCategoriesService } from '../src/modules/budget-planner/application/use-cases/list-budget-categories.service';
import { ListBudgetEntriesService } from '../src/modules/budget-planner/application/use-cases/list-budget-entries.service';
import { UpdateBudgetEntryService } from '../src/modules/budget-planner/application/use-cases/update-budget-entry.service';
import { BudgetEntry } from '../src/modules/budget-planner/domain/budget-entry';
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

interface BudgetEntryResponse {
  id: string;
  householdId: string;
  description: string;
  amountCents: number;
  type: 'EXPENSE' | 'INCOME';
  category: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  isRecurring: boolean;
}

interface BudgetSummaryResponse {
  householdId: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  entriesCount: number;
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

class InMemoryBudgetRepository implements BudgetRepositoryPort {
  private readonly entries: BudgetEntry[] = [];
  private readonly categories = new Map<string, Set<string>>();

  save(entry: BudgetEntry): Promise<BudgetEntry> {
    const existingIndex = this.entries.findIndex(
      (existingEntry) => existingEntry.id === entry.id,
    );

    if (existingIndex === -1) {
      this.entries.push(entry);
    } else {
      this.entries[existingIndex] = entry;
    }

    return Promise.resolve(entry);
  }

  findById(id: string): Promise<BudgetEntry | null> {
    return Promise.resolve(
      this.entries.find((entry) => entry.id === id) ?? null,
    );
  }

  findByHouseholdId(householdId: string): Promise<BudgetEntry[]> {
    return Promise.resolve(
      this.entries.filter((entry) => entry.householdId === householdId),
    );
  }

  deleteById(id: string): Promise<void> {
    const index = this.entries.findIndex((entry) => entry.id === id);

    if (index !== -1) {
      this.entries.splice(index, 1);
    }

    return Promise.resolve();
  }

  saveCategory(householdId: string, category: string): Promise<void> {
    const householdCategories = this.categories.get(householdId) ?? new Set();
    householdCategories.add(category);
    this.categories.set(householdId, householdCategories);
    return Promise.resolve();
  }

  findCategoriesByHouseholdId(householdId: string): Promise<string[]> {
    return Promise.resolve(
      [...(this.categories.get(householdId) ?? new Set())].sort(),
    );
  }
}

describe('Budget planner API (E2E)', () => {
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
        BudgetPlannerController,
      ],
      providers: [
        InMemoryUserRepository,
        InMemoryHouseholdRepository,
        HouseholdAccessService,
        InMemoryBudgetRepository,
        {
          provide: USER_REPOSITORY,
          useExisting: InMemoryUserRepository,
        },
        {
          provide: HOUSEHOLD_REPOSITORY,
          useExisting: InMemoryHouseholdRepository,
        },
        {
          provide: BUDGET_REPOSITORY,
          useExisting: InMemoryBudgetRepository,
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
          provide: CREATE_BUDGET_ENTRY_USE_CASE,
          useClass: CreateBudgetEntryService,
        },
        {
          provide: LIST_BUDGET_CATEGORIES_USE_CASE,
          useClass: ListBudgetCategoriesService,
        },
        {
          provide: LIST_BUDGET_ENTRIES_USE_CASE,
          useClass: ListBudgetEntriesService,
        },
        {
          provide: GET_BUDGET_SUMMARY_USE_CASE,
          useClass: GetBudgetSummaryService,
        },
        {
          provide: UPDATE_BUDGET_ENTRY_USE_CASE,
          useClass: UpdateBudgetEntryService,
        },
        {
          provide: DELETE_BUDGET_ENTRY_USE_CASE,
          useClass: DeleteBudgetEntryService,
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

  it('creates, lists, summarizes, updates and deletes budget entries', async () => {
    const user = await register('Marie', 'budget-marie@example.com');
    const household = await createHousehold(
      user.accessToken,
      'Wohnung am Park',
    );

    const incomeResponse = await request(httpServer)
      .post(`/api/households/${household.id}/budget/entries`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        description: '  Haushaltsgeld  ',
        amountCents: 10000,
        type: 'INCOME',
        category: '  Einzahlung  ',
      })
      .expect(201);

    const income = incomeResponse.body as BudgetEntryResponse;
    expect(income.description).toBe('Haushaltsgeld');
    expect(income.amountCents).toBe(10000);
    expect(income.type).toBe('INCOME');
    expect(income.category).toBe('Einzahlung');
    expect(income.createdByUserId).toBe(user.user.id);

    const expenseResponse = await request(httpServer)
      .post(`/api/households/${household.id}/budget/entries`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        description: 'Einkauf',
        amountCents: 4250,
        category: 'Lebensmittel',
      })
      .expect(201);

    const expense = expenseResponse.body as BudgetEntryResponse;
    expect(expense.type).toBe('EXPENSE');

    const listResponse = await request(httpServer)
      .get(`/api/households/${household.id}/budget/entries`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    const entries = listResponse.body as BudgetEntryResponse[];
    expect(entries.map((entry) => entry.description)).toEqual([
      'Haushaltsgeld',
      'Einkauf',
    ]);

    const summaryResponse = await request(httpServer)
      .get(`/api/households/${household.id}/budget/summary`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    const summary = summaryResponse.body as BudgetSummaryResponse;
    expect(summary).toEqual({
      householdId: household.id,
      incomeCents: 10000,
      expenseCents: 4250,
      balanceCents: 5750,
      entriesCount: 2,
    });

    const updateResponse = await request(httpServer)
      .patch(`/api/households/${household.id}/budget/entries/${expense.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        description: 'Wocheneinkauf',
        amountCents: 4500,
      })
      .expect(200);

    const updatedExpense = updateResponse.body as BudgetEntryResponse;
    expect(updatedExpense.description).toBe('Wocheneinkauf');
    expect(updatedExpense.amountCents).toBe(4500);
    expect(updatedExpense.updatedByUserId).toBe(user.user.id);

    await request(httpServer)
      .delete(`/api/households/${household.id}/budget/entries/${income.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(204);

    const finalSummaryResponse = await request(httpServer)
      .get(`/api/households/${household.id}/budget/summary`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(finalSummaryResponse.body).toEqual({
      householdId: household.id,
      incomeCents: 0,
      expenseCents: 4500,
      balanceCents: -4500,
      entriesCount: 1,
    });
  });

  it('rejects budget access without a token', async () => {
    await request(httpServer)
      .get(
        '/api/households/00000000-0000-4000-8000-000000000000/budget/entries',
      )
      .expect(401);
  });

  it('rejects budget access for a non-member', async () => {
    const owner = await register('Owner', 'budget-owner@example.com');
    const stranger = await register('Stranger', 'budget-stranger@example.com');
    const household = await createHousehold(
      owner.accessToken,
      'Wohnung am See',
    );

    await request(httpServer)
      .post(`/api/households/${household.id}/budget/entries`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .send({
        description: 'Miete',
        amountCents: 80000,
      })
      .expect(403);
  });

  it('allows a joined member to use the budget planner', async () => {
    const owner = await register('Owner 2', 'budget-owner-2@example.com');
    const member = await register('Member 2', 'budget-member-2@example.com');
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
      .post(`/api/households/${household.id}/budget/entries`)
      .set('Authorization', `Bearer ${member.accessToken}`)
      .send({
        description: 'Internet',
        amountCents: 3000,
      })
      .expect(201);

    const createdEntry = createResponse.body as BudgetEntryResponse;
    expect(createdEntry.createdByUserId).toBe(member.user.id);

    const ownerListResponse = await request(httpServer)
      .get(`/api/households/${household.id}/budget/entries`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    const entries = ownerListResponse.body as BudgetEntryResponse[];
    expect(entries.map((entry) => entry.description)).toEqual(['Internet']);
  });

  it('stores recurring entries and categories in the backend', async () => {
    const user = await register(
      'Recurring User',
      'recurring-budget@example.com',
    );
    const household = await createHousehold(
      user.accessToken,
      'Wohnung mit Fixkosten',
    );

    const firstResponse = await request(httpServer)
      .post(`/api/households/${household.id}/budget/entries`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        description: 'Miete',
        amountCents: 85000,
        type: 'EXPENSE',
        category: 'Wohnen',
        isRecurring: true,
      })
      .expect(201);

    const recurringEntry = firstResponse.body as BudgetEntryResponse;
    expect(recurringEntry.isRecurring).toBe(true);

    const duplicateResponse = await request(httpServer)
      .post(`/api/households/${household.id}/budget/entries`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        description: 'Miete',
        amountCents: 85000,
        type: 'EXPENSE',
        category: 'Wohnen',
        isRecurring: true,
      })
      .expect(201);

    expect((duplicateResponse.body as BudgetEntryResponse).id).toBe(
      recurringEntry.id,
    );

    const listResponse = await request(httpServer)
      .get(`/api/households/${household.id}/budget/entries`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(listResponse.body).toHaveLength(1);

    const categoriesResponse = await request(httpServer)
      .get(`/api/households/${household.id}/budget/categories`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(categoriesResponse.body).toEqual(['Wohnen']);
  });

  it('returns 404 for invalid values and invalid UUID parameters', async () => {
    const user = await register('UUID User', 'budget-uuid@example.com');

    await request(httpServer)
      .get('/api/households/not-a-uuid/budget/entries')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(404);

    const household = await createHousehold(
      user.accessToken,
      'Wohnung mit Test',
    );

    await request(httpServer)
      .post(`/api/households/${household.id}/budget/entries`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        description: 'A',
        amountCents: 0,
        type: 'WRONG',
      })
      .expect(400);
  });
});
