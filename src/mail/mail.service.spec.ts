import { Test } from '@nestjs/testing';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { MailService } from './mail.service';
import got from 'got';
import * as FormData from 'form-data';

jest.mock('got');

jest.mock('form-data');

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            apiKey: 'test-apiKey',
            domain: 'test-domain',
            fromEmail: 'test-fromEmail',
          },
        },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('send email', async () => {
      const formSpy = jest.spyOn(FormData.prototype, 'append');
      const result = await service.sendEmail('', '', []);
      expect(formSpy).toHaveBeenCalledTimes(4);
      expect(got.post).toHaveBeenCalledTimes(1);
      expect(got.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
      );
      expect(result).toEqual(true);
    });
    it('should fail on exception', async () => {
      jest.spyOn(got, 'post').mockImplementation(() => {
        throw new Error();
      });
      const result = await service.sendEmail('', '', []);
      expect(result).toEqual(false);
    });
  });

  describe('sendVerificationEmail', () => {
    const args = {
      email: 'some@mail.com',
      code: 'some code',
    };
    it('should return nothing', () => {
      jest.spyOn(service, 'sendEmail').mockImplementation(async () => {
        return true;
      });
      const result = service.sendVerificationEmail(args.email, args.code);
      expect(service.sendEmail).toHaveBeenCalledTimes(1);
      expect(service.sendEmail).toHaveBeenCalledWith(
        'Verify Your Email',
        'nubersmailtemp',
        [
          { key: 'code', value: args.code },
          { key: 'username', value: args.email },
        ],
      );
    });
  });
});
