import { memo, useMemo, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, useNodeId } from "@xyflow/react";
import classNames from "classnames";

import style from "../../../../styles/nodes.module.less";
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

interface OneDragonNodeHandlesProps {
  handleDirection?: HandleDirection;
}

/**
 * OneDragon 风格节点端点组件
 * 支持四种输出类型：Default、Success、Fail、Status
 */
export const OneDragonNodeHandles = memo<OneDragonNodeHandlesProps>(
  ({ handleDirection = DEFAULT_HANDLE_DIRECTION }) => {
    const nodeId = useNodeId();
    const updateNodeInternals = useUpdateNodeInternals();
    
    const { targetPosition, sourcePosition, isVertical } = useMemo(
      () => getHandlePositions(handleDirection),
      [handleDirection]
    );

    // 方向改变时更新节点内部
    useEffect(() => {
      if (nodeId) {
        updateNodeInternals(nodeId);
        const timer1 = setTimeout(() => updateNodeInternals(nodeId), 0);
        const timer2 = setTimeout(() => updateNodeInternals(nodeId), 50);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      }
    }, [handleDirection, nodeId, updateNodeInternals]);

    // 根据方向选择样式类
    const handleClass = isVertical ? style.handleVertical : style.handle;
    const targetClass = isVertical ? style.targetVertical : style.target;

    // 计算输出 Handle 的位置偏移
    const getSourceHandleStyle = (index: number, total: number = 4) => {
      if (isVertical) {
        const spacing = 100 / (total + 1);
        return { left: `${spacing * (index + 1)}%` };
      } else {
        const spacing = 100 / (total + 1);
        return { top: `${spacing * (index + 1)}%` };
      }
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

        {/* 输出 Handle - Default（默认/无条件） */}
        <Handle
          id={SourceHandleTypeEnum.Default}
          className={classNames(handleClass, style.handleDefault)}
          type="source"
          position={sourcePosition}
          style={getSourceHandleStyle(0)}
          title="默认输出"
        />

        {/* 输出 Handle - Success（成功时） */}
        <Handle
          id={SourceHandleTypeEnum.Success}
          className={classNames(handleClass, style.handleSuccess)}
          type="source"
          position={sourcePosition}
          style={getSourceHandleStyle(1)}
          title="成功时"
        />

        {/* 输出 Handle - Fail（失败时） */}
        <Handle
          id={SourceHandleTypeEnum.Fail}
          className={classNames(handleClass, style.handleFail)}
          type="source"
          position={sourcePosition}
          style={getSourceHandleStyle(2)}
          title="失败时"
        />

        {/* 输出 Handle - Status（特定状态时） */}
        <Handle
          id={SourceHandleTypeEnum.Status}
          className={classNames(handleClass, style.handleStatus)}
          type="source"
          position={sourcePosition}
          style={getSourceHandleStyle(3)}
          title="特定状态"
        />
      </>
    );
  }
);

OneDragonNodeHandles.displayName = "OneDragonNodeHandles";

// 保持向后兼容的导出
export { OneDragonNodeHandles as PipelineNodeHandles };
