export type UserPublicView = {
  userId: number;
  email: string;
  nickname: string;
  userImage: string;
  identity: string;
  profession: string;
  telephone: string;
  birthday: string;
  address: string;
  introduction: string;
  lang: string;
};

/** `GET users/extra`：含 isBot 等扩展字段 */
export type UserExtraView = UserPublicView & {
  nameAz: string;
  emailVerify: number;
  isBot: number;
};

export const userKeys = {
  all: () => ['users'] as const,
  me: () => [...userKeys.all(), 'me'] as const,
  basic: (userId: number) => [...userKeys.all(), 'basic', userId] as const,
  extra: (userId: number) => [...userKeys.all(), 'extra', userId] as const,
  annualReport: (year: number) => [...userKeys.all(), 'annualReport', year] as const,
};
