# 快捷键与手势（shortcut）

优先级：P0 · 前端状态：wip

设置页：`/manage/setting/keyboard`（一览）。

## 全局（已落地）

| 快捷键         | 行为                              |
| -------------- | --------------------------------- |
| ⌘/Ctrl+K       | 打开全局搜索                      |
| ⌘/Ctrl+Shift+P | 打开新建项目弹层                  |
| ⌘/Ctrl+Shift+M | 进入会议                          |
| Esc            | 关闭当前 Modal / 详情（组件自带） |

输入框 / `contenteditable` 内忽略修饰键快捷键（Esc 除外；消息页 ⌘/Ctrl+Shift+U、⌘/Ctrl+Enter 除外）。平台修饰键：桌面 ⌘，Web Ctrl。

## 场景

| 场景      | 内容                                         |
| --------- | -------------------------------------------- |
| messenger | ⌘/Ctrl+Enter 发送；⌘/Ctrl+Shift+U 下一条未读 |
| task      | ⌘/Ctrl+E 完成/重开；Esc 关闭详情             |
| electron  | 托盘显示/隐藏；系统通知（见 [electron.md](./electron.md)） |

## 移动手势

侧滑返回、长按应用卡片排序、触屏禁用看板拖拽（`navMode=tabbar` 时已关 DnD）。
