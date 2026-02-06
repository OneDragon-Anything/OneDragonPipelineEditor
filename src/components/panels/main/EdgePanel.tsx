import style from "../../../styles/EdgePanel.module.less";

import { memo, useMemo, useCallback, useEffect } from "react";
import { Tag, Tooltip, Input, Checkbox } from "antd";
import classNames from "classnames";
import IconFont from "../../iconfonts";

import {
  useFlowStore,
  findNodeLabelById,
  type EdgeType,
} from "../../../stores/flow";
import { useToolbarStore } from "../../../stores/toolbarStore";
import { useConfigStore } from "../../../stores/configStore";
import { DraggablePanel } from "../common/DraggablePanel";

/**
 * 边条件：
 * - onSuccess: 是否在成功时触发
 * - onFailure: 是否在失败时触发
 * - status: undefined (无) | string (状态值) — 决定 sourceHandle
 *
 * sourceHandle 编码格式（只基于 status）:
 * - "default" = status=undefined（无状态条件）
 * - "status:xxx" = status=xxx（指定状态值）
 * 
 * 注意：在框架中，默认（两个都不勾选）= 成功！
 * 两个都勾选 = 成功和失败都触发（生成两个 @node_from）
 */
type EdgeConditionState = {
  onSuccess?: boolean;  // true=成功时触发
  onFailure?: boolean;  // true=失败时触发
  // 两个都不设 = 默认（成功）
  status?: string;      // undefined/空=无状态, 有值=特定状态（决定 sourceHandle）
};

// 从 sourceHandle 和 attributes 解析条件状态
const parseEdgeCondition = (edge: EdgeType): EdgeConditionState => {
  const handle = edge.sourceHandle || "default";
  const attrs = edge.attributes || {};

  let status: string | undefined;

  // 从 sourceHandle 解析 status
  if (handle.startsWith("status:")) {
    status = handle.replace("status:", "");
  }
  // 兼容旧格式
  else if (handle === "status" && attrs.status) {
    status = String(attrs.status);
  }

  // onSuccess/onFailure 从 attributes 读取
  const onSuccess = attrs.onSuccess as boolean | undefined;
  const onFailure = attrs.onFailure as boolean | undefined;

  return { onSuccess, onFailure, status };
};

// 生成 sourceHandle 字符串（只基于 status）
const buildSourceHandle = (state: EdgeConditionState): string => {
  const { status } = state;
  const hasStatus = status !== undefined && status !== "";
  return hasStatus ? `status:${status}` : "default";
};

// 生成条件显示文本
const getConditionDisplayText = (state: EdgeConditionState): string => {
  const { onSuccess, onFailure, status } = state;
  const parts: string[] = [];

  // 状态条件
  if (status !== undefined && status !== "") {
    parts.push(status);
  } else {
    parts.push("默认出口");
  }

  // 执行结果条件
  if (onSuccess && onFailure) {
    parts.push("(成功+失败)");
  } else if (onFailure && !onSuccess) {
    parts.push("(失败)");
  }
  // 只勾成功或都不勾 = 默认（成功），不额外标注

  return parts.join(" ");
};

// 边信息展示 - OneDragon 格式
const EdgeInfoElem = memo(
  ({
    sourceLabel,
    targetLabel,
    conditionState,
    onConditionChange,
  }: {
    sourceLabel: string;
    targetLabel: string;
    conditionState: EdgeConditionState;
    onConditionChange: (state: EdgeConditionState) => void;
  }) => {
    const { onSuccess, onFailure, status } = conditionState;

    // 成功复选框变化
    const handleSuccessChange = (checked: boolean) => {
      onConditionChange({ ...conditionState, onSuccess: checked || undefined });
    };

    // 失败复选框变化
    const handleFailChange = (checked: boolean) => {
      onConditionChange({ ...conditionState, onFailure: checked || undefined });
    };

    // 状态值变化
    const handleStatusChange = (value: string) => {
      onConditionChange({ ...conditionState, status: value || undefined });
    };

    return (
      <>
        <div className={style.info}>
          <div className={style["info-item"]}>
            <span className={style.label}>源节点</span>
            <span className={style.content}>{sourceLabel}</span>
          </div>
          <div className={style["info-item"]}>
            <span className={style.label}>目标节点</span>
            <span className={style.content}>{targetLabel}</span>
          </div>
          <div className={style["info-item"]}>
            <span className={style.label}>当前条件</span>
            <span className={style.content}>
              <Tag style={{ whiteSpace: "normal", wordBreak: "break-all" }}>
                {getConditionDisplayText(conditionState)}
              </Tag>
            </span>
          </div>
          <div className={style["info-item"]}>
            <span className={style.label}>状态值</span>
            <span className={style.content}>
              <Input
                size="small"
                value={status || ""}
                onChange={(e) => handleStatusChange(e.target.value)}
                placeholder="可选，如：1、2"
                style={{ width: "100%" }}
              />
            </span>
          </div>
          <div className={style["info-item"]}>
            <span className={style.label}>执行结果</span>
            <span className={style.content}>
              <Checkbox
                checked={!!onSuccess}
                onChange={(e) => handleSuccessChange(e.target.checked)}
              >
                <span className={style["condition-success"]}>成功时</span>
              </Checkbox>
              <Checkbox
                checked={!!onFailure}
                onChange={(e) => handleFailChange(e.target.checked)}
              >
                <span className={style["condition-fail"]}>失败时</span>
              </Checkbox>
              <span className={style.hint2}>（都不勾 = 默认成功）</span>
            </span>
          </div>
        </div>
        <div className={style.hint}>
          <IconFont name="icon-xiaohongshubiaoti" size={14} />
          <span>
            "状态值" 和 "执行结果" 可以组合使用。
            <br />
            同时勾选成功和失败 = 无论结果如何都触发。
            <br />
            不勾选 = 与只勾"成功"等效（框架默认行为）。
          </span>
        </div>
      </>
    );
  }
);

// 边编辑面板
function EdgePanel() {
  const selectedEdges = useFlowStore((state) => state.selectedEdges);
  const nodes = useFlowStore((state) => state.nodes);
  const targetNode = useFlowStore((state) => state.targetNode);
  const fieldPanelMode = useConfigStore(
    (state) => state.configs.fieldPanelMode
  );
  const setCurrentRightPanel = useToolbarStore(
    (state) => state.setCurrentRightPanel
  );
  const updateEdges = useFlowStore((state) => state.updateEdges);

  // 当前选中的边（只处理单条边）
  const currentEdge = useMemo(() => {
    if (selectedEdges.length === 1 && !targetNode) {
      return selectedEdges[0];
    }
    return null;
  }, [selectedEdges, targetNode]);

  // 当面板打开时通知 toolbarStore
  useEffect(() => {
    if (currentEdge) {
      setCurrentRightPanel("edge");
    }
  }, [currentEdge, setCurrentRightPanel]);

  // 获取源节点和目标节点的名称
  const { sourceLabel, targetLabel } = useMemo(() => {
    if (!currentEdge) {
      return { sourceLabel: "", targetLabel: "" };
    }
    return {
      sourceLabel: findNodeLabelById(nodes, currentEdge.source) ?? "未知",
      targetLabel: findNodeLabelById(nodes, currentEdge.target) ?? "未知",
    };
  }, [currentEdge, nodes]);

  // 获取当前条件状态
  const conditionState = useMemo<EdgeConditionState>(() => {
    if (!currentEdge) return {};
    return parseEdgeCondition(currentEdge);
  }, [currentEdge]);

  // 条件变更处理 - 更新边的 sourceHandle
  const handleConditionChange = useCallback(
    (newState: EdgeConditionState) => {
      if (!currentEdge) return;

      const newSourceHandle = buildSourceHandle(newState);

      // 更新边
      updateEdges([{
        type: "replace",
        id: currentEdge.id,
        item: {
          ...currentEdge,
          id: `edge_${currentEdge.source}_${currentEdge.target}_${newSourceHandle}`,
          sourceHandle: newSourceHandle,
          attributes: {
            ...currentEdge.attributes,
            onSuccess: newState.onSuccess,
            onFailure: newState.onFailure,
            status: newState.status,
          },
        } as EdgeType,
      }]);
    },
    [currentEdge, updateEdges]
  );

  // 删除连接
  const handleDelete = useCallback(() => {
    if (!currentEdge) return;
    updateEdges([{ type: "remove", id: currentEdge.id }]);
  }, [currentEdge, updateEdges]);

  // 样式
  const panelClass = useMemo(
    () =>
      classNames({
        "panel-base": true,
        [style.panel]: true,
        "panel-show": currentEdge !== null,
        "panel-draggable": fieldPanelMode === "draggable",
      }),
    [currentEdge, fieldPanelMode]
  );

  // 面板内容
  const panelContent = (
    <>
      <div className="header">
        <div className="header-left"></div>
        <div className="header-center">
          <div className="title">连接设置</div>
        </div>
        <div className="header-right">
          {currentEdge && (
            <Tooltip placement="top" title="删除连接">
              <IconFont
                className="icon-interactive"
                name="icon-shanchu"
                size={20}
                color="#ff4a4a"
                onClick={handleDelete}
              />
            </Tooltip>
          )}
        </div>
      </div>
      {currentEdge && (
        <EdgeInfoElem
          sourceLabel={sourceLabel}
          targetLabel={targetLabel}
          conditionState={conditionState}
          onConditionChange={handleConditionChange}
        />
      )}
    </>
  );

  // 渲染
  if (fieldPanelMode === "inline") {
    return null;
  }

  if (fieldPanelMode === "draggable") {
    return (
      <DraggablePanel
        panelType="edge"
        isVisible={currentEdge !== null}
        className={panelClass}
        defaultRight={10}
        defaultTop={70}
      >
        {panelContent}
      </DraggablePanel>
    );
  }

  return <div className={panelClass}>{panelContent}</div>;
}

export default memo(EdgePanel);
