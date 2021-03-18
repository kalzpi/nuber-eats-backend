import { Test } from '@nestjs/testing';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import * as jwt from 'jsonwebtoken';
import { JwtService } from './jwt.service';

const TEST_KEY = 'testKey';

jest.mock('jsonwebtoken', () => {
  return {
    sign: jest.fn(() => 'TOKEN'),
    verify: jest.fn(() => ({ userId: 1 })),
  };
});

describe('JwtService', () => {
  let service: JwtService;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            privateKey: TEST_KEY,
          },
        },
      ],
    }).compile();
    service = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sign', () => {
    const mockedUser = {
      userId: 1,
    };
    it('should return token', () => {
      const result = service.sign(mockedUser);
      expect(jwt.sign).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledWith({ userId: 1 }, TEST_KEY);
      expect(result).toEqual(expect.any(String));
    });
  });

  describe('verify', () => {
    it('should return the decoded token', () => {
      const decodedToken = service.verify('TOKEN');
      expect(decodedToken).toEqual({ userId: 1 });
    });
  });
});
