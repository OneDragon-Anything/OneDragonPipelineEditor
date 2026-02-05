import type {
  ReactFlowInstance,
  Viewport,
  NodeChange,
  EdgeChange,
  Connection,
} from "@xyflow/react";
import { NodeTypeEnum, SourceHandleTypeEnum, TargetHandleTypeEnum } from "../../components/flow/nodes";
import type { HandleDirection } from "../../components/flow/nodes/constants";

// 位置类型
export type PositionType = {
  x: number;
  y: number;
};

// ========== OneDragon 节点连接类型 ==========

/**
 * 连接条件类型
 * - default: 默认连接（无条件）
 * - success: 成功时连接
 * - fail: 失败时连接
 * - status: 特定状态时连接
 */
export type EdgeConditionType = 'default' | 'success' | 'fail' | 'status';

// 边属性类型 - OneDragon 风格
export type EdgeAttributesType = {
  condition?: EdgeConditionType;  // 连接条件
  status?: string;                 // 当 condition 为 'status' 时的具体状态值
};

// 边类型
export type EdgeType = {
  id: string;
  source: string;                      // 源节点 ID
  sourceHandle: SourceHandleTypeEnum;
  target: string;                      // 目标节点 ID
  targetHandle: TargetHandleTypeEnum;
  label?: string | number;             // 边的标签
  type: "marked";
  selected?: boolean;
  attributes?: EdgeAttributesType;
};

// ========== OneDragon 节点属性类型 ==========

/**
 * @operation_node 装饰器参数
 */
export type OperationNodeParams = {
  name: string;                   // 节点名称
  is_start_node?: boolean;        // 是否为起始节点
  save_status?: boolean;          // 是否保存状态
};

/**
 * @node_from 装饰器参数 - 定义来源连接
 */
export type NodeFromParams = {
  from_name: string;              // 源节点名称
  success?: boolean;              // 成功/失败条件
  status?: string;                // 状态条件
};

/**
 * @node_notify 装饰器参数
 */
export type NodeNotifyParams = {
  when: string;                   // 通知时机 (如 NotifyTiming.CURRENT_DONE)
  detail?: boolean;               // 是否包含详情
};

// OneDragon 节点数据类型
export type OneDragonNodeDataType = {
  label: string;                           // 节点名称 (对应 @operation_node 的 name)
  methodName: string;                      // Python 方法名
  isStartNode?: boolean;                   // 是否为起始节点
  saveStatus?: boolean;                    // 是否保存状态
  nodeFrom?: NodeFromParams[];             // 来源连接列表
  nodeNotify?: NodeNotifyParams[];         // 通知配置列表
  returnType?: string;                     // 返回类型描述
  comment?: string;                        // 节点注释/描述
  code?: string;                           // 方法体代码
  handleDirection?: HandleDirection;       // 端点方向
};

// External 节点数据类型 (保留用于外部引用)
export type ExternalNodeDataType = {
  label: string;
  handleDirection?: HandleDirection;
};

// Anchor 重定向节点数据类型
export type AnchorNodeDataType = {
  label: string;
  handleDirection?: HandleDirection;
};

// OneDragon Pipeline 节点类型
export interface OneDragonNodeType {
  id: string;
  type: NodeTypeEnum;
  data: OneDragonNodeDataType;
  position: PositionType;
  dragging?: boolean;
  selected?: boolean;
  measured?: {
    width: number;
    height: number;
  };
}

// External 节点类型
export interface ExternalNodeType {
  id: string;
  type: NodeTypeEnum;
  data: ExternalNodeDataType;
  position: PositionType;
  dragging?: boolean;
  selected?: boolean;
  measured?: {
    width: number;
    height: number;
  };
}

// Anchor 重定向节点类型
export interface AnchorNodeType {
  id: string;
  type: NodeTypeEnum;
  data: AnchorNodeDataType;
  position: PositionType;
  dragging?: boolean;
  selected?: boolean;
  measured?: {
    width: number;
    height: number;
  };
}

// 节点联合类型
export type NodeType = OneDragonNodeType | ExternalNodeType | AnchorNodeType;

// ========== 解析相关类型 ==========

/**
 * 解析后的 OneDragon 类信息
 */
export type ParsedOneDragonClass = {
  className: string;                      // 类名
  baseClass?: string;                     // 基类名
  imports: string[];                      // 导入语句
  classVars: Record<string, string>;      // 类变量 (如 STATUS_NO_PLAN)
  initCode?: string;                      // __init__ 方法代码
  nodes: ParsedOneDragonNode[];           // 解析的节点列表
};

/**
 * 解析后的 OneDragon 节点
 */
export type ParsedOneDragonNode = {
  methodName: string;                     // 方法名
  operationNode: OperationNodeParams;     // @operation_node 参数
  nodeFromList: NodeFromParams[];         // @node_from 参数列表
  nodeNotifyList?: NodeNotifyParams[];    // @node_notify 参数列表
  code: string;                           // 方法体代码
  docstring?: string;                     // 文档字符串
};

// ========== Slice 状态类型定义 ==========

// 视口 Slice 状态
export interface FlowViewState {
  instance: ReactFlowInstance | null;
  viewport: Viewport;
  size: { width: number; height: number };
  updateInstance: (instance: ReactFlowInstance) => void;
  updateViewport: (viewport: Viewport) => void;
  updateSize: (width: number, height: number) => void;
}

// 选择 Slice 状态
export interface FlowSelectionState {
  selectedNodes: NodeType[];
  selectedEdges: EdgeType[];
  targetNode: NodeType | null;
  debouncedSelectedNodes: NodeType[];
  debouncedSelectedEdges: EdgeType[];
  debouncedTargetNode: NodeType | null;
  debounceTimeouts: Record<string, number>;
  updateSelection: (nodes: NodeType[], edges: EdgeType[]) => void;
  setTargetNode: (node: NodeType | null) => void;
  clearSelection: () => void;
}

// 历史 Slice 状态
export interface FlowHistoryState {
  historyStack: Array<{ nodes: NodeType[]; edges: EdgeType[] }>;
  historyIndex: number;
  saveTimeout: number | null;
  lastSnapshot: string | null;
  saveHistory: (delay?: number) => void;
  undo: () => boolean;
  redo: () => boolean;
  initHistory: (nodes: NodeType[], edges: EdgeType[]) => void;
  clearHistory: () => void;
  getHistoryState: () => { canUndo: boolean; canRedo: boolean };
}

// 节点 Slice 状态
export interface FlowNodeState {
  nodes: NodeType[];
  nodeIdCounter: number;
  updateNodes: (changes: NodeChange[]) => void;
  addNode: (options?: {
    type?: NodeTypeEnum;
    data?: any;
    position?: PositionType;
    select?: boolean;
    link?: boolean;
    focus?: boolean;
  }) => void;
  setNodeData: (id: string, type: string, key: string, value: any) => void;
  batchSetNodeData: (
    id: string,
    updates: Array<{ type: string; key: string; value: any }>
  ) => void;
  setNodes: (nodes: NodeType[]) => void;
  resetNodeCounter: () => void;
}

// 边 Slice 状态
export interface FlowEdgeState {
  edges: EdgeType[];
  edgeControlResetKey: number;
  updateEdges: (changes: EdgeChange[]) => void;
  setEdgeData: (id: string, key: string, value: any) => void;
  setEdgeLabel: (id: string, newLabel: string | number) => void;
  addEdge: (co: Connection, options?: { isCheck?: boolean }) => void;
  setEdges: (edges: EdgeType[]) => void;
  resetEdgeControls: () => void;
}

// 图数据 Slice 状态
export interface FlowGraphState {
  pasteIdCounter: number;
  replace: (
    nodes: NodeType[],
    edges: EdgeType[],
    options?: { isFitView?: boolean; skipHistory?: boolean; skipSave?: boolean }
  ) => void;
  paste: (nodes: NodeType[], edges: EdgeType[]) => void;
  resetPasteCounter: () => void;
  shiftNodes: (
    direction: "horizontal" | "vertical",
    delta: number,
    targetNodeIds?: string[]
  ) => void;
}

// 路径 Slice 状态
export interface FlowPathState {
  pathMode: boolean;
  pathStartNodeId: string | null;
  pathEndNodeId: string | null;
  pathNodeIds: Set<string>;
  pathEdgeIds: Set<string>;
  setPathMode: (enabled: boolean) => void;
  setPathStartNode: (nodeId: string | null) => void;
  setPathEndNode: (nodeId: string | null) => void;
  calculatePath: () => void;
  clearPath: () => void;
}

// 合并的 Flow Store 类型
export type FlowStore = FlowViewState &
  FlowSelectionState &
  FlowHistoryState &
  FlowNodeState &
  FlowEdgeState &
  FlowGraphState &
  FlowPathState;
