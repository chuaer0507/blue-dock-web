import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Checkbox, Label, SearchField, toast } from '@heroui/react';
import { dialogIdFromShareItem, useUserShareList, type UserShareItem } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Mode = 'single' | 'multiple';

type Props = {
  mode: Mode;
  /** 排除的会话（如当前会话） */
  excludeDialogIds?: number[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  maxTargets?: number;
  enabled?: boolean;
  /** 点击单选项时立即回调（报告分享等） */
  onPickOne?: (dialogId: number) => void;
};

/** 基于 `users/share/list?type=text` 的会话目标选择（含搜用户开单聊） */
export function ShareTargetPicker({
  mode,
  excludeDialogIds = [],
  selectedIds,
  onChange,
  maxTargets = 20,
  enabled = true,
  onPickOne,
}: Props) {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const listQuery = useUserShareList({
    type: 'text',
    key: debounced,
    enabled,
  });

  const exclude = useMemo(() => new Set(excludeDialogIds), [excludeDialogIds]);

  const items = useMemo(() => {
    const rows = (listQuery.data ?? []).filter((item) => {
      const id = dialogIdFromShareItem(item);
      return id != null && !exclude.has(id);
    });
    return rows.sort((a, b) => (b.sort ?? 0) - (a.sort ?? 0));
  }, [listQuery.data, exclude]);

  const toggle = (dialogId: number, next: boolean) => {
    if (mode === 'single') {
      onChange(next ? [dialogId] : []);
      if (next) onPickOne?.(dialogId);
      return;
    }
    if (next) {
      if (selectedIds.includes(dialogId)) return;
      if (selectedIds.length >= maxTargets) {
        toast.danger(t('sharePicker.maxTargets', { max: maxTargets }));
        return;
      }
      onChange([...selectedIds, dialogId]);
      return;
    }
    onChange(selectedIds.filter((id) => id !== dialogId));
  };

  return (
    <div className="flex flex-col gap-3">
      <SearchField
        aria-label={t('sharePicker.search')}
        value={query}
        onChange={setQuery}
        className="w-full"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={t('sharePicker.search')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {listQuery.isLoading ? (
        <p className="text-muted text-xs">{t('sharePicker.loading')}</p>
      ) : null}
      {listQuery.isError ? (
        <div className="flex items-center gap-2">
          <p className="text-danger text-xs">{t('sharePicker.error')}</p>
          <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
            {t('sharePicker.retry')}
          </Button>
        </div>
      ) : null}

      {!listQuery.isLoading && items.length === 0 ? (
        <p className="text-muted text-xs">{t('sharePicker.empty')}</p>
      ) : (
        <ul className="border-border divide-border max-h-64 divide-y overflow-auto rounded-lg border">
          {items.map((item) => {
            const id = dialogIdFromShareItem(item)!;
            const checked = selectedIds.includes(id);
            return (
              <li key={`${id}-${item.name}`} className="px-3 py-2">
                {mode === 'multiple' ? (
                  <Checkbox
                    isSelected={checked}
                    onChange={(on) => {
                      if (on === checked) return;
                      toggle(id, on);
                    }}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <ShareRow item={item} dialogId={id} />
                    </Checkbox.Content>
                  </Checkbox>
                ) : (
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-none px-0 py-1 text-left font-normal"
                    onPress={() => toggle(id, true)}
                  >
                    <ShareRow item={item} dialogId={id} />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ShareRow({ item, dialogId }: { item: UserShareItem; dialogId: number }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <Avatar size="sm" className="shrink-0">
        {item.icon ? <Avatar.Image alt="" src={item.icon} /> : null}
        <Avatar.Fallback>{(item.name || '?').slice(0, 1)}</Avatar.Fallback>
      </Avatar>
      <Label className="min-w-0 flex-1 truncate text-sm">
        {item.name || `#${dialogId}`}
        <span className="text-muted ms-2 text-xs">#{dialogId}</span>
      </Label>
    </span>
  );
}
