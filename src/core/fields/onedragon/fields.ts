/**
 * OneDragon 节点字段定义
 * 用于节点编辑面板
 */

import { FieldTypeEnum } from "../fieldTypes";
import type { FieldType, FieldsType } from "../types";

/**
 * OneDragon 节点基本字段 Schema
 */
export const oneDragonFieldSchema: Record<string, FieldType> = {
  // 节点名称
  label: {
    key: "label",
    displayName: "节点名称",
    type: FieldTypeEnum.String,
    default: "",
    desc: "节点的显示名称，对应 @operation_node 的 name 参数",
  },

  // 方法名
  methodName: {
    key: "methodName",
    displayName: "方法名",
    type: FieldTypeEnum.String,
    default: "",
    desc: "Python 方法名，自动生成或手动指定",
  },

  // 是否为起始节点
  isStartNode: {
    key: "isStartNode",
    displayName: "起始节点",
    type: FieldTypeEnum.Bool,
    default: false,
    desc: "是否为流程的起始节点，对应 is_start_node 参数",
  },

  // 是否保存状态
  saveStatus: {
    key: "saveStatus",
    displayName: "保存状态",
    type: FieldTypeEnum.Bool,
    default: false,
    desc: "是否在执行后保存节点状态，对应 save_status 参数",
  },

  // 返回类型
  returnType: {
    key: "returnType",
    displayName: "返回类型",
    type: FieldTypeEnum.String,
    default: "OperationRoundResult",
    desc: "方法返回类型",
  },

  // 节点注释
  comment: {
    key: "comment",
    displayName: "注释",
    type: FieldTypeEnum.String,
    default: "",
    desc: "节点的描述信息，将作为 Python 文档字符串",
  },

  // 方法体代码
  code: {
    key: "code",
    displayName: "代码",
    type: FieldTypeEnum.String,
    default: "return self.round_success()",
    desc: "方法体代码",
  },
};

/**
 * 节点来源连接字段 (@node_from)
 */
export const nodeFromFieldSchema: Record<string, FieldType> = {
  // 源节点名称
  from_name: {
    key: "from_name",
    displayName: "源节点",
    type: FieldTypeEnum.String,
    default: "",
    desc: "来源节点的名称",
  },

  // 成功/失败条件
  success: {
    key: "success",
    displayName: "成功条件",
    type: FieldTypeEnum.String,
    default: "",
    options: [
      { label: "无条件", value: "" },
      { label: "成功时", value: "true" },
      { label: "失败时", value: "false" },
    ],
    desc: "连接条件：成功或失败时触发",
  },

  // 状态条件
  status: {
    key: "status",
    displayName: "状态",
    type: FieldTypeEnum.String,
    default: "",
    desc: "特定状态时触发连接",
  },
};

/**
 * 节点通知字段 (@node_notify)
 */
export const nodeNotifyFieldSchema: Record<string, FieldType> = {
  // 通知时机
  when: {
    key: "when",
    displayName: "通知时机",
    type: FieldTypeEnum.String,
    default: "NotifyTiming.CURRENT_DONE",
    options: [
      { label: "当前完成", value: "NotifyTiming.CURRENT_DONE" },
      { label: "开始前", value: "NotifyTiming.BEFORE_START" },
      { label: "结束后", value: "NotifyTiming.AFTER_END" },
    ],
    desc: "触发通知的时机",
  },

  // 是否包含详情
  detail: {
    key: "detail",
    displayName: "包含详情",
    type: FieldTypeEnum.Bool,
    default: false,
    desc: "通知是否包含详细信息",
  },
};

/**
 * OneDragon 节点字段配置
 */
export const oneDragonNodeFields: FieldsType = {
  params: [
    oneDragonFieldSchema.label,
    oneDragonFieldSchema.methodName,
    oneDragonFieldSchema.isStartNode,
    oneDragonFieldSchema.saveStatus,
    oneDragonFieldSchema.comment,
    oneDragonFieldSchema.code,
  ],
  desc: "OneDragon 操作节点配置",
};

/**
 * 获取所有 OneDragon 字段的键列表
 */
export const oneDragonFieldSchemaKeyList = Object.keys(oneDragonFieldSchema);
