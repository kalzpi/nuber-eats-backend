import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Verification } from 'src/users/entities/verification.entity';

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});

const GRAPHQL_ENDPOINT = '/graphql';

const testUser = {
  email: 'E2E_test@test.com',
  password: '1234',
};

describe('UserModule (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let verificationRepository: Repository<Verification>;
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    verificationRepository = module.get<Repository<Verification>>(
      getRepositoryToken(Verification),
    );
    await app.init();
  });
  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('X-JWT', jwtToken).send({ query });

  describe('createAccount', () => {
    it('should create account', () => {
      return publicTest(`
      mutation{
        createAccount(input:{email:"${testUser.email}", password:"${testUser.password}", role:Client}){
          error
          ok
        }
      } 
    `)
        .expect(200)
        .expect((res) => expect(res.body.data.createAccount.ok).toBe(true))
        .expect((res) => expect(res.body.data.createAccount.error).toBe(null));
    });

    it('should fail if account exist', () => {
      return publicTest(
        `
          mutation{
            createAccount(input:{email:"${testUser.email}", password:"${testUser.password}", role:Client}){
              error
              ok
            }
          } 
        `,
      )
        .expect(200)
        .expect((res) => expect(res.body.data.createAccount.ok).toBe(false))
        .expect((res) =>
          expect(res.body.data.createAccount.error).toBe(
            'There is a user with that email already.',
          ),
        );
    });
  });

  describe('login', () => {
    it('should login with correct credentials', () => {
      return publicTest(
        `
          mutation{
            login(input:{email:"${testUser.email}", password:"${testUser.password}"}){
              error
              ok
              token
            }
          } 
        `,
      )
        .expect(200)
        .expect((res) => {
          expect(res.body.data.login.ok).toBe(true);
          expect(res.body.data.login.error).toBe(null);
          jwtToken = res.body.data.login.token;
          expect(res.body.data.login.token).toEqual(expect.any(String));
        });
    });

    it('should not be able to login with wrong credentials', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
        mutation{
          login(input:{email:"${testUser.email}", password:"some wrong password"}){
            error
            ok
            token
          }
        } 
      `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.login.ok).toBe(false);
          expect(res.body.data.login.error).toBe('Invalid Credential');
          expect(res.body.data.login.token).toBe(null);
        });
    });
  });

  describe('userProfile', () => {
    let userId: number;
    beforeAll(async () => {
      const [user] = await usersRepository.find();
      userId = user.id;
    });
    it('should find the user', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `
          query{
            userProfile(userId:${userId}){
              ok
              error
              user{
                id
                email
              }
            }
          }
      `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { userProfile },
            },
          } = res;
          expect(userProfile).toEqual({
            ok: true,
            error: null,
            user: { id: userId, email: testUser.email },
          });
        });
    });
    it('should not find any user with wrogn ID', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `
          query{
            userProfile(userId:999){
              ok
              error
              user{
                id
                email
              }
            }
          }
      `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { userProfile },
            },
          } = res;
          expect(userProfile).toEqual({
            ok: false,
            error: 'User not found',
            user: null,
          });
        });
    });
  });

  describe('me', () => {
    it('should return me if logged in', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `
        {
          me{
            email
          }
        }
        `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { me },
            },
          } = res;
          expect(me).toEqual({ email: testUser.email });
        });
    });
    it('should not allow logged out user', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
        {
          me{
            email
          }
        }
        `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: { errors },
          } = res;
          const [error] = errors;
          expect(error.message).toBe('Forbidden resource');
        });
    });
    it('should not allow wrong token', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', 'somewrongtoken')
        .send({
          query: `
        {
          me{
            email
          }
        }
        `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: { errors },
          } = res;
          const [error] = errors;
          expect(error.message).toBe('Forbidden resource');
        });
    });
  });

  describe('editProfile', () => {
    const NEW_EMAIL = 'newEmail@test.com';
    it('should change email', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `
        mutation{
          editProfile(input:{email:"${NEW_EMAIL}"}){
            ok
            error
          }
        }
        `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { editProfile },
            },
          } = res;
          expect(editProfile).toEqual({ ok: true, error: null });
        });
    });
    it('should return changed email', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set('X-JWT', jwtToken)
        .send({
          query: `
          {
            me{
              email
            }
          }
        `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toEqual(NEW_EMAIL);
        });
    });
    it.todo('should not change email if it was already taken');
    it.todo('should change password');
  });

  describe('verifyEmail', () => {
    let code: String;
    let id: number;
    beforeAll(async () => {
      const [verification] = await verificationRepository.find();
      code = verification.code;
      id = verification.id;
    });
    it('should verify email', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
        mutation{
          verifyEmail(input:{code:"${code}"}){
            error
            ok
          }
        }
      `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { verifyEmail },
            },
          } = res;
          expect(verifyEmail).toEqual({ ok: true, error: null });
        });
    });
    it('should remove verification on db', async () => {
      const verification = await verificationRepository.findOne({ id });
      expect(verification).toBe(undefined);
    });
    it('should fail on wrong verification code', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
        mutation{
          verifyEmail(input:{code:"${code}"}){
            error
            ok
          }
        }
      `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { verifyEmail },
            },
          } = res;
          expect(verifyEmail).toEqual({
            ok: false,
            error: 'Verification not found.',
          });
        });
    });
  });
});
