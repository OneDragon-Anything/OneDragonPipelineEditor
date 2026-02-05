import { memo, useMemo, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, useNodeId } from "@xyflow/react";
import classNames from "classnames";

import style from "../../../../styles/nodes.module.less";
import { useFlowStore, type PipelineNodeType } from "../../../../stores/flow";
import { SourceHandleTypeEnum, TargetHandleTypeEnum } from "../constants";
import type { HandleDirection } from "../constants";
import { DEFAULT_HANDLE_DIRECTION } from "../constants";

/**获取 Handle 位置配置 */
export function getHandlePositions(direction: HandleDirection): {
  targetPosition: Position;
  sourcePosition: Position;
  isVertical: boolean;
} {
  switch (direction) {
    case "left-right":
      return { targetPosition: Position.Left, sourcePosition: Position.Right, isVertical: false };
    case "right-left":
      return { targetPosition: Position.Right, sourcePosition: Position.Left, isVertical: false };
    case "top-bottom":
      return { targetPosition: Position.Top, sourcePosition: Position.Bottom, isVertical: true };
    case "bottom-top":
      return { targetPosition: Position.Bottom, sourcePosition: Position.Top, isVertical: true };
    default:
      return { targetPosition: Position.Left, sourcePosition: Position.Right, isVertical: false };
  }
}

interface PipelineNodeHandlesProps {
  handleDirection?: HandleDirection;
}

/**
 * Pipeline 节点端点组件 (OneDragon 风格)
 * - 1个固定默认出口（无 status 条件）
 * - 动态 status 出口（有具体 status 值）
 * - 出口顺序可通过 handleOrder 自定义
 */
export const PipelineNodeHandles = memo<PipelineNodeHandlesProps>(
  ({ handleDirection = DEFAULT_HANDLE_DIRECTION }) => {
    const nodeId = useNodeId();
    const updateNodeInternals = useUpdateNodeInternals();
    const edges = useFlowStore((state) => state.edges);
    const nodes = useFlowStore((state) => state.nodes);

    const { targetPosition, sourcePosition, isVertical } = useMemo(
      () => getHandlePositions(handleDirection),
      [handleDirection]
    );

    // 获取当前节点的 handleOrder
    const currentNode = useMemo(() => {
      return nodes.find((n) => n.id === nodeId) as PipelineNodeType | undefined;
    }, [nodes, nodeId]);

    const handleOrder = currentNode?.data?.handleOrder;

    // 获取所有出口（包括 default 和 status:xxx）
    const allHandles = useMemo(() => {
      if (!nodeId) return ["default"];

      const handleSet = new Set<string>();
      handleSet.add("default"); // 默认出口始终存在

      edges.forEach(edge => {
        if (edge.source === nodeId) {
          const handle = String(edge.sourceHandle || "default");
          // 只收集 status:xxx 格式的出口
          if (handle.startsWith("status:") && handle !== "status:") {
            handleSet.add(handle);
          }
        }
      });

      const handles = Array.from(handleSet);

      // 如果有保存的顺序，使用保存的顺序
      if (handleOrder && handleOrder.length > 0) {
        const sortedHandles: string[] = [];

        // 按照保存的顺序添加
        for (const h of handleOrder) {
          if (handles.includes(h)) {
            sortedHandles.push(h);
          }
        }

        // 添加不在保存顺序中的出口
        for (const h of handles) {
          if (!sortedHandles.includes(h)) {
            sortedHandles.push(h);
          }
        }

        return sortedHandles;
      }

      // 默认排序：default 在前，然后按状态值排序
      return handles.sort((a, b) => {
        if (a === "default") return -1;
        if (b === "default") return 1;
        const aVal = a.replace("status:", "");
        const bVal = b.replace("status:", "");
        const aNum = parseInt(aVal, 10);
        const bNum = parseInt(bVal, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return aVal.localeCompare(bVal);
      });
    }, [nodeId, edges, handleOrder]);

    // 计算总的 Handle 数量
    const totalHandles = allHandles.length;

    // 方向改变或动态 handles 变化时更新节点内部
    const handlesKey = useMemo(() => allHandles.join(","), [allHandles]);

    useEffect(() => {
      if (nodeId) {
        // 使用 requestAnimationFrame 确保 DOM 已更新
        const raf = requestAnimationFrame(() => {
          updateNodeInternals(nodeId);
          // 延迟再次更新以确保边的位置完全正确
          const timer = setTimeout(() => updateNodeInternals(nodeId), 50);
          return () => clearTimeout(timer);
        });
        return () => {
          cancelAnimationFrame(raf);
        };
      }
    }, [handleDirection, nodeId, updateNodeInternals, handlesKey]);

    // 根据方向选择样式类
    const handleClass = isVertical ? style.handleVertical : style.handle;
    const targetClass = isVertical ? style.targetVertical : style.target;

    // 计算输出 Handle 的位置偏移
    const getSourceHandleStyle = (index: number, total: number) => {
      if (isVertical) {
        const spacing = 100 / (total + 1);
        return { left: `${spacing * (index + 1)}%` };
      } else {
        const spacing = 100 / (total + 1);
        return { top: `${spacing * (index + 1)}%` };
      }
    };

    // 获取出口的样式类和标题
    const getHandleInfo = (handle: string) => {
      if (handle === "default") {
        return {
          className: style.handleDefault,
          title: "默认输出（无状态条件）",
        };
      }
      const statusValue = handle.replace("status:", "");
      return {
        className: style.handleStatus,
        title: `状态: ${statusValue}`,
      };
    };

    return (
      <>
        {/* 输入 Handle - 只有一个标准输入 */}
        <Handle
          id={TargetHandleTypeEnum.Target}
          className={classNames(handleClass, targetClass)}
          type="target"
          position={targetPosition}
        />

        {/* 所有输出 Handle（按 handleOrder 排序） */}
        {allHandles.map((handle, index) => {
          const { className, title } = getHandleInfo(handle);
          return (
            <Handle
              key={handle}
              id={handle === "default" ? SourceHandleTypeEnum.Default : handle}
              className={classNames(handleClass, className)}
              type="source"
              position={sourcePosition}
              style={getSourceHandleStyle(index, totalHandles)}
              title={title}
            />
          );
        })}
      </>
    );
  }
);

PipelineNodeHandles.displayName = "PipelineNodeHandles";
