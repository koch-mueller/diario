import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { JwtAuthGuard } from '../src/modules/auth/adapters/input/rest/jwt-auth.guard';
import {
  TOKEN_SERVICE,
  type TokenServicePort,
} from '../src/modules/auth/application/ports/output/token-service.port';
import { TasksController } from '../src/modules/tasks/adapters/input/rest/tasks.controller';
import { InMemoryTaskRepository } from './support/in-memory-task.repository';
import { COMPLETE_TASK_USE_CASE } from '../src/modules/tasks/application/ports/input/complete-task.use-case';
import { CREATE_TASK_USE_CASE } from '../src/modules/tasks/application/ports/input/create-task.use-case';
import { DELETE_TASK_USE_CASE } from '../src/modules/tasks/application/ports/input/delete-task.use-case';
import { GET_TASK_USE_CASE } from '../src/modules/tasks/application/ports/input/get-task.use-case';
import { LIST_TASKS_USE_CASE } from '../src/modules/tasks/application/ports/input/list-tasks.use-case';
import { REOPEN_TASK_USE_CASE } from '../src/modules/tasks/application/ports/input/reopen-task.use-case';
import { UPDATE_TASK_TITLE_USE_CASE } from '../src/modules/tasks/application/ports/input/update-task-title.use-case';
import { TASK_REPOSITORY } from '../src/modules/tasks/application/ports/output/task-repository.port';
import { CompleteTaskService } from '../src/modules/tasks/application/use-cases/complete-task.service';
import { CreateTaskService } from '../src/modules/tasks/application/use-cases/create-task.service';
import { DeleteTaskService } from '../src/modules/tasks/application/use-cases/delete-task.service';
import { GetTaskService } from '../src/modules/tasks/application/use-cases/get-task.service';
import { ListTasksService } from '../src/modules/tasks/application/use-cases/list-tasks.service';
import { ReopenTaskService } from '../src/modules/tasks/application/use-cases/reopen-task.service';
import { UpdateTaskTitleService } from '../src/modules/tasks/application/use-cases/update-task-title.service';
import {
  HOUSEHOLD_REPOSITORY,
  type HouseholdRepositoryPort,
} from '../src/modules/households/application/ports/output/household-repository.port';
import { HouseholdAccessService } from '../src/modules/households/application/services/household-access.service';
import { Household } from '../src/modules/households/domain/household';
import { HouseholdMember } from '../src/modules/households/domain/household-member';

interface TaskResponse {
  id: string;
  householdId: string;
  title: string;
  completed: boolean;
  createdByUserId: string;
  deadline: string | null;
  recurrence: 'NONE' | 'WEEKLY' | 'MONTHLY';
  nextOccurrenceCreated: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateTaskPayload {
  title: string;
  deadline?: string | null;
  recurrence?: 'NONE' | 'WEEKLY' | 'MONTHLY';
}

const UUID_VERSION_4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UNKNOWN_TASK_ID = '00000000-0000-4000-8000-000000000000';

const userOne = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Marie',
  email: 'marie@example.com',
};

const userTwo = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Thomas',
  email: 'thomas@example.com',
};

const fakeTokenService: TokenServicePort = {
  sign: () => Promise.resolve('unused-token'),

  verify: (token: string) => {
    if (token === 'user-one-token') {
      return Promise.resolve(userOne);
    }

    if (token === 'user-two-token') {
      return Promise.resolve(userTwo);
    }

    return Promise.reject(new Error('invalid token'));
  },
};

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
    const householdIds = new Set(
      this.members
        .filter((member) => member.userId === userId)
        .map((member) => member.householdId),
    );

    return Promise.resolve(
      this.households.filter((household) => householdIds.has(household.id)),
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

describe('Tasks API (E2E)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let householdRepository: InMemoryHouseholdRepository;
  let household: Household;
  let otherHousehold: Household;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TasksController],

      providers: [
        InMemoryTaskRepository,
        InMemoryHouseholdRepository,
        HouseholdAccessService,
        JwtAuthGuard,

        {
          provide: TOKEN_SERVICE,
          useValue: fakeTokenService,
        },
        {
          provide: TASK_REPOSITORY,
          useExisting: InMemoryTaskRepository,
        },
        {
          provide: HOUSEHOLD_REPOSITORY,
          useExisting: InMemoryHouseholdRepository,
        },
        {
          provide: CREATE_TASK_USE_CASE,
          useClass: CreateTaskService,
        },
        {
          provide: LIST_TASKS_USE_CASE,
          useClass: ListTasksService,
        },
        {
          provide: GET_TASK_USE_CASE,
          useClass: GetTaskService,
        },
        {
          provide: UPDATE_TASK_TITLE_USE_CASE,
          useClass: UpdateTaskTitleService,
        },
        {
          provide: COMPLETE_TASK_USE_CASE,
          useClass: CompleteTaskService,
        },
        {
          provide: REOPEN_TASK_USE_CASE,
          useClass: ReopenTaskService,
        },
        {
          provide: DELETE_TASK_USE_CASE,
          useClass: DeleteTaskService,
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

    householdRepository = moduleRef.get(InMemoryHouseholdRepository);

    household = Household.create('Wohnung am Park', userOne.id);
    otherHousehold = Household.create('Andere Wohnung', userTwo.id);

    await householdRepository.save(household);
    await householdRepository.save(otherHousehold);

    await householdRepository.addMember(
      HouseholdMember.create(household.id, userOne.id, 'OWNER'),
    );

    await householdRepository.addMember(
      HouseholdMember.create(otherHousehold.id, userTwo.id, 'OWNER'),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  const authorization = (token = 'user-one-token'): string => `Bearer ${token}`;

  async function createTask(
    title = 'Küche putzen',
    householdId = household.id,
    token = 'user-one-token',
    additionalPayload: Omit<CreateTaskPayload, 'title'> = {},
  ): Promise<TaskResponse> {
    const response = await request(httpServer)
      .post(`/api/households/${householdId}/tasks`)
      .set('Authorization', authorization(token))
      .send({
        title,
        ...additionalPayload,
      })
      .expect(201);

    return response.body as TaskResponse;
  }

  describe('POST /api/households/:householdId/tasks', () => {
    it('erstellt eine Aufgabe für eine Wohnung', async () => {
      const task = await createTask('Küche putzen');

      expect(task.id).toMatch(UUID_VERSION_4);
      expect(task.householdId).toBe(household.id);
      expect(task.title).toBe('Küche putzen');
      expect(task.completed).toBe(false);
      expect(task.createdByUserId).toBe(userOne.id);
      expect(task.deadline).toBeNull();
      expect(task.recurrence).toBe('NONE');
      expect(task.nextOccurrenceCreated).toBe(false);
      expect(task.createdAt).toEqual(expect.any(String));
      expect(task.updatedAt).toEqual(expect.any(String));
    });

    it('lehnt eine Wiederholung ohne Deadline ab', async () => {
      await request(httpServer)
        .post(`/api/households/${household.id}/tasks`)
        .set('Authorization', authorization())
        .send({
          title: 'Müll rausbringen',
          recurrence: 'WEEKLY',
        })
        .expect(400);
    });

    it('lehnt eine Anfrage ohne Token ab', async () => {
      await request(httpServer)
        .post(`/api/households/${household.id}/tasks`)
        .send({
          title: 'Küche putzen',
        })
        .expect(401);
    });

    it('lehnt Zugriff auf eine fremde Wohnung ab', async () => {
      await request(httpServer)
        .post(`/api/households/${otherHousehold.id}/tasks`)
        .set('Authorization', authorization('user-one-token'))
        .send({
          title: 'Darf nicht gehen',
        })
        .expect(403);
    });

    it('lehnt einen leeren Titel ab', async () => {
      await request(httpServer)
        .post(`/api/households/${household.id}/tasks`)
        .set('Authorization', authorization())
        .send({
          title: '   ',
        })
        .expect(400);
    });
  });

  describe('GET /api/households/:householdId/tasks', () => {
    it('liefert zunächst eine leere Liste', async () => {
      const response = await request(httpServer)
        .get(`/api/households/${household.id}/tasks`)
        .set('Authorization', authorization())
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('liefert nur Aufgaben der angefragten Wohnung', async () => {
      await createTask('Küche putzen', household.id, 'user-one-token');
      await createTask('Bad putzen', otherHousehold.id, 'user-two-token');

      const response = await request(httpServer)
        .get(`/api/households/${household.id}/tasks`)
        .set('Authorization', authorization('user-one-token'))
        .expect(200);

      const tasks = response.body as TaskResponse[];

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Küche putzen');
      expect(tasks[0].householdId).toBe(household.id);
    });
  });

  describe('GET /api/households/:householdId/tasks/:id', () => {
    it('liefert eine einzelne Aufgabe', async () => {
      const createdTask = await createTask();

      const response = await request(httpServer)
        .get(`/api/households/${household.id}/tasks/${createdTask.id}`)
        .set('Authorization', authorization())
        .expect(200);

      const task = response.body as TaskResponse;

      expect(task.id).toBe(createdTask.id);
      expect(task.title).toBe(createdTask.title);
    });

    it('liefert 404, wenn die Aufgabe nicht zur Wohnung gehört', async () => {
      const taskFromOtherHousehold = await createTask(
        'Fremde Aufgabe',
        otherHousehold.id,
        'user-two-token',
      );

      await request(httpServer)
        .get(
          `/api/households/${household.id}/tasks/${taskFromOtherHousehold.id}`,
        )
        .set('Authorization', authorization('user-one-token'))
        .expect(404);
    });

    it('liefert 404 bei unbekannter Aufgabe', async () => {
      await request(httpServer)
        .get(`/api/households/${household.id}/tasks/${UNKNOWN_TASK_ID}`)
        .set('Authorization', authorization())
        .expect(404);
    });
  });

  describe('PATCH /api/households/:householdId/tasks/:id', () => {
    it('ändert den Titel einer Aufgabe', async () => {
      const createdTask = await createTask();

      const response = await request(httpServer)
        .patch(`/api/households/${household.id}/tasks/${createdTask.id}`)
        .set('Authorization', authorization())
        .send({
          title: '   Küche gründlich putzen   ',
        })
        .expect(200);

      const updatedTask = response.body as TaskResponse;

      expect(updatedTask.id).toBe(createdTask.id);
      expect(updatedTask.title).toBe('Küche gründlich putzen');
      expect(updatedTask.completed).toBe(false);
    });
  });

  describe('PATCH /api/households/:householdId/tasks/:id/complete', () => {
    it('markiert eine Aufgabe als erledigt', async () => {
      const createdTask = await createTask();

      const response = await request(httpServer)
        .patch(
          `/api/households/${household.id}/tasks/${createdTask.id}/complete`,
        )
        .set('Authorization', authorization())
        .expect(200);

      const completedTask = response.body as TaskResponse;

      expect(completedTask.id).toBe(createdTask.id);
      expect(completedTask.completed).toBe(true);
    });

    it('legt für eine monatliche Aufgabe genau eine Folgeaufgabe an', async () => {
      const createdTask = await createTask(
        'Miete überweisen',
        household.id,
        'user-one-token',
        {
          deadline: '2026-07-31T10:00:00.000Z',
          recurrence: 'MONTHLY',
        },
      );

      const completedResponse = await request(httpServer)
        .patch(
          `/api/households/${household.id}/tasks/${createdTask.id}/complete`,
        )
        .set('Authorization', authorization())
        .expect(200);

      const completedTask = completedResponse.body as TaskResponse;
      expect(completedTask.completed).toBe(true);
      expect(completedTask.nextOccurrenceCreated).toBe(true);

      const firstListResponse = await request(httpServer)
        .get(`/api/households/${household.id}/tasks`)
        .set('Authorization', authorization())
        .expect(200);

      const firstTaskList = firstListResponse.body as TaskResponse[];
      expect(firstTaskList).toHaveLength(2);

      const nextTask = firstTaskList.find((task) => task.id !== createdTask.id);

      expect(nextTask).toBeDefined();
      expect(nextTask?.title).toBe('Miete überweisen');
      expect(nextTask?.completed).toBe(false);
      expect(nextTask?.recurrence).toBe('MONTHLY');
      expect(nextTask?.deadline).toBe('2026-08-31T10:00:00.000Z');

      await request(httpServer)
        .patch(`/api/households/${household.id}/tasks/${createdTask.id}/reopen`)
        .set('Authorization', authorization())
        .expect(200);

      await request(httpServer)
        .patch(
          `/api/households/${household.id}/tasks/${createdTask.id}/complete`,
        )
        .set('Authorization', authorization())
        .expect(200);

      const secondListResponse = await request(httpServer)
        .get(`/api/households/${household.id}/tasks`)
        .set('Authorization', authorization())
        .expect(200);

      expect(secondListResponse.body).toHaveLength(2);
    });
  });

  describe('PATCH /api/households/:householdId/tasks/:id/reopen', () => {
    it('öffnet eine erledigte Aufgabe wieder', async () => {
      const createdTask = await createTask();

      await request(httpServer)
        .patch(
          `/api/households/${household.id}/tasks/${createdTask.id}/complete`,
        )
        .set('Authorization', authorization())
        .expect(200);

      const response = await request(httpServer)
        .patch(`/api/households/${household.id}/tasks/${createdTask.id}/reopen`)
        .set('Authorization', authorization())
        .expect(200);

      const reopenedTask = response.body as TaskResponse;

      expect(reopenedTask.id).toBe(createdTask.id);
      expect(reopenedTask.completed).toBe(false);
    });
  });

  describe('DELETE /api/households/:householdId/tasks/:id', () => {
    it('löscht eine Aufgabe', async () => {
      const createdTask = await createTask();

      await request(httpServer)
        .delete(`/api/households/${household.id}/tasks/${createdTask.id}`)
        .set('Authorization', authorization())
        .expect(204);

      await request(httpServer)
        .get(`/api/households/${household.id}/tasks/${createdTask.id}`)
        .set('Authorization', authorization())
        .expect(404);
    });

    it('liefert 404 beim Löschen einer unbekannten Aufgabe', async () => {
      await request(httpServer)
        .delete(`/api/households/${household.id}/tasks/${UNKNOWN_TASK_ID}`)
        .set('Authorization', authorization())
        .expect(404);
    });
  });
});
