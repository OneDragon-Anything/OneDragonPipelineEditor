/**
 * OneDragon Python 解析器
 * 用于解析基于装饰器风格的 Python 节点工作流代码
 */

import type {
  ParsedOneDragonClass,
  ParsedOneDragonNode,
  OperationNodeParams,
  NodeFromParams,
  NodeNotifyParams,
} from "../../stores/flow/types";

/**
 * 解析 @operation_node 装饰器参数
 */
function parseOperationNodeDecorator(line: string): OperationNodeParams | null {
  // 匹配 @operation_node(name='xxx', is_start_node=True, save_status=True)
  const match = line.match(/@operation_node\s*\((.*?)\)\s*$/);
  if (!match) return null;

  const argsStr = match[1];
  const result: OperationNodeParams = { name: "" };

  // 解析 name 参数
  const nameMatch = argsStr.match(/name\s*=\s*['"]([^'"]+)['"]/);
  if (nameMatch) {
    result.name = nameMatch[1];
  }

  // 解析 is_start_node 参数
  const isStartMatch = argsStr.match(/is_start_node\s*=\s*(True|False)/i);
  if (isStartMatch) {
    result.is_start_node = isStartMatch[1].toLowerCase() === "true";
  }

  // 解析 save_status 参数
  const saveStatusMatch = argsStr.match(/save_status\s*=\s*(True|False)/i);
  if (saveStatusMatch) {
    result.save_status = saveStatusMatch[1].toLowerCase() === "true";
  }

  return result;
}

/**
 * 解析 @node_from 装饰器参数
 */
function parseNodeFromDecorator(line: string): NodeFromParams | null {
  // 匹配 @node_from(from_name='xxx', success=True, status='xxx')
  const match = line.match(/@node_from\s*\((.*?)\)\s*$/);
  if (!match) return null;

  const argsStr = match[1];
  const result: NodeFromParams = { from_name: "" };

  // 解析 from_name 参数
  const fromNameMatch = argsStr.match(/from_name\s*=\s*['"]([^'"]+)['"]/);
  if (fromNameMatch) {
    result.from_name = fromNameMatch[1];
  }

  // 解析 success 参数
  const successMatch = argsStr.match(/success\s*=\s*(True|False)/i);
  if (successMatch) {
    result.success = successMatch[1].toLowerCase() === "true";
  }

  // 解析 status 参数 - 支持字符串和变量引用
  const statusMatch = argsStr.match(/status\s*=\s*(?:['"]([^'"]+)['"]|([A-Za-z_][A-Za-z0-9_.]+))/);
  if (statusMatch) {
    result.status = statusMatch[1] || statusMatch[2];
  }

  return result;
}

/**
 * 解析 @node_notify 装饰器参数
 */
function parseNodeNotifyDecorator(line: string): NodeNotifyParams | null {
  // 匹配 @node_notify(when=NotifyTiming.xxx, detail=True)
  const match = line.match(/@node_notify\s*\((.*?)\)\s*$/);
  if (!match) return null;

  const argsStr = match[1];
  const result: NodeNotifyParams = { when: "" };

  // 解析 when 参数
  const whenMatch = argsStr.match(/when\s*=\s*([A-Za-z_][A-Za-z0-9_.]+)/);
  if (whenMatch) {
    result.when = whenMatch[1];
  }

  // 解析 detail 参数
  const detailMatch = argsStr.match(/detail\s*=\s*(True|False)/i);
  if (detailMatch) {
    result.detail = detailMatch[1].toLowerCase() === "true";
  }

  return result;
}

/**
 * 提取方法的文档字符串
 */
function extractDocstring(lines: string[], startIndex: number): { docstring: string; endIndex: number } | null {
  let i = startIndex;

  // 跳过空行
  while (i < lines.length && lines[i].trim() === "") {
    i++;
  }

  if (i >= lines.length) return null;

  const line = lines[i].trim();

  // 检查是否是文档字符串开始
  if (line.startsWith('"""') || line.startsWith("'''")) {
    const quote = line.startsWith('"""') ? '"""' : "'''";

    // 单行文档字符串
    if (line.endsWith(quote) && line.length > 6) {
      return {
        docstring: line.slice(3, -3).trim(),
        endIndex: i,
      };
    }

    // 多行文档字符串
    let docstring = line.slice(3);
    i++;
    while (i < lines.length) {
      const currentLine = lines[i];
      const endIdx = currentLine.indexOf(quote);
      if (endIdx !== -1) {
        docstring += "\n" + currentLine.slice(0, endIdx);
        return {
          docstring: docstring.trim(),
          endIndex: i,
        };
      }
      docstring += "\n" + currentLine;
      i++;
    }
  }

  return null;
}

/**
 * 提取方法体代码
 */
function extractMethodBody(lines: string[], startIndex: number, baseIndent: number): { code: string; endIndex: number } {
  let code = "";
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];

    // 空行或继续在方法内部
    if (line.trim() === "") {
      code += "\n";
      i++;
      continue;
    }

    // 计算当前行的缩进
    const currentIndent = line.search(/\S/);

    // 如果缩进小于等于基础缩进，说明方法结束了
    // 但要排除装饰器（以@开头）
    if (currentIndent <= baseIndent && !line.trim().startsWith("@") && !line.trim().startsWith("#")) {
      break;
    }

    // 如果是下一个方法的装饰器，结束当前方法
    if (line.trim().startsWith("@operation_node") ||
        line.trim().startsWith("@node_from") ||
        line.trim().startsWith("@node_notify") ||
        line.trim().match(/^\s*def\s+/)) {
      // 检查是否是方法定义行的缩进
      if (currentIndent <= baseIndent) {
        break;
      }
    }

    // 移除基础缩进
    const relativeLine = line.slice(Math.min(baseIndent + 4, line.search(/\S/) >= 0 ? line.search(/\S/) : 0));
    code += relativeLine + "\n";
    i++;
  }

  return { code: code.trimEnd(), endIndex: i - 1 };
}

/**
 * 解析单个方法
 */
function parseMethod(lines: string[], startIndex: number): { node: ParsedOneDragonNode | null; endIndex: number } {
  let i = startIndex;
  const nodeFromList: NodeFromParams[] = [];
  const nodeNotifyList: NodeNotifyParams[] = [];
  let operationNode: OperationNodeParams | null = null;

  // 收集装饰器
  while (i < lines.length) {
    const line = lines[i].trim();

    // 跳过空行和注释
    if (line === "" || line.startsWith("#")) {
      i++;
      continue;
    }

    // 解析 @node_from
    if (line.startsWith("@node_from")) {
      const nodeFrom = parseNodeFromDecorator(line);
      if (nodeFrom) {
        nodeFromList.push(nodeFrom);
      }
      i++;
      continue;
    }

    // 解析 @node_notify
    if (line.startsWith("@node_notify")) {
      const notify = parseNodeNotifyDecorator(line);
      if (notify) {
        nodeNotifyList.push(notify);
      }
      i++;
      continue;
    }

    // 解析 @operation_node
    if (line.startsWith("@operation_node")) {
      operationNode = parseOperationNodeDecorator(line);
      i++;
      continue;
    }

    // 遇到方法定义
    const defMatch = line.match(/def\s+(\w+)\s*\(/);
    if (defMatch) {
      if (!operationNode) {
        // 不是 operation_node 方法，跳过
        return { node: null, endIndex: i };
      }

      const methodName = defMatch[1];
      const baseIndent = lines[i].search(/\S/);
      i++;

      // 跳过方法签名的续行
      while (i < lines.length && !lines[i - 1].includes(":")) {
        i++;
      }

      // 提取文档字符串
      let docstring = "";
      const docResult = extractDocstring(lines, i);
      if (docResult) {
        docstring = docResult.docstring;
        i = docResult.endIndex + 1;
      }

      // 提取方法体
      const bodyResult = extractMethodBody(lines, i, baseIndent);

      return {
        node: {
          methodName,
          operationNode,
          nodeFromList,
          nodeNotifyList: nodeNotifyList.length > 0 ? nodeNotifyList : undefined,
          code: bodyResult.code,
          docstring: docstring || undefined,
        },
        endIndex: bodyResult.endIndex,
      };
    }

    // 其他行，跳出装饰器收集
    break;
  }

  return { node: null, endIndex: i };
}

/**
 * 解析类变量（ClassVar）
 */
function parseClassVars(lines: string[], classStartIndex: number): Record<string, string> {
  const classVars: Record<string, string> = {};

  for (let i = classStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过空行和注释
    if (line === "" || line.startsWith("#")) continue;

    // 检测到方法定义，停止
    if (line.startsWith("def ") || line.startsWith("@")) break;

    // 匹配 STATUS_XXX: ClassVar[str] = 'xxx' 格式
    const classVarMatch = line.match(/^(\w+)\s*:\s*ClassVar\[.*?\]\s*=\s*['"](.+)['"]/);
    if (classVarMatch) {
      classVars[classVarMatch[1]] = classVarMatch[2];
    }
  }

  return classVars;
}

/**
 * 解析导入语句
 */
function parseImports(content: string): string[] {
  const imports: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) {
      imports.push(trimmed);
    }
    // 类定义开始后停止
    if (trimmed.startsWith("class ")) break;
  }

  return imports;
}

/**
 * 解析 __init__ 方法
 */
function parseInitMethod(lines: string[], startIndex: number): { code: string; endIndex: number } | null {
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("def __init__")) {
      const baseIndent = lines[i].search(/\S/);
      let j = i + 1;

      // 跳过方法签名
      while (j < lines.length && !lines[j - 1].includes(":")) {
        j++;
      }

      // 提取方法体
      const bodyResult = extractMethodBody(lines, j, baseIndent);
      return { code: bodyResult.code, endIndex: bodyResult.endIndex };
    }

    // 遇到 @operation_node 说明 __init__ 不存在或已经过去
    if (line.startsWith("@operation_node")) {
      return null;
    }
  }

  return null;
}

/**
 * 解析整个 Python 文件
 */
export function parsePythonFile(content: string): ParsedOneDragonClass {
  const lines = content.split("\n");

  // 解析导入
  const imports = parseImports(content);

  // 查找类定义
  let className = "";
  let baseClass = "";
  let classStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const classMatch = line.match(/^class\s+(\w+)\s*(?:\(([^)]+)\))?\s*:/);
    if (classMatch) {
      className = classMatch[1];
      baseClass = classMatch[2] || "";
      classStartIndex = i + 1;
      break;
    }
  }

  // 如果没有找到类定义，返回空结果
  if (!className || classStartIndex === -1) {
    return {
      className: "UnnamedClass",
      baseClass: "",
      imports: [],
      classVars: {},
      nodes: [],
    };
  }

  // 解析类变量
  const classVars = parseClassVars(lines, classStartIndex);

  // 解析 __init__ 方法
  const initResult = parseInitMethod(lines, classStartIndex);

  // 解析所有 operation_node 方法
  const nodes: ParsedOneDragonNode[] = [];
  let i = classStartIndex;

  while (i < lines.length) {
    const line = lines[i].trim();

    // 查找装饰器开始
    if (line.startsWith("@node_from") || line.startsWith("@node_notify") || line.startsWith("@operation_node")) {
      const result = parseMethod(lines, i);
      if (result.node) {
        nodes.push(result.node);
      }
      i = result.endIndex + 1;
      continue;
    }

    i++;
  }

  return {
    className,
    baseClass,
    imports,
    classVars,
    initCode: initResult?.code,
    nodes,
  };
}

/**
 * 将解析结果转换为 Flow 节点和边
 */
export function convertToFlowData(parsed: ParsedOneDragonClass): {
  nodes: any[];
  edges: any[];
  metadata: {
    className: string;
    baseClass: string;
    imports: string[];
    classVars: Record<string, string>;
    initCode?: string;
  };
} {
  const flowNodes: any[] = [];

  // 创建节点名到ID的映射
  const nameToId: Record<string, string> = {};

  // 第一遍：创建所有节点
  parsed.nodes.forEach((node, index) => {
    const nodeId = `node_${index + 1}`;
    nameToId[node.operationNode.name] = nodeId;

    flowNodes.push({
      id: nodeId,
      type: "pipeline",
      position: { x: 200 + (index % 4) * 300, y: 100 + Math.floor(index / 4) * 200 },
      data: {
        label: node.operationNode.name,
        methodName: node.methodName,
        isStartNode: node.operationNode.is_start_node || false,
        saveStatus: node.operationNode.save_status || false,
        nodeFrom: node.nodeFromList,
        nodeNotify: node.nodeNotifyList || [],
        code: node.code,
        comment: node.docstring || "",
      },
    });
  });

  // 第二遍：创建边（基于 node_from）
  // sourceHandle 只基于 status，success/fail 存储在 attributes 中
  const edgeMap = new Map<string, any>(); // key: `${sourceId}_${targetId}_${sourceHandle}_${success}`

  parsed.nodes.forEach((node) => {
    const targetId = nameToId[node.operationNode.name];

    for (const nodeFrom of node.nodeFromList) {
      let sourceId = nameToId[nodeFrom.from_name];

      // 如果源节点不存在，创建外部节点
      if (!sourceId) {
        const externalId = `external_${nodeFrom.from_name}`;
        if (!nameToId[nodeFrom.from_name]) {
          nameToId[nodeFrom.from_name] = externalId;
          flowNodes.push({
            id: externalId,
            type: "external",
            position: { x: 50, y: 100 + flowNodes.length * 80 },
            data: {
              label: nodeFrom.from_name,
            },
          });
        }
        sourceId = nameToId[nodeFrom.from_name];
      }

      if (sourceId && targetId) {
        // sourceHandle 只基于 status（决定出口）
        const hasStatus = nodeFrom.status !== undefined && nodeFrom.status !== "";
        const sourceHandle = hasStatus ? `status:${nodeFrom.status}` : "default";

        // 使用不含 success 的 key 来合并同一出口的成功/失败边
        const edgeKey = `${sourceId}_${targetId}_${sourceHandle}`;

        if (!edgeMap.has(edgeKey)) {
          // 创建新边，根据 nodeFrom.success 设置 onSuccess/onFailure
          const attrs: any = {};
          if (nodeFrom.status !== undefined) {
            attrs.status = nodeFrom.status;
          }

          if (nodeFrom.success === false) {
            attrs.onFailure = true;
          } else {
            // undefined 或 true 都视为成功
            attrs.onSuccess = true;
          }

          edgeMap.set(edgeKey, {
            id: `edge_${edgeKey}`,
            source: sourceId,
            sourceHandle: sourceHandle,
            target: targetId,
            targetHandle: "target",
            type: "marked",
            attributes: attrs,
          });
        } else {
          // 已有同一出口的边，合并 onSuccess/onFailure
          const existing = edgeMap.get(edgeKey)!;
          if (!existing.attributes) existing.attributes = {};

          if (nodeFrom.success === false) {
            existing.attributes.onFailure = true;
          } else {
            existing.attributes.onSuccess = true;
          }
        }
      }
    }
  });

  // 转换 map 为数组
  const flowEdges = Array.from(edgeMap.values());

  return {
    nodes: flowNodes,
    edges: flowEdges,
    metadata: {
      className: parsed.className,
      baseClass: parsed.baseClass || "",
      imports: parsed.imports,
      classVars: parsed.classVars,
      initCode: parsed.initCode,
    },
  };
}
