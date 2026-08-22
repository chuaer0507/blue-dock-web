import { describe, expect, it } from 'vitest';
import { parseUserTagList, userTagKeys } from '../../src/domains/user-tags';

describe('userTagKeys', () => {
  it('nests list under all', () => {
    expect(userTagKeys.list('me')).toEqual(['userTags', 'list', 'me']);
    expect(userTagKeys.list(7)).toEqual(['userTags', 'list', 7]);
  });
});

describe('parseUserTagList', () => {
  it('parses list envelope and drops invalid ids', () => {
    expect(
      parseUserTagList({
        userId: 3,
        list: [
          {
            id: 1,
            userId: 3,
            creatorUserId: 9,
            name: '可靠',
            recognizeCount: 2,
            recognized: true,
          },
          { id: 0, name: 'bad' },
          null,
        ],
      }),
    ).toEqual({
      userId: 3,
      list: [
        {
          id: 1,
          userId: 3,
          creatorUserId: 9,
          name: '可靠',
          recognizeCount: 2,
          recognized: true,
        },
      ],
    });
  });

  it('returns empty list for non-object', () => {
    expect(parseUserTagList(null)).toEqual({ userId: 0, list: [] });
  });
});
