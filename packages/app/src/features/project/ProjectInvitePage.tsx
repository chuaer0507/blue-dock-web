import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, toast } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import { getAccessToken, useJoinProjectInvite, useProjectInviteInfo } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** 项目邀请落地：查看摘要并加入 */
export function ProjectInvitePage() {
  const { t } = useTranslation('project');
  const navigate = useNavigate();
  const params = useParams();
  const code = useMemo(() => {
    const raw = params.inviteId?.trim();
    return raw || undefined;
  }, [params.inviteId]);

  const info = useProjectInviteInfo(code);
  const join = useJoinProjectInvite();
  const loggedIn = Boolean(getAccessToken());

  const onJoin = () => {
    if (!code) return;
    if (!loggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(`/manage/project/invite/${code}`)}`);
      return;
    }
    join.mutate(code, {
      onSuccess: (project) => {
        toast.success(t('invite.join'));
        navigate(`/manage/project/${project.id}`, { replace: true });
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  if (!code) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 p-8">
        <h1 className="text-xl font-semibold">{t('invite.title')}</h1>
        <p className="text-danger text-sm">{t('invite.missingCode')}</p>
        <Link
          to="/manage/dashboard"
          className="text-accent text-sm underline-offset-2 hover:underline"
        >
          {t('invite.back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">{t('invite.title')}</h1>

      {info.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {info.isError ? (
        <div className="flex flex-col gap-2">
          <p className="text-danger text-sm">{t('error')}</p>
          <Button size="sm" variant="secondary" onPress={() => void info.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : null}

      {info.data ? (
        <>
          <div className="border-border bg-surface rounded-xl border p-4">
            <p className="text-lg font-medium">{info.data.name}</p>
            <p className="text-muted mt-2 text-sm">
              {info.data.description?.trim() || t('detail.noDescription')}
            </p>
          </div>
          {!loggedIn ? <p className="text-muted text-sm">{t('invite.needLogin')}</p> : null}
          <Button variant="primary" onPress={onJoin} isDisabled={join.isPending}>
            {join.isPending ? t('invite.joining') : t('invite.join')}
          </Button>
        </>
      ) : null}

      <Link
        to="/manage/dashboard"
        className="text-muted hover:text-foreground text-sm underline-offset-2 hover:underline"
      >
        {t('invite.back')}
      </Link>
    </div>
  );
}
