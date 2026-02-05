/**
 * OneDragon 通知时机枚举
 */

// 通知时机枚举值
export const NotifyTimingEnum = {
  PREVIOUS_DONE: "NotifyTiming.PREVIOUS_DONE",
  CURRENT_DONE: "NotifyTiming.CURRENT_DONE",
  CURRENT_SUCCESS: "NotifyTiming.CURRENT_SUCCESS",
  CURRENT_FAIL: "NotifyTiming.CURRENT_FAIL",
} as const;

// 通知时机中文映射
export const NotifyTimingLabels: Record<string, string> = {
  "NotifyTiming.PREVIOUS_DONE": "上一节点完成",
  "NotifyTiming.CURRENT_DONE": "当前节点完成",
  "NotifyTiming.CURRENT_SUCCESS": "当前节点成功",
  "NotifyTiming.CURRENT_FAIL": "当前节点失败",
};

// 获取通知时机的中文标签
export function getNotifyTimingLabel(value: string): string {
  return NotifyTimingLabels[value] || value;
}

// 通知时机选项（用于UI选择）
export const NotifyTimingOptions = [
  { value: NotifyTimingEnum.PREVIOUS_DONE, label: "上一节点完成" },
  { value: NotifyTimingEnum.CURRENT_DONE, label: "当前节点完成" },
  { value: NotifyTimingEnum.CURRENT_SUCCESS, label: "当前节点成功" },
  { value: NotifyTimingEnum.CURRENT_FAIL, label: "当前节点失败" },
];

/**
 * 边条件类型中文映射
 */
export const EdgeConditionLabels: Record<string, string> = {
  default: "默认",
  success: "成功时",
  fail: "失败时",
  status: "特定状态",
};

// 获取边条件的中文标签
export function getEdgeConditionLabel(condition?: string): string {
  if (!condition) return "默认";
  return EdgeConditionLabels[condition] || condition;
}

// 边条件选项（用于UI选择）
export const EdgeConditionOptions = [
  { value: "default", label: "默认", color: "#666" },
  { value: "success", label: "成功时", color: "#52c41a" },
  { value: "fail", label: "失败时", color: "#ff4d4f" },
  { value: "status", label: "特定状态", color: "#1890ff" },
];
