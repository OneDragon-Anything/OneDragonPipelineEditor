import { Button, Dropdown, message } from "antd";
import type { MenuProps } from "antd";
import { ImportOutlined } from "@ant-design/icons";
import { memo, useMemo, useRef } from "react";
import {
  useToolbarStore,
  type ImportAction,
} from "../../../stores/toolbarStore";
import { parsePythonFile, convertToFlowData } from "../../../core/parser";
import { useFlowStore } from "../../../stores/flow";
import { LayoutHelper } from "../../../core/layout";
import style from "../../../styles/ToolbarPanel.module.less";

/**
 * 导入按钮组件
 * 支持从粘贴板或文件导入 OneDragon Python 工作流
 */
function ImportButton() {
  const { defaultImportAction, setDefaultImportAction } = useToolbarStore();
  const { setNodes, setEdges, clearHistory, saveHistory } = useFlowStore();

  const pythonFileInputRef = useRef<HTMLInputElement>(null);

  // 从 Python 内容导入
  const importFromPythonContent = async (content: string, source: string) => {
    try {
      console.log("[ImportButton] 开始解析 Python 内容...");
      
      // 解析 Python 文件
      const parseResult = parsePythonFile(content);
      console.log("[ImportButton] 解析结果:", parseResult);
      
      if (parseResult.nodes.length === 0) {
        message.warning("未找到有效的 OneDragon 节点定义（需要 @operation_node 装饰器）");
        return false;
      }

      console.log("[ImportButton] 转换为 Flow 数据...");
      // 转换为 Flow 数据
      const flowData = convertToFlowData(parseResult);
      console.log("[ImportButton] Flow 数据:", flowData);

      // 更新状态
      console.log("[ImportButton] 更新状态...");
      clearHistory();
      setNodes(flowData.nodes);
      setEdges(flowData.edges);

      // 保存 Python 元数据
      const { useFileStore } = await import("../../../stores/fileStore");
      useFileStore.getState().setFileConfig("pythonClassName", flowData.metadata.className);
      useFileStore.getState().setFileConfig("pythonBaseClass", flowData.metadata.baseClass);
      useFileStore.getState().setFileConfig("pythonImports", flowData.metadata.imports);
      useFileStore.getState().setFileConfig("pythonClassVars", flowData.metadata.classVars);
      useFileStore.getState().setFileConfig("pythonInitCode", flowData.metadata.initCode);

      saveHistory(0);  // 立即保存历史记录

      // 延迟触发自动布局
      console.log("[ImportButton] 触发自动布局...");
      setTimeout(() => {
        try {
          LayoutHelper.auto();
          console.log("[ImportButton] 自动布局完成");
        } catch (layoutErr) {
          console.error("[ImportButton] 布局失败:", layoutErr);
        }
      }, 100);

      message.success(`从${source}导入成功，共 ${parseResult.nodes.length} 个节点`);
      return true;
    } catch (err) {
      console.error("[ImportButton] 导入失败:", err);
      message.error(`导入失败: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };

  // 从粘贴板导入 Python
  const handleImportFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        message.error("粘贴板内容为空");
        return;
      }
      await importFromPythonContent(text, "粘贴板");
    } catch (err) {
      message.error("读取粘贴板失败");
      console.error(err);
    }
  };

  // 从文件导入 Python
  const handleImportFromFile = () => {
    pythonFileInputRef.current?.click();
  };

  const onPythonFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        await importFromPythonContent(text, `文件 ${file.name}`);
      } catch (err) {
        message.error("文件读取失败");
        console.error(err);
      }
      e.target.value = "";
    }
  };

  // 执行对应的导入操作
  const executeImportAction = (action: ImportAction) => {
    switch (action) {
      case "clipboard-pipeline":
        handleImportFromClipboard();
        break;
      case "file-pipeline":
        handleImportFromFile();
        break;
      default:
        handleImportFromClipboard();
    }
  };

  // 点击按钮执行默认操作
  const handleButtonClick = () => {
    executeImportAction(defaultImportAction);
  };

  // 菜单项定义
  const menuItems = useMemo<MenuProps["items"]>(() => {
    const items: MenuProps["items"] = [
      {
        key: "clipboard-pipeline",
        label: "从粘贴板导入 Python",
        onClick: () => {
          setDefaultImportAction("clipboard-pipeline");
          executeImportAction("clipboard-pipeline");
        },
      },
      {
        key: "file-pipeline",
        label: "从文件导入 Python",
        onClick: () => {
          setDefaultImportAction("file-pipeline");
          executeImportAction("file-pipeline");
        },
      },
    ];

    return items;
  }, [setDefaultImportAction]);

  // 获取按钮文本和当前操作描述
  const { buttonLabel, currentActionDesc } = useMemo(() => {
    switch (defaultImportAction) {
      case "clipboard-pipeline":
        return { buttonLabel: "导入", currentActionDesc: "粘贴板" };
      case "file-pipeline":
        return { buttonLabel: "导入", currentActionDesc: "文件" };
      default:
        return { buttonLabel: "导入", currentActionDesc: "粘贴板" };
    }
  }, [defaultImportAction]);

  return (
    <>
      <input
        ref={pythonFileInputRef}
        type="file"
        accept=".py"
        style={{ display: "none" }}
        onChange={onPythonFileSelect}
        title="选择 Python 文件"
      />
      <Dropdown
        menu={{ items: menuItems }}
        trigger={["hover"]}
        placement="bottomLeft"
        overlayClassName="toolbar-dropdown"
        mouseEnterDelay={0}
      >
        <Button
          icon={<ImportOutlined />}
          onClick={handleButtonClick}
          className={style.toolbarButton}
        >
          {buttonLabel}（{currentActionDesc}）
        </Button>
      </Dropdown>
    </>
  );
}

export default memo(ImportButton);
