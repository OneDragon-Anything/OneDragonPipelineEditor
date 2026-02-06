/**
 * OneDragon Python 导出器
 * 将 Flow 节点和边导出为 Python 装饰器风格的代码
 */

import type { NodeFromParams, NodeNotifyParams } from "../../stores/flow/types";

/**
 * 导出元数据
 */
export interface ExportMetadata {
  className: string;
  baseClass: string;
  imports: string[];
  classVars: Record<string, string>;
  initCode?: string;
}

/**
 * Flow 节点数据（导出用）
 */
export interface FlowNodeData {
  id: string;
  data: {
    label: string;
    methodName: string;
    isStartNode?: boolean;
    saveStatus?: boolean;
    nodeFrom?: NodeFromParams[];
    nodeNotify?: NodeNotifyParams[];
    code?: string;
    comment?: string;
  };
}

/**
 * Flow 边数据（导出用）
 */
export interface FlowEdgeData {
  source: string;
  sourceHandle?: string;    // "default" 或 "status:xxx"
  target: string;
  attributes?: {
    onSuccess?: boolean;    // true=成功时触发
    onFailure?: boolean;    // true=失败时触发
    // 两者都不设=默认(成功)
    // 两者都设=生成两个 @node_from
    status?: string;        // 状态值
    success?: boolean;      // 兼容旧格式
  };
}

/**
 * 生成缩进
 */
function indent(level: number): string {
  return "    ".repeat(level);
}

/**
 * 将方法名转换为合法的 Python 标识符
 */
function sanitizeMethodName(name: string): string {
  // 替换空格和特殊字符
  let result = name
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  // 确保不以数字开头
  if (/^\d/.test(result)) {
    result = "_" + result;
  }

  return result || "unnamed_method";
}

/**
 * 生成 @node_from 装饰器
 * 注意：框架中默认=成功，只有 success=false 时才需要生成 success=False
 */
function generateNodeFromDecorator(nodeFrom: NodeFromParams): string {
  const params: string[] = [];

  params.push(`from_name='${nodeFrom.from_name}'`);

  // 只有失败时才生成 success=False（默认就是成功）
  if (nodeFrom.success === false) {
    params.push("success=False");
  }

  if (nodeFrom.status !== undefined) {
    // 检查是否是变量引用（如 ClassName.STATUS_XXX）
    if (nodeFrom.status.includes(".") || nodeFrom.status.startsWith("STATUS_")) {
      params.push(`status=${nodeFrom.status}`);
    } else {
      params.push(`status='${nodeFrom.status}'`);
    }
  }

  return `@node_from(${params.join(", ")})`;
}

/**
 * 生成 @node_notify 装饰器
 */
function generateNodeNotifyDecorator(notify: NodeNotifyParams): string {
  const params: string[] = [];

  params.push(`when=${notify.when}`);

  if (notify.detail !== undefined) {
    params.push(`detail=${notify.detail ? "True" : "False"}`);
  }

  return `@node_notify(${params.join(", ")})`;
}

/**
 * 生成 @operation_node 装饰器
 */
function generateOperationNodeDecorator(
  name: string,
  isStartNode?: boolean,
  saveStatus?: boolean
): string {
  const params: string[] = [];

  params.push(`name='${name}'`);

  if (isStartNode) {
    params.push("is_start_node=True");
  }

  if (saveStatus) {
    params.push("save_status=True");
  }

  return `@operation_node(${params.join(", ")})`;
}

/**
 * 生成方法代码
 */
function generateMethod(
  node: FlowNodeData,
  nodeFromList: NodeFromParams[]
): string {
  const lines: string[] = [];
  const data = node.data;

  // 生成 @node_from 装饰器
  for (const nodeFrom of nodeFromList) {
    lines.push(indent(1) + generateNodeFromDecorator(nodeFrom));
  }

  // 生成 @node_notify 装饰器
  if (data.nodeNotify && data.nodeNotify.length > 0) {
    for (const notify of data.nodeNotify) {
      lines.push(indent(1) + generateNodeNotifyDecorator(notify));
    }
  }

  // 生成 @operation_node 装饰器
  lines.push(
    indent(1) +
      generateOperationNodeDecorator(data.label, data.isStartNode, data.saveStatus)
  );

  // 生成方法定义
  const methodName = sanitizeMethodName(data.methodName || data.label);
  lines.push(indent(1) + `def ${methodName}(self) -> OperationRoundResult:`);

  // 生成文档字符串
  if (data.comment) {
    lines.push(indent(2) + `"""${data.comment}"""`);
  }

  // 生成方法体
  const code = data.code || "return self.round_success()";
  const codeLines = code.split("\n");
  for (const codeLine of codeLines) {
    lines.push(indent(2) + codeLine);
  }

  return lines.join("\n");
}

/**
 * 从边数据构建 nodeFrom 映射
 * 返回: { 目标节点ID: NodeFromParams[] }
 *
 * sourceHandle 只基于 status:
 * - "default" = 无状态条件
 * - "status:xxx" = 指定状态值
 *
 * onSuccess/onFailure 从 attributes 读取，支持多选：
 * - 两个都不设 = 默认（成功），生成一个 @node_from
 * - onSuccess=true = 成功时触发，生成一个 @node_from
 * - onFailure=true = 失败时触发，生成一个 @node_from(success=False)
 * - 两个都设 = 生成两个 @node_from（一个默认，一个 success=False）
 */
function buildNodeFromMap(
  nodes: FlowNodeData[],
  edges: FlowEdgeData[]
): Map<string, NodeFromParams[]> {
  const nodeIdToLabel = new Map<string, string>();
  for (const node of nodes) {
    nodeIdToLabel.set(node.id, node.data.label);
  }

  const nodeFromMap = new Map<string, NodeFromParams[]>();

  for (const edge of edges) {
    const sourceLabel = nodeIdToLabel.get(edge.source);
    const targetId = edge.target;

    if (!sourceLabel) continue;

    const sourceHandle = edge.sourceHandle || "default";
    const attrs = edge.attributes || {};

    // 解析 status
    let status: string | undefined;
    if (sourceHandle.startsWith("status:")) {
      status = sourceHandle.replace("status:", "");
    } else if (sourceHandle === "status" && attrs.status) {
      status = attrs.status;
    }

    // 读取 onSuccess/onFailure，兼容旧的 success 字段
    let onSuccess = attrs.onSuccess;
    let onFailure = attrs.onFailure;

    // 兼容旧格式: success 字段
    if (onSuccess === undefined && onFailure === undefined && attrs.success !== undefined) {
      if (attrs.success === false) {
        onFailure = true;
      } else {
        onSuccess = true;
      }
    }

    if (!nodeFromMap.has(targetId)) {
      nodeFromMap.set(targetId, []);
    }

    // 根据勾选情况生成 nodeFrom 条目
    if (onSuccess && onFailure) {
      // 两个都勾选 → 生成两个 @node_from
      const nodeFromSuccess: NodeFromParams = { from_name: sourceLabel };
      if (status) nodeFromSuccess.status = status;
      // success 不设置（默认=成功）
      nodeFromMap.get(targetId)!.push(nodeFromSuccess);

      const nodeFromFailure: NodeFromParams = { from_name: sourceLabel, success: false };
      if (status) nodeFromFailure.status = status;
      nodeFromMap.get(targetId)!.push(nodeFromFailure);
    } else if (onFailure) {
      // 只勾失败
      const nodeFrom: NodeFromParams = { from_name: sourceLabel, success: false };
      if (status) nodeFrom.status = status;
      nodeFromMap.get(targetId)!.push(nodeFrom);
    } else {
      // 默认或只勾成功 → 生成一个默认的 @node_from
      const nodeFrom: NodeFromParams = { from_name: sourceLabel };
      if (status) nodeFrom.status = status;
      nodeFromMap.get(targetId)!.push(nodeFrom);
    }
  }

  return nodeFromMap;
}

/**
 * 生成默认的导入语句
 */
function generateDefaultImports(): string[] {
  return [
    "from typing import ClassVar",
    "",
    "from one_dragon.base.operation.operation_edge import node_from",
    "from one_dragon.base.operation.operation_node import operation_node",
    "from one_dragon.base.operation.operation_notify import NotifyTiming, node_notify",
    "from one_dragon.base.operation.operation_round_result import OperationRoundResult",
  ];
}

/**
 * 生成完整的 Python 类代码
 */
export function generatePythonClass(
  nodes: FlowNodeData[],
  edges: FlowEdgeData[],
  metadata?: Partial<ExportMetadata>
): string {
  const lines: string[] = [];

  // 导入语句
  const imports = metadata?.imports || generateDefaultImports();
  lines.push(...imports);
  lines.push("");
  lines.push("");

  // 类定义
  const className = metadata?.className || "GeneratedApp";
  const baseClass = metadata?.baseClass || "ZApplication";
  lines.push(`class ${className}(${baseClass}):`);
  lines.push("");

  // 类变量
  if (metadata?.classVars && Object.keys(metadata.classVars).length > 0) {
    for (const [name, value] of Object.entries(metadata.classVars)) {
      lines.push(indent(1) + `${name}: ClassVar[str] = '${value}'`);
    }
    lines.push("");
  }

  // __init__ 方法
  if (metadata?.initCode) {
    lines.push(indent(1) + "def __init__(self, ctx: ZContext):");
    const initLines = metadata.initCode.split("\n");
    for (const line of initLines) {
      lines.push(indent(2) + line);
    }
    lines.push("");
  }

  // 构建 nodeFrom 映射
  const nodeFromMap = buildNodeFromMap(nodes, edges);

  // 过滤出 Pipeline 节点（排除 external 和 anchor）
  const pipelineNodes = nodes.filter(
    (n) => !n.id.startsWith("external_") && !n.id.startsWith("anchor_")
  );

  // 按照起始节点优先排序
  const sortedNodes = [...pipelineNodes].sort((a, b) => {
    if (a.data.isStartNode && !b.data.isStartNode) return -1;
    if (!a.data.isStartNode && b.data.isStartNode) return 1;
    return 0;
  });

  // 生成每个节点的方法
  for (const node of sortedNodes) {
    const nodeFromList = nodeFromMap.get(node.id) || node.data.nodeFrom || [];
    lines.push(generateMethod(node, nodeFromList));
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 导出为 Python 文件内容
 */
export function exportToPython(
  nodes: FlowNodeData[],
  edges: FlowEdgeData[],
  metadata?: Partial<ExportMetadata>
): string {
  return generatePythonClass(nodes, edges, metadata);
}
