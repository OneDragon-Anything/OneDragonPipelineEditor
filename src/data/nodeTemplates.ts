import { NodeTypeEnum } from "../components/flow/nodes";

export interface NodeTemplateType {
  label: string;
  iconName: string;
  iconSize?: number;
  nodeType?: NodeTypeEnum;
  data?: () => any;
  isCustom?: boolean; // 是否为自定义模板
  createTime?: number; // 创建时间戳
}

/**
 * OneDragon 框架节点模板
 * 基于 @operation_node 和 @node_from 装饰器风格
 */
export const nodeTemplates: NodeTemplateType[] = [
  {
    label: "空节点",
    iconName: "icon-kongjiedian",
    iconSize: 32,
    data: () => ({
      methodName: "new_node",
      isStartNode: false,
      saveStatus: false,
      nodeFrom: [],
      nodeNotify: [],
      code: "return self.round_success()",
      comment: "",
    }),
  },
  {
    label: "起始节点",
    iconName: "icon-kaishi",
    iconSize: 28,
    data: () => ({
      methodName: "start_node",
      isStartNode: true,
      saveStatus: false,
      nodeFrom: [],
      nodeNotify: [],
      code: "return self.round_success()",
      comment: "流程起始节点",
    }),
  },
  {
    label: "操作节点",
    iconName: "icon-caozuo",
    iconSize: 28,
    data: () => ({
      methodName: "operation_node",
      isStartNode: false,
      saveStatus: false,
      nodeFrom: [],
      nodeNotify: [],
      code: "# 执行操作\nop = SomeOperation(self.ctx)\nreturn self.round_by_op_result(op.execute())",
      comment: "执行具体操作的节点",
    }),
  },
  {
    label: "判断节点",
    iconName: "icon-panduan",
    iconSize: 28,
    data: () => ({
      methodName: "check_node",
      isStartNode: false,
      saveStatus: false,
      nodeFrom: [],
      nodeNotify: [],
      code: "# 判断条件\nif condition:\n    return self.round_success('状态A')\nelse:\n    return self.round_success('状态B')",
      comment: "根据条件返回不同状态",
    }),
  },
  {
    label: "循环节点",
    iconName: "icon-xunhuan",
    iconSize: 28,
    data: () => ({
      methodName: "loop_node",
      isStartNode: false,
      saveStatus: false,
      nodeFrom: [],
      nodeNotify: [],
      code: "# 循环逻辑\nif self.loop_count < max_count:\n    self.loop_count += 1\n    return self.round_success('继续')\nelse:\n    return self.round_success('完成')",
      comment: "循环执行的节点",
    }),
  },
  {
    label: "通知节点",
    iconName: "icon-tongzhi",
    iconSize: 28,
    data: () => ({
      methodName: "notify_node",
      isStartNode: false,
      saveStatus: false,
      nodeFrom: [],
      nodeNotify: [{ when: "NotifyTiming.CURRENT_DONE", detail: true }],
      code: "return self.round_success()",
      comment: "带通知的节点",
    }),
  },
  {
    label: "结束节点",
    iconName: "icon-jieshu",
    iconSize: 28,
    data: () => ({
      methodName: "end_node",
      isStartNode: false,
      saveStatus: false,
      nodeFrom: [],
      nodeNotify: [],
      code: "# 返回大世界或结束流程\nop = BackToNormalWorld(self.ctx)\nreturn self.round_by_op_result(op.execute())",
      comment: "流程结束节点",
    }),
  },
  {
    label: "保存状态节点",
    iconName: "icon-baocun",
    iconSize: 28,
    data: () => ({
      methodName: "save_status_node",
      isStartNode: false,
      saveStatus: true,
      nodeFrom: [],
      nodeNotify: [],
      code: "# 执行并保存状态\nreturn self.round_success()",
      comment: "执行后保存状态的节点",
    }),
  },
  {
    label: "外部节点",
    iconName: "icon-xiaofangtongdao",
    iconSize: 24,
    nodeType: NodeTypeEnum.External,
  },
  {
    label: "重定向节点 (Anchor)",
    iconName: "icon-ziyuan",
    iconSize: 24,
    nodeType: NodeTypeEnum.Anchor,
  },
];
