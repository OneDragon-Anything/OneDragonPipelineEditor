import style from "../styles/FloatingJsonPanel.module.less";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button, Tooltip, message } from "antd";
import { CloseOutlined, ReloadOutlined, CopyOutlined } from "@ant-design/icons";

import { useToolbarStore } from "../stores/toolbarStore";
import { exportToPython } from "../core/parser";
import { getExportMetadata } from "../stores/fileStore";
import { useFlowStore } from "../stores/flow";
import { ClipboardHelper } from "../utils/clipboard";

// Python 代码高亮组件
const PythonCodeViewer = memo(({ code }: { code: string }) => {
  return (
    <pre className={style.codeBlock}>
      <code>{code}</code>
    </pre>
  );
});

function PythonViewer() {
  const jsonPanelVisible = useToolbarStore((state) => state.jsonPanelVisible);
  const currentRightPanel = useToolbarStore((state) => state.currentRightPanel);
  const setJsonPanelVisible = useToolbarStore(
    (state) => state.setJsonPanelVisible
  );
  const { nodes, edges } = useFlowStore();

  // 存储编译后的 Python 代码
  const [pythonCode, setPythonCode] = useState<string>("");
  const prevVisibleRef = useRef(jsonPanelVisible);

  // 编译 Python 代码
  const compilePython = useCallback(() => {
    try {
      // 只转换 Pipeline 节点
      const flowNodes = nodes
        .filter(node => node.type === "pipeline")
        .map(node => ({
          id: node.id,
          data: node.data as any
        }));
      const flowEdges = edges.map(edge => ({
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: edge.target,
        attributes: edge.attributes
      }));
      
      // 直接调用 exportToPython 生成代码
      const code = exportToPython(flowNodes, flowEdges, getExportMetadata());
      setPythonCode(code);
    } catch (err) {
      console.error("Python 编译失败:", err);
      setPythonCode(`# 编译失败: ${err instanceof Error ? err.message : "未知错误"}`);
    }
  }, [nodes, edges]);

  // 面板打开时编译
  useEffect(() => {
    if (jsonPanelVisible && !prevVisibleRef.current) {
      compilePython();
    }
    prevVisibleRef.current = jsonPanelVisible;
  }, [jsonPanelVisible, compilePython]);

  // 手动刷新
  const handleRefresh = () => {
    compilePython();
  };

  // 复制代码
  const handleCopy = async () => {
    try {
      await ClipboardHelper.write(pythonCode);
      message.success("Python 代码已复制到剪贴板");
    } catch {
      message.error("复制失败");
    }
  };

  // 当其他面板打开时自动关闭面板
  useEffect(() => {
    if (currentRightPanel !== "json" && currentRightPanel !== null) {
      setJsonPanelVisible(false);
    }
  }, [currentRightPanel, setJsonPanelVisible]);

  // 关闭面板
  const handleClose = () => {
    setJsonPanelVisible(false);
  };

  // 面板类名
  const panelClassName = `${style.floatingJsonPanel} ${
    jsonPanelVisible ? style.visible : style.hidden
  }`;

  // 渲染
  return (
    <div className={panelClassName}>
      <div className={style.header}>
        <div className={style.title}>Python 代码预览</div>
        <div className={style.actions}>
          <Tooltip title="复制代码">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopy}
            />
          </Tooltip>
          <Tooltip title="刷新">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
            />
          </Tooltip>
          <Tooltip title="关闭">
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={handleClose}
            />
          </Tooltip>
        </div>
      </div>
      <div className={style.viewerContainer}>
        <PythonCodeViewer code={pythonCode} />
      </div>
    </div>
  );
}

export default memo(PythonViewer);
