import { Button, Dropdown, message } from "antd";
import type { MenuProps } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { memo, useMemo, useCallback } from "react";
import {
  useToolbarStore,
  type ExportAction,
} from "../../../stores/toolbarStore";
import { useFlowStore } from "../../../stores/flow";
import { useShallow } from "zustand/shallow";
import { exportToPython } from "../../../core/parser";
import { ClipboardHelper } from "../../../utils/clipboard";
import style from "../../../styles/ToolbarPanel.module.less";

/**
 * 导出按钮组件
 * 支持导出 Python 代码到粘贴板或下载文件
 */
function ExportButton() {
  const { defaultExportAction, setDefaultExportAction } = useToolbarStore();
  const { nodes, edges, selectedNodes, selectedEdges } = useFlowStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      selectedNodes: state.debouncedSelectedNodes,
      selectedEdges: state.debouncedSelectedEdges,
    }))
  );

  const isPartable = selectedNodes.length > 0;

  // 生成 Python 代码
  const generatePythonCode = useCallback((nodesToExport: any[], edgesToExport: any[]) => {
    const flowNodes = nodesToExport.map(node => ({
      id: node.id,
      data: node.data
    }));
    const flowEdges = edgesToExport.map(edge => ({
      source: edge.source,
      target: edge.target,
      attributes: edge.data?.attributes
    }));
    return exportToPython(flowNodes, flowEdges);
  }, []);

  // 导出到粘贴板
  const handleExportToClipboard = useCallback(() => {
    try {
      const code = generatePythonCode(nodes, edges);
      ClipboardHelper.writeString(code, {
        successMsg: "已将 Python 代码导出到粘贴板",
      });
    } catch (err) {
      message.error("导出失败");
      console.error(err);
    }
  }, [nodes, edges, generatePythonCode]);

  // 下载为文件
  const handleExportToFile = useCallback(() => {
    try {
      const code = generatePythonCode(nodes, edges);
      const blob = new Blob([code], { type: "text/x-python" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "generated_app.py";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success("Python 文件已下载");
    } catch (err) {
      message.error("导出失败");
      console.error(err);
    }
  }, [nodes, edges, generatePythonCode]);

  // 部分导出（选中节点）
  const handlePartialExport = useCallback(() => {
    try {
      const code = generatePythonCode(selectedNodes, selectedEdges);
      ClipboardHelper.writeString(code, {
        successMsg: "已将选中节点的 Python 代码导出到粘贴板",
      });
    } catch (err) {
      message.error("导出失败");
      console.error(err);
    }
  }, [selectedNodes, selectedEdges, generatePythonCode]);

  // 执行对应的导出操作
  const executeExportAction = useCallback((action: ExportAction) => {
    switch (action) {
      case "clipboard":
        handleExportToClipboard();
        break;
      case "file":
        handleExportToFile();
        break;
      case "partial":
        handlePartialExport();
        break;
      default:
        handleExportToClipboard();
    }
  }, [handleExportToClipboard, handleExportToFile, handlePartialExport]);

  // 点击按钮执行默认操作
  const handleButtonClick = () => {
    executeExportAction(defaultExportAction);
  };

  // 菜单项定义
  const menuItems = useMemo<MenuProps["items"]>(() => {
    const items: MenuProps["items"] = [
      {
        key: "clipboard",
        label: "导出 Python 到粘贴板",
        onClick: () => {
          setDefaultExportAction("clipboard");
          executeExportAction("clipboard");
        },
      },
      {
        key: "file",
        label: "下载 Python 文件",
        onClick: () => {
          setDefaultExportAction("file");
          executeExportAction("file");
        },
      },
    ];

    // 仅在有选中节点时显示
    if (isPartable) {
      items.push(
        { type: "divider" },
        {
          key: "partial",
          label: "导出选中节点",
          onClick: () => {
            setDefaultExportAction("partial");
            executeExportAction("partial");
          },
        }
      );
    }

    return items;
  }, [isPartable, setDefaultExportAction, executeExportAction]);

  // 获取按钮文本和当前操作描述
  const { buttonLabel, currentActionDesc } = useMemo(() => {
    switch (defaultExportAction) {
      case "clipboard":
        return { buttonLabel: "导出", currentActionDesc: "粘贴板" };
      case "file":
        return { buttonLabel: "导出", currentActionDesc: "文件" };
      case "partial":
        return { buttonLabel: "导出", currentActionDesc: "选中" };
      default:
        return { buttonLabel: "导出", currentActionDesc: "粘贴板" };
    }
  }, [defaultExportAction]);

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["hover"]}
      placement="bottomLeft"
      overlayClassName="toolbar-dropdown"
      mouseEnterDelay={0}
    >
      <Button
        icon={<ExportOutlined />}
        onClick={handleButtonClick}
        className={style.toolbarButton}
      >
        {buttonLabel}（{currentActionDesc}）
      </Button>
    </Dropdown>
  );
}

export default memo(ExportButton);
