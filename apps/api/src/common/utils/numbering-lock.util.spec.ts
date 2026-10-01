import { EntityManager } from 'typeorm';
import { withNumberingLock } from './numbering-lock.util';

describe('withNumberingLock', () => {
  const query = jest.fn().mockResolvedValue([]);
  const manager = {
    transaction: jest.fn((run: (m: unknown) => Promise<unknown>) =>
      run({ query }),
    ),
  } as unknown as EntityManager;

  beforeEach(() => query.mockClear());

  it('takes the advisory lock for the key before running the work', async () => {
    const work = jest.fn(() => {
      expect(query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        ['invoices'],
      );
      return Promise.resolve('done');
    });

    await expect(withNumberingLock(manager, 'invoices', work)).resolves.toBe(
      'done',
    );
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('propagates the work failure so the transaction (and lock) ends', async () => {
    const error = new Error('Dataico down');

    await expect(
      withNumberingLock(manager, 'invoices', () => Promise.reject(error)),
    ).rejects.toBe(error);
  });
});
