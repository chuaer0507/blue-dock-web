import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';

export type LicenseInfo = {
  people: number;
  sn: string;
  macAddresses: string[];
  expiredAt: string;
};

export type LicenseStatus = {
  license: string;
  info: LicenseInfo;
  userCount: number;
  macAddresses: string[];
  machineSn: string;
  error: string[];
  trial: boolean;
  ok: boolean;
  online: boolean;
  onlineEmail: string;
  onlineMode: string;
};

export type LicenseEmailSendResult = {
  sent?: boolean;
  expiresIn?: number;
  /** local 模式联调 */
  devCode?: string;
};

export type LicenseLoginResult = {
  token: string;
  email?: string;
  expiresIn?: number;
};

export const licenseKeys = {
  all: () => ['license'] as const,
  status: () => [...licenseKeys.all(), 'status'] as const,
};

export function useLicenseStatus(enabled = true) {
  return useQuery({
    queryKey: licenseKeys.status(),
    queryFn: () => get<LicenseStatus>('license/status'),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveOfflineLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (license: string) =>
      post<LicenseStatus>('system/license', undefined, {
        config: { params: { license } },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(licenseKeys.status(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: licenseKeys.all() });
    },
  });
}

export function useLicenseSendEmail() {
  return useMutation({
    mutationFn: (email: string) =>
      get<LicenseEmailSendResult>('license/email/send', { email: email.trim() }),
  });
}

export function useLicenseLogin() {
  return useMutation({
    mutationFn: (input: { email: string; code: string }) =>
      get<LicenseLoginResult>('license/login', {
        email: input.email.trim(),
        code: input.code.trim(),
      }),
  });
}

export function useLicenseConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => get<LicenseStatus>('license/login/confirm', { token }),
    onSuccess: (data) => {
      queryClient.setQueryData(licenseKeys.status(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: licenseKeys.all() });
    },
  });
}

export function useLicenseTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email?: string) =>
      get<LicenseStatus>('license/trial', email?.trim() ? { email: email.trim() } : undefined),
    onSuccess: (data) => {
      queryClient.setQueryData(licenseKeys.status(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: licenseKeys.all() });
    },
  });
}

export function useLicenseRefresh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => get<LicenseStatus>('license/refresh'),
    onSuccess: (data) => {
      queryClient.setQueryData(licenseKeys.status(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: licenseKeys.all() });
    },
  });
}

export function useLicenseLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => get<LicenseStatus>('license/logout'),
    onSuccess: (data) => {
      queryClient.setQueryData(licenseKeys.status(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: licenseKeys.all() });
    },
  });
}
