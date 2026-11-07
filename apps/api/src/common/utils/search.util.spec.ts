import {
  andWhereEveryWord,
  searchWords,
  stripAccents,
  unaccentSql,
} from './search.util';

describe('search.util', () => {
  it('strips accents but keeps Ñ', () => {
    expect(stripAccents('José PIÑÓN Güero')).toBe('Jose PIÑON Guero');
  });

  it('splits the search into accent-free words, ignoring extra spaces', () => {
    expect(searchWords('  María   josé ')).toEqual(['Maria', 'jose']);
    expect(searchWords('S.A.S 900.123 .')).toEqual(['SAS', '900123']);
    expect(searchWords(undefined)).toEqual([]);
    expect(searchWords('   ')).toEqual([]);
  });

  it('wraps a column in a TRANSLATE that unaccents vowels and drops dots', () => {
    const sql = unaccentSql('customer.firstName');
    const [, from, to] = /'([^']*)', '([^']*)'/.exec(sql) ?? [];
    expect(sql.startsWith('TRANSLATE(customer.firstName,')).toBe(true);
    // Positional map: every accented vowel has its plain one, "." has none.
    expect(stripAccents(from)).toBe(`${to}.`);
  });

  describe('andWhereEveryWord', () => {
    const qb = { andWhere: jest.fn() };

    beforeEach(() => qb.andWhere.mockReset());

    it('adds one OR-condition per word, across every column, escaped', () => {
      andWhereEveryWord(qb as never, ['c.name', 'c.nit'], 'jóse 50%');

      expect(qb.andWhere).toHaveBeenCalledTimes(2);
      const [where, params] = qb.andWhere.mock.calls[0] as [string, object];
      expect(where).toBe(
        `(${unaccentSql('c.name')} ILIKE :search0 ESCAPE '\\' OR ${unaccentSql('c.nit')} ILIKE :search0 ESCAPE '\\')`,
      );
      expect(params).toEqual({ search0: '%jose%' });
      expect(qb.andWhere).toHaveBeenLastCalledWith(expect.any(String), {
        search1: '%50\\%%',
      });
    });

    it('adds nothing for an empty search', () => {
      andWhereEveryWord(qb as never, ['c.name'], '  ');
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });
});
