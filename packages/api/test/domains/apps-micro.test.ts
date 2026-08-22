import { describe, expect, it } from 'vitest';
import {
  findMicroAppMenu,
  firstMicroMenuInSection,
  isMicroAppBlankType,
  isMicroMenuInSection,
  microAppHostPath,
  normalizeMicroMenuLocation,
  resolveMicroAppUrl,
  sumAppBadges,
} from '../../src/domains/apps';

describe('resolveMicroAppUrl', () => {
  it('replaces user_token placeholder', () => {
    expect(resolveMicroAppUrl('https://x.test/?token={user_token}', 'a b')).toBe(
      'https://x.test/?token=a%20b',
    );
  });

  it('clears placeholder when no token', () => {
    expect(resolveMicroAppUrl('/apps/ai?t={token}', null)).toBe('/apps/ai?t=');
  });
});

describe('isMicroAppBlankType', () => {
  it('detects blank open modes', () => {
    expect(isMicroAppBlankType('iframe')).toBe(false);
    expect(isMicroAppBlankType('iframe_blank')).toBe(true);
    expect(isMicroAppBlankType('external')).toBe(true);
  });
});

describe('normalizeMicroMenuLocation', () => {
  it('normalizes legacy and canonical values', () => {
    expect(normalizeMicroMenuLocation('application')).toBe('application');
    expect(normalizeMicroMenuLocation('admin')).toBe('application/admin');
    expect(normalizeMicroMenuLocation('application/admin')).toBe('application/admin');
    expect(normalizeMicroMenuLocation('main')).toBe('main/menu');
    expect(normalizeMicroMenuLocation('main/menu')).toBe('main/menu');
    expect(normalizeMicroMenuLocation(undefined)).toBe('application');
  });

  it('matches section helpers', () => {
    expect(isMicroMenuInSection('admin', 'application/admin')).toBe(true);
    expect(isMicroMenuInSection('application', 'application/admin')).toBe(false);
  });
});

describe('firstMicroMenuInSection', () => {
  const app = {
    id: 'okr',
    name: 'OKR',
    version: '1',
    menuItems: [
      {
        location: 'main',
        label: 'Nav',
        icon: '',
        url: '/nav',
        type: 'iframe',
        keepAlive: true,
        disableScopeCss: false,
        autoDarkTheme: true,
        transparent: false,
        key: 'nav',
        badgeClearOnOpen: false,
      },
      {
        location: 'application/admin',
        label: 'Admin',
        icon: '',
        url: '/admin',
        type: 'iframe',
        keepAlive: true,
        disableScopeCss: false,
        autoDarkTheme: true,
        transparent: false,
        key: 'admin',
        badgeClearOnOpen: false,
      },
    ],
  };

  it('picks first menu in section with legacy location', () => {
    expect(firstMicroMenuInSection(app, 'main/menu')?.key).toBe('nav');
    expect(firstMicroMenuInSection(app, 'application/admin')?.key).toBe('admin');
    expect(firstMicroMenuInSection(app, 'application')).toBeNull();
  });
});

describe('sumAppBadges', () => {
  it('sums counts and dots', () => {
    expect(
      sumAppBadges({
        a: { m1: { count: 2, dot: false }, m2: { count: 3, dot: true } },
        b: { m1: { count: 1, dot: false } },
      }),
    ).toEqual({ count: 6, dot: true });
  });
});

describe('findMicroAppMenu', () => {
  const apps = [
    {
      id: 'okr',
      name: 'OKR',
      version: '1',
      menuItems: [
        {
          location: 'application',
          label: 'OKR',
          icon: '',
          url: '/apps/okr',
          type: 'iframe',
          keepAlive: true,
          disableScopeCss: false,
          autoDarkTheme: true,
          transparent: false,
          key: 'home',
          badgeClearOnOpen: false,
        },
      ],
    },
  ];

  it('finds by app id and menu key', () => {
    const hit = findMicroAppMenu(apps, 'okr', 'home');
    expect(hit?.menu.url).toBe('/apps/okr');
  });

  it('returns null for missing app', () => {
    expect(findMicroAppMenu(apps, 'nope')).toBeNull();
  });
});

describe('microAppHostPath', () => {
  it('builds manage path with optional key', () => {
    expect(microAppHostPath('okr')).toBe('/manage/apps/okr');
    expect(microAppHostPath('okr', 'home')).toBe('/manage/apps/okr?key=home');
  });
});
