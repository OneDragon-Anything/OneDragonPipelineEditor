/**
 * 节点源句柄类型枚举 - OneDragon 风格
 * 用于表示节点的输出连接类型
 */
export enum SourceHandleTypeEnum {
  Default = "default",    // 默认输出（无条件）
  Success = "success",    // 成功时输出
  Fail = "fail",         // 失败时输出
  Status = "status",      // 特定状态输出
  // 旧的枚举值（保持兼容）
  Next = "default",       // 别名，等同于 Default
  Error = "fail",         // 别名，等同于 Fail
}

/**
 * 节点目标句柄类型枚举
 */
export enum TargetHandleTypeEnum {
  Target = "target",      // 标准输入
  JumpBack = "jumpback",  // 回跳输入（保持兼容）
}

/**节点类型枚举 */
export enum NodeTypeEnum {
  Pipeline = "pipeline",
  External = "external",
  Anchor = "anchor",
}

/**
 * 边条件类型
 */
export type EdgeConditionType = 'default' | 'success' | 'fail' | 'status';

/**
 * 边条件选项（用于UI）
 */
export const EDGE_CONDITION_OPTIONS: {
  value: EdgeConditionType;
  label: string;
  color: string;
}[] = [
  { value: "default", label: "默认", color: "#666" },
  { value: "success", label: "成功", color: "#52c41a" },
  { value: "fail", label: "失败", color: "#ff4d4f" },
  { value: "status", label: "状态", color: "#1890ff" },
];

/**节点端点位置类型
 * - left-right: 左入右出（默认）
 * - right-left: 右入左出
 * - top-bottom: 上入下出
 * - bottom-top: 下入上出
 */
export type HandleDirection =
  | "left-right"
  | "right-left"
  | "top-bottom"
  | "bottom-top";

/**默认节点端点位置 */
export const DEFAULT_HANDLE_DIRECTION: HandleDirection = "left-right";

/**节点端点位置选项 */
export const HANDLE_DIRECTION_OPTIONS: {
  value: HandleDirection;
  label: string;
}[] = [
  { value: "left-right", label: "左右" },
  { value: "right-left", label: "右左" },
  { value: "top-bottom", label: "上下" },
  { value: "bottom-top", label: "下上" },
];
