import type { StateCreator } from "zustand";
import { applyNodeChanges, type NodeChange } from "@xyflow/react";
import type {
  FlowStore,
  FlowNodeState,
  NodeType,
  PipelineNodeType,
} from "../types";
import {
  NodeTypeEnum,
  TargetHandleTypeEnum,
} from "../../../components/flow/nodes";
import {
  createPipelineNode,
  createExternalNode,
  createAnchorNode,
  findNodeByLabel,
  findNodeById,
  findNodeIndexById,
  calcuNodePosition,
  checkRepeatNodeLabelList as checkRepeatNodeLabelListUtil,
} from "../utils/nodeUtils";
import { fitFlowView } from "../utils/viewportUtils";
import { assignNodeOrder, removeNodeOrder } from "../../fileStore";
import { ErrorTypeEnum, useErrorStore } from "../../errorStore";
import { useConfigStore } from "../../configStore";
import { useFileStore } from "../../fileStore";

export const createNodeSlice: StateCreator<FlowStore, [], [], FlowNodeState> = (
  set,
  get
) => ({
  // 初始状态
  nodes: [],
  nodeIdCounter: 1,

  // 更新节点
  updateNodes(changes: NodeChange[]) {
    // 收集被删除的节点 ID
    const removedIds = new Set<string>();
    changes.forEach((change) => {
      if (change.type === "remove") {
        removedIds.add(change.id);
      }
    });

    set((state) => {
      const updatedNodes = applyNodeChanges(changes, state.nodes);
      const nodes = updatedNodes as NodeType[];

      const updates: Partial<typeof state> = { nodes };

      // 清理被删除节点的选中状态
      if (removedIds.size > 0) {
        // 检查 targetNode 是否被删除
        if (state.targetNode && removedIds.has(state.targetNode.id)) {
          updates.targetNode = null;
          updates.debouncedTargetNode = null;
        }

        // 清理 selectedNodes 中被删除的节点
        const filteredSelectedNodes = state.selectedNodes.filter(
          (node) => !removedIds.has(node.id)
        );
        if (filteredSelectedNodes.length !== state.selectedNodes.length) {
          updates.selectedNodes = filteredSelectedNodes;
          updates.debouncedSelectedNodes = filteredSelectedNodes;
        }
      }

      return updates;
    });

    // 清理删除节点的顺序
    removedIds.forEach((id) => {
      removeNodeOrder(id);
    });

    // 保存历史记录
    const hasRemove = changes.some((change) => change.type === "remove");
    const hasPosition = changes.some((change) => change.type === "position");
    const isDragging = changes.some(
      (change) => change.type === "position" && change.dragging
    );

    if (hasRemove) {
      get().saveHistory(0);
    } else if (hasPosition) {
      get().saveHistory(isDragging ? 1000 : 0);
    }
  },

  // 添加节点
  addNode(options) {
    const {
      type = NodeTypeEnum.Pipeline,
      data,
      position,
      select = false,
      link = false,
      focus = false,
    } = options || {};

    set((state) => {
      const selectedNodes = state.selectedNodes;
      let nodes = [...state.nodes];

      // 取消所有选中
      if (select) {
        nodes = nodes.map((node) => ({ ...node, selected: false }));
      }

      // 生成 ID 和 label
      let id = String(state.nodeIdCounter);
      let labelBase;
      switch (type) {
        case NodeTypeEnum.Pipeline:
          labelBase = "新建节点";
          break;
        case NodeTypeEnum.External:
          labelBase = "外部节点";
          break;
        case NodeTypeEnum.Anchor:
          labelBase = "重定向节点";
          break;
      }

      let label = labelBase + id;
      let counter = state.nodeIdCounter;

      while (findNodeByLabel(nodes, label) || findNodeById(nodes, id)) {
        counter++;
        id = String(counter);
        label = labelBase + id;
      }

      // 创建节点
      // 获取默认节点方向
      const defaultHandleDirection =
        useConfigStore.getState().configs.defaultHandleDirection;
      const handleDirection =
        defaultHandleDirection === "left-right"
          ? undefined
          : defaultHandleDirection;

      const nodeOptions = {
        label,
        position:
          position ??
          calcuNodePosition(selectedNodes, state.viewport, state.size),
        datas: {
          ...data,
          handleDirection,
        },
        select,
      };

      let newNode: NodeType;
      switch (type) {
        case NodeTypeEnum.Pipeline:
          newNode = createPipelineNode(id, nodeOptions);
          break;
        case NodeTypeEnum.External:
          newNode = createExternalNode(id, nodeOptions);
          break;
        case NodeTypeEnum.Anchor:
          newNode = createAnchorNode(id, nodeOptions);
          break;
        default:
          throw new Error(`Unknown node type: ${type}`);
      }

      // 添加连接
      if (link && selectedNodes.length > 0) {
        selectedNodes.forEach((node) => {
          if (
            node.type === NodeTypeEnum.External ||
            node.type === NodeTypeEnum.Anchor
          )
            return;
          get().addEdge({
            source: node.id,
            sourceHandle: "default",  // OneDragon 风格默认出口
            target: id,
            targetHandle: TargetHandleTypeEnum.Target,
          });
        });
      }

      // 添加节点
      nodes.push(newNode);

      // 分配顺序号
      assignNodeOrder(id);

      // 更新选择状态
      if (select) {
        get().updateSelection([newNode], []);
      }

      // 聚焦
      if (focus) {
        fitFlowView(state.instance, state.viewport, { focusNodes: [newNode] });
      }

      return {
        nodes,
        nodeIdCounter: counter + 1,
      };
    });

    // 保存历史记录
    get().saveHistory(0);
  },

  // 更新节点数据 - OneDragon 格式
  setNodeData(id: string, type: string, key: string, value: any) {
    set((state) => {
      const nodeIndex = findNodeIndexById(state.nodes, id);
      if (nodeIndex < 0) return {};

      let nodes = [...state.nodes];
      const originalNode = nodes[nodeIndex] as any;

      // 深拷贝节点
      let targetNode = {
        ...originalNode,
        data: {
          ...originalNode.data,
          nodeFrom: originalNode.data.nodeFrom
            ? [...originalNode.data.nodeFrom]
            : undefined,
          nodeNotify: originalNode.data.nodeNotify
            ? [...originalNode.data.nodeNotify]
            : undefined,
        },
      };

      // 数据处理
      if (Array.isArray(value)) value = [...value];

      // 更新节点数据
      if (type === "data") {
        // 直接更新 data 字段
        if (value === "__mpe_delete") {
          delete targetNode.data[key];
        } else {
          targetNode.data[key] = value;
        }
      } else if (type === "nodeFrom") {
        // 更新来源连接
        if (value === "__mpe_delete") {
          targetNode.data.nodeFrom = targetNode.data.nodeFrom?.filter(
            (_: any, i: number) => i !== parseInt(key)
          );
        } else {
          if (!targetNode.data.nodeFrom) targetNode.data.nodeFrom = [];
          const index = parseInt(key);
          if (index >= 0 && index < targetNode.data.nodeFrom.length) {
            targetNode.data.nodeFrom[index] = value;
          } else {
            targetNode.data.nodeFrom.push(value);
          }
        }
      } else if (type === "nodeNotify") {
        // 更新通知配置
        if (value === "__mpe_delete") {
          targetNode.data.nodeNotify = targetNode.data.nodeNotify?.filter(
            (_: any, i: number) => i !== parseInt(key)
          );
        } else {
          if (!targetNode.data.nodeNotify) targetNode.data.nodeNotify = [];
          const index = parseInt(key);
          if (index >= 0 && index < targetNode.data.nodeNotify.length) {
            targetNode.data.nodeNotify[index] = value;
          } else {
            targetNode.data.nodeNotify.push(value);
          }
        }
      } else {
        // 其他类型直接更新
        targetNode.data[key] = value;
      }

      nodes[nodeIndex] = targetNode;

      // 更新目标节点
      const updates: any = { nodes };
      if (state.targetNode?.id === id) {
        updates.targetNode = targetNode;
      }

      return updates;
    });

    // 检查节点名重复
    const configs = useConfigStore.getState().configs;
    const fileConfig = useFileStore.getState().currentFile.config;
    const nodes = get().nodes;
    const repeats = checkRepeatNodeLabelListUtil(nodes, {
      isExportConfig: configs.isExportConfig,
      prefix: fileConfig.prefix,
    });
    useErrorStore.getState().setError(ErrorTypeEnum.NodeNameRepeat, () => {
      return repeats.map((label) => ({
        type: ErrorTypeEnum.NodeNameRepeat,
        msg: label,
      }));
    });

    // 保存历史记录
    get().saveHistory(1000);
  },

  // 设置节点列表
  setNodes(nodes: NodeType[]) {
    set({ nodes });
  },

  // 批量更新节点数据
  batchSetNodeData(
    id: string,
    updates: Array<{ type: string; key: string; value: any }>
  ) {
    set((state) => {
      const nodeIndex = findNodeIndexById(state.nodes, id);
      if (nodeIndex < 0) return {};

      let nodes = [...state.nodes];
      const originalNode = nodes[nodeIndex] as PipelineNodeType;

      // 深拷贝节点 - OneDragon 格式
      let targetNode: PipelineNodeType = {
        ...originalNode,
        data: {
          ...originalNode.data,
          nodeFrom: originalNode.data.nodeFrom
            ? [...originalNode.data.nodeFrom]
            : undefined,
          nodeNotify: originalNode.data.nodeNotify
            ? [...originalNode.data.nodeNotify]
            : undefined,
        },
      };

      // 应用所有更新
      for (const update of updates) {
        const { type, key, value } = update;
        let processedValue = value;
        if (Array.isArray(value)) processedValue = [...value];

        if (type === "data") {
          // 直接更新 data 字段
          if (processedValue === "__mpe_delete") {
            delete (targetNode.data as any)[key];
          } else {
            (targetNode.data as any)[key] = processedValue;
          }
        } else if (type === "nodeFrom") {
          // 更新来源连接
          if (processedValue === "__mpe_delete") {
            targetNode.data.nodeFrom = targetNode.data.nodeFrom?.filter(
              (_: any, i: number) => i !== parseInt(key)
            );
          } else {
            if (!targetNode.data.nodeFrom) targetNode.data.nodeFrom = [];
            const index = parseInt(key);
            if (index >= 0 && index < targetNode.data.nodeFrom.length) {
              targetNode.data.nodeFrom[index] = processedValue;
            } else {
              targetNode.data.nodeFrom.push(processedValue);
            }
          }
        } else if (type === "nodeNotify") {
          // 更新通知配置
          if (processedValue === "__mpe_delete") {
            targetNode.data.nodeNotify = targetNode.data.nodeNotify?.filter(
              (_: any, i: number) => i !== parseInt(key)
            );
          } else {
            if (!targetNode.data.nodeNotify) targetNode.data.nodeNotify = [];
            const index = parseInt(key);
            if (index >= 0 && index < targetNode.data.nodeNotify.length) {
              targetNode.data.nodeNotify[index] = processedValue;
            } else {
              targetNode.data.nodeNotify.push(processedValue);
            }
          }
        } else {
          // 其他类型直接更新
          (targetNode.data as any)[key] = processedValue;
        }
      }

      nodes[nodeIndex] = targetNode;

      // 更新目标节点
      const result: any = { nodes };
      if (state.targetNode?.id === id) {
        result.targetNode = targetNode;
      }

      return result;
    });

    // 检查节点名重复
    const configs = useConfigStore.getState().configs;
    const fileConfig = useFileStore.getState().currentFile.config;
    const nodes = get().nodes;
    const repeats = checkRepeatNodeLabelListUtil(nodes, {
      isExportConfig: configs.isExportConfig,
      prefix: fileConfig.prefix,
    });
    useErrorStore.getState().setError(ErrorTypeEnum.NodeNameRepeat, () => {
      return repeats.map((label) => ({
        type: ErrorTypeEnum.NodeNameRepeat,
        msg: label,
      }));
    });

    // 保存历史记录
    get().saveHistory(1000);
  },

  // 重置节点计数器
  resetNodeCounter() {
    set({ nodeIdCounter: 1 });
  },
});
