import { memo, useMemo, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import classNames from "classnames";

import style from "../../../../styles/nodes.module.less";
import debugStyle from "../../../../styles/DebugPanel.module.less";
import type { PipelineNodeDataType } from "../../../../stores/flow";
import { useFlowStore } from "../../../../stores/flow";
import { useConfigStore } from "../../../../stores/configStore";
import { useDebugStore } from "../../../../stores/debugStore";
import { NodeTypeEnum } from "../constants";
import { ModernContent } from "./ModernContent";
import { useShallow } from "zustand/shallow";
import { NodeContextMenu } from "../components/NodeContextMenu";

type PNodeData = Node<PipelineNodeDataType, NodeTypeEnum.Pipeline>;

/**Pipeline节点组件 */
export function PipelineNode(props: NodeProps<PNodeData>) {
  const nodeStyle = useConfigStore((state) => state.configs.nodeStyle);
  const focusOpacity = useConfigStore((state) => state.configs.focusOpacity);
  const { getNode } = useReactFlow();

  // 右键菜单状态
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  // 获取完整的 Node 对象
  const node = getNode(props.id) as
    | Node<PipelineNodeDataType, NodeTypeEnum.Pipeline>
    | undefined;

  // 获取选中状态、边信息和路径状态
  const { selectedNodes, selectedEdges, pathMode, pathNodeIds } = useFlowStore(
    useShallow((state) => ({
      selectedNodes: state.selectedNodes,
      selectedEdges: state.selectedEdges,
      pathMode: state.pathMode,
      pathNodeIds: state.pathNodeIds,
    }))
  );
  const edges = useFlowStore((state) => state.edges);

  // 获取调试状态
  const debugMode = useDebugStore((state) => state.debugMode);
  const executedNodes = useDebugStore((state) => state.executedNodes);
  const currentNode = useDebugStore((state) => state.currentNode);
  const recognitionTargetNodeId = useDebugStore(
    (state) => state.recognitionTargetNodeId
  );
  const executionHistory = useDebugStore((state) => state.executionHistory);

  // 计算是否与选中元素相关联
  const isRelated = useMemo(() => {
    // 透明度为1或当前节点被选中
    if (focusOpacity === 1 || props.selected) return true;

    // 路径模式
    if (pathMode && pathNodeIds.size > 0) {
      return pathNodeIds.has(props.id);
    }

    // 没有选中任何内容
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return true;

    const nodeId = props.id;

    // 检查是否与选中的边相连
    for (const selectedEdge of selectedEdges) {
      if (selectedEdge.source === nodeId || selectedEdge.target === nodeId) {
        return true;
      }
    }

    // 仅在有选中节点时检查节点连接关系
    if (selectedNodes.length > 0) {
      // 预先构建选中节点ID集合
      const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

      // 只检查与当前节点相关的边
      for (const edge of edges) {
        if (edge.target === nodeId && selectedNodeIds.has(edge.source)) {
          return true;
        }
        if (edge.source === nodeId && selectedNodeIds.has(edge.target)) {
          return true;
        }
      }
    }

    return false;
  }, [
    focusOpacity,
    props.selected,
    pathMode,
    pathNodeIds,
    props.id,
    selectedNodes,
    selectedEdges,
    edges,
  ]);

  const nodeClass = useMemo(
    () =>
      classNames({
        [style.node]: true,
        [style["pipeline-node"]]: true,
        [style["node-selected"]]: props.selected,
        [style["modern-node"]]: nodeStyle === "modern",
        [style["minimal-node"]]: nodeStyle === "minimal",
        // 调试相关样式
        [debugStyle["debug-node-executed"]]:
          debugMode && executedNodes.has(props.id),
        [debugStyle["debug-node-executing"]]:
          debugMode && currentNode === props.id,
        // 正在被识别的节点（优先级高于执行中）
        [debugStyle["debug-node-recognizing"]]:
          debugMode && recognitionTargetNodeId === props.id,
        [debugStyle["debug-node-failed"]]:
          debugMode &&
          (() => {
            // 查找此节点最后一次执行记录，判断是否失败
            const records = executionHistory.filter(
              (r) => r.nodeId === props.id
            );
            if (records.length === 0) return false;
            const lastRecord = records[records.length - 1];
            return lastRecord.status === "failed";
          })(),
      }),
    [
      props.selected,
      nodeStyle,
      debugMode,
      executedNodes,
      currentNode,
      recognitionTargetNodeId,
      executionHistory,
      props.id,
    ]
  );

  // 计算透明度样式
  const opacityStyle = useMemo(() => {
    if (isRelated || focusOpacity === 1) return undefined;
    return { opacity: focusOpacity };
  }, [isRelated, focusOpacity]);

  // 渲染内容组件 - OneDragon 格式统一使用 Modern 样式
  const renderContent = () => {
    return <ModernContent data={props.data} props={props} />;
  };

  if (!node) {
    return (
      <div className={nodeClass} style={opacityStyle}>
        {renderContent()}
      </div>
    );
  }

  return (
    <NodeContextMenu
      node={node}
      open={contextMenuOpen}
      onOpenChange={setContextMenuOpen}
    >
      <div className={nodeClass} style={opacityStyle}>
        {renderContent()}
      </div>
    </NodeContextMenu>
  );
}

export const PipelineNodeMemo = memo(PipelineNode, (prev, next) => {
  // 基础属性比较
  if (
    prev.id !== next.id ||
    prev.selected !== next.selected ||
    prev.dragging !== next.dragging
  ) {
    return false;
  }

  // 比较 data - OneDragon 格式
  const prevData = prev.data;
  const nextData = next.data;
  
  if (
    prevData.label !== nextData.label ||
    prevData.methodName !== nextData.methodName ||
    prevData.isStartNode !== nextData.isStartNode ||
    prevData.saveStatus !== nextData.saveStatus ||
    prevData.code !== nextData.code ||
    prevData.comment !== nextData.comment ||
    prevData.handleDirection !== nextData.handleDirection
  ) {
    return false;
  }

  // 比较 nodeFrom 数组
  try {
    if (JSON.stringify(prevData.nodeFrom) !== JSON.stringify(nextData.nodeFrom)) {
      return false;
    }
  } catch {
    if (prevData.nodeFrom !== nextData.nodeFrom) {
      return false;
    }
  }

  // 比较 nodeNotify 数组
  try {
    if (JSON.stringify(prevData.nodeNotify) !== JSON.stringify(nextData.nodeNotify)) {
      return false;
    }
  } catch {
    if (prevData.nodeNotify !== nextData.nodeNotify) {
      return false;
    }
  }

  return true;
});
