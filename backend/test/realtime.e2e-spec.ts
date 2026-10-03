import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server as HttpServer } from 'http';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';

import { AppModule } from '../src/app.module';

type AuthResponseBody = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

type HouseholdResponseBody = {
  id: string;
  name: string;
};

type TaskResponseBody = {
  id: string;
  title: string;
  householdId: string;
  completed: boolean;
};

function getBody<T>(response: request.Response): T {
  const body: unknown = response.body;
  return body as T;
}

function waitForSocketConnect(socket: Socket, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout: Socket-Verbindung wurde nicht aufgebaut.'));
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.once('connect_error', (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function waitForSocketConnectError(
  socket: Socket,
  timeoutMs = 3000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout: Socket-Verbindung wurde nicht abgelehnt.'));
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timeout);
      reject(new Error('Socket hätte ohne JWT nicht verbinden dürfen.'));
    });

    socket.once('connect_error', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function waitForEvent<T>(
  socket: Socket,
  eventName: string,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout: Event "${eventName}" wurde nicht empfangen.`));
    }, timeoutMs);

    socket.once(eventName, (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

describe('Realtime WebSocket Gateway (e2e)', () => {
  let app: INestApplication;
  let httpServer: HttpServer;
  let httpServerUrl: string;

  beforeAll(async () => {
    jest.setTimeout(30000);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    await app.listen(0);

    const server: unknown = app.getHttpServer();
    httpServer = server as HttpServer;

    const address = httpServer.address();

    if (typeof address === 'string' || address === null) {
      throw new Error('Test server address konnte nicht gelesen werden.');
    }

    httpServerUrl = `http://127.0.0.1:${address.port}`;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function registerAndLogin(email: string): Promise<string> {
    const password = 'Test123456!';

    await request(httpServer)
      .post('/api/auth/register')
      .send({
        name: 'Realtime Test User',
        email,
        password,
      })
      .expect((response) => {
        expect([201, 409]).toContain(response.status);
      });

    const loginResponse = await request(httpServer)
      .post('/api/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    const loginBody = getBody<AuthResponseBody>(loginResponse);

    expect(loginBody.accessToken).toBeDefined();
    expect(typeof loginBody.accessToken).toBe('string');

    return loginBody.accessToken;
  }

  async function createHousehold(token: string): Promise<string> {
    const response = await request(httpServer)
      .post('/api/households')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Realtime Test Wohnung',
      })
      .expect(201);

    const body = getBody<HouseholdResponseBody>(response);

    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe('string');

    return body.id;
  }

  function createSocket(token: string): Socket {
    return io(httpServerUrl, {
      transports: ['websocket'],
      forceNew: true,
      auth: {
        token,
      },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  it('verbindet sich mit gültigem JWT', async () => {
    const token = await registerAndLogin(
      `socket-user-${Date.now()}@diario.test`,
    );

    const socket = createSocket(token);

    await expect(waitForSocketConnect(socket)).resolves.toBeUndefined();

    expect(socket.connected).toBe(true);

    socket.disconnect();
  });

  it('lehnt Verbindung ohne JWT ab', async () => {
    const socket = io(httpServerUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    await expect(waitForSocketConnectError(socket)).resolves.toBeUndefined();

    socket.disconnect();
  });

  it('kann einem Household-Raum beitreten', async () => {
    const token = await registerAndLogin(
      `socket-join-${Date.now()}@diario.test`,
    );
    const householdId = await createHousehold(token);

    const socket = createSocket(token);

    await waitForSocketConnect(socket);

    const joinedPromise = waitForEvent<{ householdId: string }>(
      socket,
      'household:joined',
    );

    socket.emit('household:join', {
      householdId,
    });

    const payload = await joinedPromise;

    expect(payload.householdId).toBe(householdId);

    socket.disconnect();
  });

  it('empfängt Realtime-Event, wenn sich eine Aufgabe ändert', async () => {
    const token = await registerAndLogin(
      `socket-task-${Date.now()}@diario.test`,
    );
    const householdId = await createHousehold(token);

    const socket = createSocket(token);

    await waitForSocketConnect(socket);

    const joinedPromise = waitForEvent<{ householdId: string }>(
      socket,
      'household:joined',
    );

    socket.emit('household:join', {
      householdId,
    });

    await joinedPromise;

    const realtimePromise = waitForEvent<TaskResponseBody>(
      socket,
      'task:created',
    );

    await request(httpServer)
      .post(`/api/households/${householdId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Realtime Test Aufgabe',
      })
      .expect(201);

    const payload = await realtimePromise;

    expect(payload).toBeDefined();
    expect(payload.title).toBe('Realtime Test Aufgabe');
    expect(payload.householdId).toBe(householdId);
    expect(payload.completed).toBe(false);

    socket.disconnect();
  });
});
