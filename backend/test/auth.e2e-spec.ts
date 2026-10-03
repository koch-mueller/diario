import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server as HttpServer } from 'http';
import { AppModule } from '../src/app.module';

type AuthUserResponse = {
  id: string;
  email: string;
  name?: string;
};

type AuthResponseBody = {
  accessToken: string;
  user: AuthUserResponse;
};

type ErrorResponseBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

function getBody<T>(response: request.Response): T {
  const body: unknown = response.body;
  return body as T;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let httpServer: HttpServer;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    const server: unknown = app.getHttpServer();
    httpServer = server as HttpServer;
  });

  afterAll(async () => {
    await app.close();
  });

  function createUniqueEmail(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@diario.test`;
  }

  describe('/auth/register (POST)', () => {
    it('registriert einen neuen Benutzer', async () => {
      const email = createUniqueEmail('register');

      const response = await request(httpServer)
        .post('/auth/register')
        .send({
          name: 'Marie Test',
          email,
          password: 'Test123456!',
        })
        .expect(201);

      const body = getBody<AuthResponseBody>(response);

      expect(body.accessToken).toBeDefined();
      expect(typeof body.accessToken).toBe('string');
      expect(body.user).toBeDefined();
      expect(body.user.id).toBeDefined();
      expect(body.user.email).toBe(email);
    });

    it('lehnt doppelte Registrierung mit gleicher E-Mail ab', async () => {
      const email = createUniqueEmail('duplicate');

      await request(httpServer)
        .post('/auth/register')
        .send({
          name: 'Marie Test',
          email,
          password: 'Test123456!',
        })
        .expect(201);

      const response = await request(httpServer)
        .post('/auth/register')
        .send({
          name: 'Marie Test',
          email,
          password: 'Test123456!',
        })
        .expect(409);

      const body = getBody<ErrorResponseBody>(response);

      expect(body).toBeDefined();
    });

    it('lehnt Registrierung ohne E-Mail ab', async () => {
      const response = await request(httpServer)
        .post('/auth/register')
        .send({
          name: 'Marie Test',
          password: 'Test123456!',
        })
        .expect(400);

      const body = getBody<ErrorResponseBody>(response);

      expect(body).toBeDefined();
    });

    it('lehnt Registrierung mit zu kurzem Passwort ab', async () => {
      const email = createUniqueEmail('short-password');

      const response = await request(httpServer)
        .post('/auth/register')
        .send({
          name: 'Marie Test',
          email,
          password: '123',
        })
        .expect(400);

      const body = getBody<ErrorResponseBody>(response);

      expect(body).toBeDefined();
    });
  });

  describe('/auth/login (POST)', () => {
    it('loggt einen registrierten Benutzer ein', async () => {
      const email = createUniqueEmail('login');
      const password = 'Test123456!';

      await request(httpServer)
        .post('/auth/register')
        .send({
          name: 'Marie Test',
          email,
          password,
        })
        .expect(201);

      const response = await request(httpServer)
        .post('/auth/login')
        .send({
          email,
          password,
        })
        .expect(200);

      const body = getBody<AuthResponseBody>(response);

      expect(body.accessToken).toBeDefined();
      expect(typeof body.accessToken).toBe('string');
      expect(body.user).toBeDefined();
      expect(body.user.id).toBeDefined();
      expect(body.user.email).toBe(email);
    });

    it('lehnt Login mit falschem Passwort ab', async () => {
      const email = createUniqueEmail('wrong-password');

      await request(httpServer)
        .post('/auth/register')
        .send({
          name: 'Marie Test',
          email,
          password: 'Test123456!',
        })
        .expect(201);

      const response = await request(httpServer)
        .post('/auth/login')
        .send({
          email,
          password: 'Falsch123456!',
        })
        .expect(401);

      const body = getBody<ErrorResponseBody>(response);

      expect(body).toBeDefined();
    });

    it('lehnt Login für unbekannte E-Mail ab', async () => {
      const email = createUniqueEmail('unknown');

      const response = await request(httpServer)
        .post('/auth/login')
        .send({
          email,
          password: 'Test123456!',
        })
        .expect(401);

      const body = getBody<ErrorResponseBody>(response);

      expect(body).toBeDefined();
    });

    it('lehnt Login ohne Passwort ab', async () => {
      const email = createUniqueEmail('missing-password');

      const response = await request(httpServer)
        .post('/auth/login')
        .send({
          email,
        })
        .expect(400);

      const body = getBody<ErrorResponseBody>(response);

      expect(body).toBeDefined();
    });
  });
});
