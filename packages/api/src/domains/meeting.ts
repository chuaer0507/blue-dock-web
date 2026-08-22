import { useMutation, useQuery } from '@tanstack/react-query';
import { get } from '../http-api';

export type MeetingOpenView = {
  id: number;
  meetingId: string;
  name: string;
  channel: string;
  userId: number;
  appId: string;
  agoraUserId: number;
  token: string;
  nickname: string;
  userImage: string;
  invitedUserIds: number[];
  messages: Record<string, unknown>[];
  createdAt?: string | null;
  endAt?: string | null;
};

export type MeetingOpenInput = {
  type: 'create' | 'join';
  meetingId?: string;
  name?: string;
  /** 逗号分隔的用户 id，最多 20 */
  userIds?: string;
  shareKey?: string;
  username?: string;
  userImage?: string;
};

export type MeetingLinkView = {
  url: string;
  shareKey: string;
  meetingId: string;
};

export type MeetingInviteView = {
  meetingId?: string;
  invitedUserIds?: number[];
  messages?: Record<string, unknown>[];
  [key: string]: unknown;
};

export type MeetingTouristView = {
  agoraUserId?: number | string;
  nickname?: string;
  userImage?: string;
  [key: string]: unknown;
};

export const meetingKeys = {
  all: () => ['meeting'] as const,
  tourist: (touristId: string) => [...meetingKeys.all(), 'tourist', touristId] as const,
};

function openParams(input: MeetingOpenInput): Record<string, unknown> {
  const params: Record<string, unknown> = { type: input.type };
  if (input.meetingId) params.meetingId = input.meetingId;
  if (input.name) params.name = input.name;
  if (input.userIds) params.userIds = input.userIds;
  if (input.shareKey) params.shareKey = input.shareKey;
  if (input.username) params.username = input.username;
  if (input.userImage) params.userImage = input.userImage;
  return params;
}

/** 创建或加入会议；游客 join 须带 shareKey，并跳过 1001 跳转 */
export function openMeeting(input: MeetingOpenInput): Promise<MeetingOpenView> {
  const guest = input.type === 'join' && Boolean(input.shareKey);
  return get<MeetingOpenView>('users/meeting/open', openParams(input), {
    skipUnauthorizedHandler: guest,
  });
}

export function createMeetingLink(meetingId: string, shareKey?: string): Promise<MeetingLinkView> {
  return get<MeetingLinkView>(
    'users/meeting/link',
    { meetingId, ...(shareKey ? { shareKey } : {}) },
    { skipUnauthorizedHandler: Boolean(shareKey) },
  );
}

export function inviteMeeting(meetingId: string, userIds: string): Promise<MeetingInviteView> {
  return get<MeetingInviteView>('users/meeting/invitation', { meetingId, userIds });
}

export function fetchMeetingTourist(touristId: string): Promise<MeetingTouristView> {
  return get<MeetingTouristView>(
    'users/meeting/tourist',
    { touristId },
    {
      skipUnauthorizedHandler: true,
    },
  );
}

export function useOpenMeeting() {
  return useMutation({
    mutationFn: (input: MeetingOpenInput) => openMeeting(input),
  });
}

export function useMeetingLink() {
  return useMutation({
    mutationFn: (vars: { meetingId: string; shareKey?: string }) =>
      createMeetingLink(vars.meetingId, vars.shareKey),
  });
}

export function useInviteMeeting() {
  return useMutation({
    mutationFn: (vars: { meetingId: string; userIds: string }) =>
      inviteMeeting(vars.meetingId, vars.userIds),
  });
}

export function useMeetingTourist(touristId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: meetingKeys.tourist(touristId ?? ''),
    queryFn: () => fetchMeetingTourist(touristId!),
    enabled: enabled && Boolean(touristId),
    staleTime: 60_000,
  });
}
