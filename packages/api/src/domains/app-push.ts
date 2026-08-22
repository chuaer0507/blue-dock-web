import { useMutation } from '@tanstack/react-query';
import { get } from '../http-api';
import { env } from '../env';

export type AppPushPlatform = 'ios' | 'android';

export type UpsertAppPushAliasInput = {
  alias: string;
  platform: AppPushPlatform;
  /** 系统通知权限是否已授予 */
  isNotified: boolean;
  deviceModel?: string;
  appVersion?: string;
  appVersionName?: string;
  userAgent?: string;
};

export type UpsertAppPushAliasResult = {
  alias: string;
  platform: string;
};

export type RemoveAppPushAliasInput = {
  alias: string;
};

export const appPushKeys = {
  all: () => ['appPush'] as const,
  alias: () => [...appPushKeys.all(), 'alias'] as const,
};

/** 注册 / 更新推送别名（契约：GET `users/appPush/alias`） */
export function upsertAppPushAlias(input: UpsertAppPushAliasInput) {
  return get<UpsertAppPushAliasResult>('users/appPush/alias', {
    alias: input.alias,
    platform: input.platform,
    isNotified: input.isNotified ? '1' : '0',
    deviceModel: input.deviceModel ?? '',
    appVersion: input.appVersion ?? env.appVersion,
    appVersionName: input.appVersionName ?? env.appVersion,
    userAgent: input.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
  });
}

/** 登出时移除别名 */
export function removeAppPushAlias(input: RemoveAppPushAliasInput) {
  return get<{ removed: boolean }>('users/appPush/alias', {
    action: 'remove',
    alias: input.alias,
  });
}

export function useUpsertAppPushAlias() {
  return useMutation({
    mutationFn: upsertAppPushAlias,
  });
}

export function useRemoveAppPushAlias() {
  return useMutation({
    mutationFn: removeAppPushAlias,
  });
}
