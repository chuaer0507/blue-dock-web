import { useEffect, useState, type ReactNode } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  Label,
  Modal,
  TimeField,
  toast,
  useOverlayState,
  type TimeValue,
} from '@heroui/react';
import { CalendarDateTime, type DateValue } from '@internationalized/date';
import { useSetDialogMessageTodoRemind, type DialogMessageTodoView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  dialogId: number;
  todo: DialogMessageTodoView;
};

function toDateValue(iso: string | null): DateValue | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new CalendarDateTime(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
  );
}

function toRemindParam(value: DateValue | null): string {
  if (!value) return '';
  const hour = 'hour' in value ? Number(value.hour) : 0;
  const minute = 'minute' in value ? Number(value.minute) : 0;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.year}-${pad(value.month)}-${pad(value.day)}T${pad(hour)}:${pad(minute)}`;
}

function RemindDatePicker({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: ReactNode;
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
}) {
  return (
    <DatePicker
      name={name}
      value={value}
      onChange={onChange}
      granularity="minute"
      hourCycle={24}
      hideTimeZone
      className="w-full"
    >
      {({ state }) => (
        <>
          <Label>{label}</Label>
          <DateField.Group fullWidth>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DatePicker.Trigger>
                <DatePicker.TriggerIndicator />
              </DatePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DatePicker.Popover className="flex flex-col gap-3 p-3">
            <Calendar aria-label={typeof label === 'string' ? label : name}>
              <Calendar.Header>
                <Calendar.YearPickerTrigger>
                  <Calendar.YearPickerTriggerHeading />
                  <Calendar.YearPickerTriggerIndicator />
                </Calendar.YearPickerTrigger>
                <Calendar.NavButton slot="previous" />
                <Calendar.NavButton slot="next" />
              </Calendar.Header>
              <Calendar.Grid>
                <Calendar.GridHeader>
                  {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                </Calendar.GridHeader>
                <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
              </Calendar.Grid>
              <Calendar.YearPickerGrid>
                <Calendar.YearPickerGridBody>
                  {({ year }) => <Calendar.YearPickerCell year={year} />}
                </Calendar.YearPickerGridBody>
              </Calendar.YearPickerGrid>
            </Calendar>
            <div className="flex items-center justify-end">
              <TimeField
                aria-label={typeof label === 'string' ? label : name}
                granularity="minute"
                hourCycle={24}
                hideTimeZone
                value={state.timeValue}
                onChange={(v) => state.setTimeValue(v as TimeValue)}
              >
                <TimeField.Group variant="secondary">
                  <TimeField.Input>
                    {(segment) => <TimeField.Segment segment={segment} />}
                  </TimeField.Input>
                </TimeField.Group>
              </TimeField>
            </div>
          </DatePicker.Popover>
        </>
      )}
    </DatePicker>
  );
}

/** 消息待办：设置 / 清除提醒时间 */
export function MessageTodoRemindModal({ dialogId, todo }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const setRemind = useSetDialogMessageTodoRemind();
  const [value, setValue] = useState<DateValue | null>(null);

  useEffect(() => {
    if (state.isOpen) setValue(toDateValue(todo.remindAt));
  }, [state.isOpen, todo.remindAt]);

  const fail = (err: unknown) => toastRequestError(err, t('error'));

  const onSave = () => {
    const remindAt = toRemindParam(value);
    if (!remindAt) {
      toast.danger(t('todo.remindRequired'));
      return;
    }
    setRemind.mutate(
      { messageId: todo.messageId, dialogId, remindAt },
      {
        onSuccess: () => {
          toast.success(t('todo.remindSaved'));
          state.close();
        },
        onError: fail,
      },
    );
  };

  const onClear = () => {
    setRemind.mutate(
      { messageId: todo.messageId, dialogId, remindAt: null },
      {
        onSuccess: () => {
          toast.success(t('todo.remindCleared'));
          state.close();
        },
        onError: fail,
      },
    );
  };

  return (
    <Modal>
      <Button
        size="sm"
        variant="ghost"
        className="h-auto min-h-0 px-1 py-0 text-[10px]"
        onPress={state.open}
      >
        {todo.remindAt
          ? t('todo.remindAt', {
              time: new Date(todo.remindAt).toLocaleString([], {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          : t('todo.remind')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('todo.remindTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <RemindDatePicker
                name="todo-remind"
                label={t('todo.remindLabel')}
                value={value}
                onChange={setValue}
              />
            </Modal.Body>
            <Modal.Footer className="flex flex-wrap justify-end gap-2">
              {todo.remindAt ? (
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={setRemind.isPending}
                  onPress={onClear}
                >
                  {t('todo.remindClear')}
                </Button>
              ) : null}
              <Button size="sm" isDisabled={setRemind.isPending} onPress={onSave}>
                {t('todo.remindSave')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
