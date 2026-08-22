import { get } from '../http-api';
import { authKeys } from './login';

export type NeedCodeResult = {
  need: boolean;
};

export type CaptchaJsonResult = {
  key: string;
  imageBase64: string;
};

/** 按客户端 IP 判断是否已达登录失败阈值（须出图形验证码） */
export function fetchNeedCode(): Promise<NeedCodeResult> {
  return get<NeedCodeResult>('users/login/needCode', undefined, {
    skipUnauthorizedHandler: true,
    extra: { showFailTips: false },
  });
}

/** 拉取图形验证码（推荐 JSON） */
export function fetchCaptchaJson(): Promise<CaptchaJsonResult> {
  return get<CaptchaJsonResult>('users/login/codeJson', undefined, {
    skipUnauthorizedHandler: true,
    extra: { showFailTips: false },
  });
}

export const captchaKeys = {
  needCode: () => [...authKeys.all(), 'needCode'] as const,
  image: () => [...authKeys.all(), 'captcha'] as const,
};
