import style from "../../../../styles/FieldPanel.module.less";
import { memo, useCallback } from "react";
import { Tooltip, message } from "antd";
import IconFont from "../../../iconfonts";
import type { NodeType } from "../../../../stores/flow/types";
import { NodeTypeEnum } from "../../../flow/nodes";
import {
  copyNodeName,
  saveNodeAsTemplate,
} from "../../../flow/nodes/utils/nodeOperations";
import { crossFileService } from "../../../../services/crossFileService";

// 左侧工具栏
export const FieldPanelToolbarLeft = memo(
  ({ currentNode }: { currentNode: NodeType | null }) => {
    const handleCopyNodeName = () => {
      const pureNodeName = currentNode?.data.label || "";
      const nodeType = currentNode?.type;
      copyNodeName(pureNodeName, nodeType);
    };

    return (
      <div style={{ display: "flex", gap: 8 }}>
        <Tooltip placement="top" title={"复制节点名"}>
          <IconFont
            className="icon-interactive"
            name="icon-xiaohongshubiaoti"
            size={24}
            onClick={handleCopyNodeName}
          />
        </Tooltip>
      </div>
    );
  }
);

// 右侧工具栏
export const FieldPanelToolbarRight = memo(
  ({
    currentNode,
    onLoadingChange,
    onProgressChange,
    onDelete,
  }: {
    currentNode: NodeType | null;
    onLoadingChange?: (loading: boolean) => void;
    onProgressChange?: (stage: string, detail?: string) => void;
    onDelete?: () => void;
  }) => {
    const showPipelineButtons =
      currentNode && currentNode.type === NodeTypeEnum.Pipeline;

    // 跳转按钮
    const showNavigateButton =
      currentNode && currentNode.type === NodeTypeEnum.External;

    const handleSaveTemplate = () => {
      if (!currentNode || currentNode.type !== NodeTypeEnum.Pipeline) {
        return;
      }
      saveNodeAsTemplate(currentNode.data.label, currentNode.data as any);
    };

    // 跳转到目标节点
    const handleNavigate = useCallback(async () => {
      if (!currentNode || currentNode.type !== NodeTypeEnum.External) {
        return;
      }

      const label = currentNode.data.label;
      if (!label) {
        message.warning("节点名为空");
        return;
      }

      const result = await crossFileService.navigateToNodeByName(label, {
        crossFile: true,
        excludeTypes: [NodeTypeEnum.External, NodeTypeEnum.Anchor],
      });

      if (result.success) {
        message.success(result.message);
      } else {
        message.warning(result.message);
      }
    }, [currentNode]);

    if (!showPipelineButtons && !showNavigateButton) {
      return null;
    }

    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {showNavigateButton && (
          <Tooltip placement="top" title="跳转到目标节点">
            <IconFont
              className="icon-interactive"
              name="icon-qianjin"
              size={20}
              onClick={handleNavigate}
            />
          </Tooltip>
        )}
        {showPipelineButtons && (
          <>
            <Tooltip placement="top" title="保存为模板">
              <IconFont
                className="icon-interactive"
                name="icon-biaodanmoban"
                size={24}
                onClick={handleSaveTemplate}
              />
            </Tooltip>
            <Tooltip placement="top" title="删除节点">
              <IconFont
                className="icon-interactive"
                name="icon-shanchu"
                size={19}
                color="#ff4a4a"
                onClick={onDelete}
              />
            </Tooltip>
          </>
        )}
      </div>
    );
  }
);
