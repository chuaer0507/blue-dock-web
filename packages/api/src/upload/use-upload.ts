import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fileKeys } from '../domains/file';
import { taskKeys } from '../domains/task';
import {
  uploadCabinetFile,
  uploadTaskFile,
  type UploadCabinetInput,
  type UploadMergeView,
  type UploadTaskInput,
} from './upload';

export type UploadCabinetVars = UploadCabinetInput & {
  parentId?: number | null;
};

/** 网盘上传；成功后失效目录列表 */
export function useUploadCabinetFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadCabinetVars) => uploadCabinetFile(input),
    onSuccess: (data: UploadMergeView, vars) => {
      const pid = vars.parentId == null || vars.parentId === 0 ? null : vars.parentId;
      void queryClient.invalidateQueries({ queryKey: fileKeys.list(pid) });
      if (data.file?.id) {
        void queryClient.invalidateQueries({ queryKey: fileKeys.detail(data.file.id) });
      }
    },
  });
}

export type UploadTaskVars = UploadTaskInput;

/** 任务附件上传；成功后失效任务文件列表 */
export function useUploadTaskFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadTaskVars) => uploadTaskFile(input),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.files(vars.taskId) });
    },
  });
}
