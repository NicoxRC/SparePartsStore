import { ConfigService } from '@nestjs/config';
import { DataicoConfig } from './dataico.config';

const configWith = (values: Record<string, string>): DataicoConfig =>
  new DataicoConfig({
    get: (key: string, fallback?: string) => values[key] ?? fallback,
  } as unknown as ConfigService);

describe('DataicoConfig send switches', () => {
  it('are both off when nothing is configured (safe default)', () => {
    const config = configWith({});

    expect(config.sendDian).toBe(false);
    expect(config.sendEmail).toBe(false);
  });

  it.each(['true', 'TRUE', ' True '])('reads %p as on', (value) => {
    const config = configWith({
      DATAICO_SEND_DIAN: value,
      DATAICO_SEND_EMAIL: value,
    });

    expect(config.sendDian).toBe(true);
    expect(config.sendEmail).toBe(true);
  });

  it.each(['false', '', '1', 'yes', 'on'])(
    'reads %p as off — only the word "true" turns a switch on',
    (value) => {
      const config = configWith({
        DATAICO_SEND_DIAN: value,
        DATAICO_SEND_EMAIL: value,
      });

      expect(config.sendDian).toBe(false);
      expect(config.sendEmail).toBe(false);
    },
  );

  it('controls each switch independently', () => {
    const config = configWith({ DATAICO_SEND_DIAN: 'true' });

    expect(config.sendDian).toBe(true);
    expect(config.sendEmail).toBe(false);
  });
});
