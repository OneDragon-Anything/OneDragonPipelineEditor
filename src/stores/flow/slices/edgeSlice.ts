import type { StateCreator } from "zustand";
import {
  applyEdgeChanges,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type { FlowStore, FlowEdgeState, EdgeType } from "../types";
import {
  getSelectedEdges,
} from "../utils/edgeUtils";

export const createEdgeSlice: StateCreator<FlowStore, [], [], FlowEdgeState> = (
  set,
  get
) => ({
  // 初始状态
  edges: [],
  edgeControlResetKey: 0,

  // 更新边
  updateEdges(changes: EdgeChange[]) {
    set((state) => {
      let edges = [...state.edges];

      // 完全忽略 "add" 类型的变更，边的添加由 addEdge 方法控制
      const filteredChanges = changes.filter(change => change.type !== "add");

      if (filteredChanges.length === 0) {
        return {};
      }

      // 应用变更
      const updatedEdges = applyEdgeChanges(filteredChanges, edges);
      const newEdges = updatedEdges as EdgeType[];
      const selectedEdges = getSelectedEdges(updatedEdges as EdgeType[]);
      get().updateSelection(state.selectedNodes, selectedEdges);
      return { edges: newEdges };
    });

    // 保存历史记录
    const hasRemove = changes.some((change) => change.type === "remove");
    if (hasRemove) {
      get().saveHistory(0);
    }
  },

  // 更新边数据
  setEdgeData(id: string, key: string, value: any) {
    set((state) => {
      const edgeIndex = state.edges.findIndex((e) => e.id === id);
      if (edgeIndex < 0) return {};

      const edges = [...state.edges];
      const targetEdge = { ...edges[edgeIndex] };

      // 更新 attributes
      if (!targetEdge.attributes) {
        targetEdge.attributes = {};
      }

      if (value === undefined || value === null || value === false) {
        // 删除属性
        delete targetEdge.attributes[key as keyof typeof targetEdge.attributes];
        // attributes为空
        if (Object.keys(targetEdge.attributes).length === 0) {
          delete targetEdge.attributes;
        }
      } else {
        // 设置属性
        (targetEdge.attributes as any)[key] = value;
      }

      edges[edgeIndex] = targetEdge;

      // 更新选中边列表
      const selectedEdges = getSelectedEdges(edges);
      get().updateSelection(state.selectedNodes, selectedEdges);

      return { edges };
    });

    // 保存历史记录
    get().saveHistory(500);
  },

  // 更新边顺序
  setEdgeLabel(id: string, newLabel: number) {
    set((state) => {
      const edgeIndex = state.edges.findIndex((e) => e.id === id);
      if (edgeIndex < 0) return {};

      const edges = [...state.edges];
      const targetEdge = edges[edgeIndex];
      const oldLabel = targetEdge.label as number;

      if (newLabel === oldLabel) return {};

      // 更新其他同源同类型边的顺序
      edges.forEach((edge, index) => {
        if (index === edgeIndex) return;
        if (
          edge.source === targetEdge.source &&
          edge.sourceHandle === targetEdge.sourceHandle
        ) {
          const label = edge.label as number;
          if (newLabel < oldLabel) {
            // 向前移动
            if (label >= newLabel && label < oldLabel) {
              edges[index] = { ...edge, label: label + 1 };
            }
          } else {
            // 向后移动
            if (label > oldLabel && label <= newLabel) {
              edges[index] = { ...edge, label: label - 1 };
            }
          }
        }
      });

      // 更新目标边的顺序
      edges[edgeIndex] = { ...targetEdge, label: newLabel };

      // 更新选中边列表
      const selectedEdges = getSelectedEdges(edges);
      get().updateSelection(state.selectedNodes, selectedEdges);

      return { edges };
    });

    // 保存历史记录
    get().saveHistory(500);
  },

  // 添加边 - 相同 source + target + sourceHandle 的边会被合并
  addEdge(co: Connection, _options) {
    set((state) => {
      const edges = [...state.edges];

      // 从 sourceHandle 获取条件类型
      // OneDragon 格式: "default" 或 "status:xxx"
      const handleStr = String(co.sourceHandle || "default");

      // 查找是否已存在相同 source + target + sourceHandle 的边
      const existingEdgeIndex = edges.findIndex(
        (edge) => 
          edge.source === co.source && 
          edge.target === co.target &&
          edge.sourceHandle === handleStr
      );

      if (existingEdgeIndex >= 0) {
        // 边已存在，不重复创建
        return { edges };
      }

      // 边不存在，创建新边
      const newEdge = {
        type: "marked",
        id: `edge_${co.source}_${co.target}_${handleStr}`,
        source: co.source,
        target: co.target,
        sourceHandle: handleStr,
        targetHandle: co.targetHandle,
        attributes: {
          // 如果是 status:xxx 格式，提取状态值
          ...(handleStr.startsWith("status:") ? { status: handleStr.replace("status:", "") } : {}),
          // 默认为成功（success: undefined 或 true 都表示成功）
        },
      } as EdgeType;

      // 直接添加到边数组
      edges.push(newEdge);
      return { edges };
    });

    // 保存历史记录
    get().saveHistory(0);
  },

  // 设置边列表
  setEdges(edges: EdgeType[]) {
    set({ edges });
  },

  // 重置所有边的控制点
  resetEdgeControls() {
    set((state) => ({ edgeControlResetKey: state.edgeControlResetKey + 1 }));
  },
});
