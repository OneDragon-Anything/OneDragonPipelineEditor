import style from "./styles/App.module.less";

import { memo, useCallback, useEffect } from "react";
import {
  Flex,
  Layout,
  message,
  notification,
  Button,
  Space,
  Modal,
} from "antd";
const { Header: HeaderSection, Content } = Layout;

import { useFileStore } from "./stores/fileStore";
import { useConfigStore } from "./stores/configStore";
import { useWSStore } from "./stores/wsStore";
import { useCustomTemplateStore } from "./stores/customTemplateStore";
import { localServer } from "./services/server";

import Header from "./components/Header";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import MainFlow from "./components/Flow";
import PythonViewer from "./components/JsonViewer";
import FieldPanel from "./components/panels/main/FieldPanel";
import EdgePanel from "./components/panels/main/EdgePanel";
import ToolPanel from "./components/panels/tools/ToolPanel";
import SearchPanel from "./components/panels/main/SearchPanel";
import FilePanel from "./components/panels/main/FilePanel";
import ConfigPanel from "./components/panels/main/ConfigPanel";
import AIHistoryPanel from "./components/panels/main/AIHistoryPanel";
import { LocalFileListPanel } from "./components/panels/main/LocalFileListPanel";
import ErrorPanel from "./components/panels/main/ErrorPanel";
import ToolbarPanel from "./components/panels/main/ToolbarPanel";
import { LoggerPanel } from "./components/panels/tools/LoggerPanel";
import { parsePythonFile, convertToFlowData } from "./core/parser";
import { ThemeProvider } from "./contexts/ThemeContext";
import {
  getShareParam,
  loadFromShareUrl,
  checkPendingImport,
  handleImportFromUrl,
  clearImportParam,
} from "./utils/shareHelper";
import { parseUrlParams } from "./utils/urlHelper";
import {
  isWailsEnvironment,
  onWailsEvent,
  getWailsPort,
  wailsLog,
} from "./utils/wailsBridge";

// 全局监听
const GlobalListener = memo(() => {
  return null;
});

/**主程序 */
function App() {
  // 处理文件拖拽
  const handleFileDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // 检查文件类型
    if (!file.name.endsWith(".py")) {
      message.error("仅支持 .py 文件");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parsePythonFile(text);
      const { nodes, edges, metadata } = convertToFlowData(parsed);
      useFlowStore.getState().replace(nodes, edges, { skipSave: false });
      useFlowStore.getState().initHistory(nodes, edges);
      // 保存 Python 元数据到当前文件配置
      useFileStore.getState().setFileConfig("pythonClassName", metadata.className);
      useFileStore.getState().setFileConfig("pythonBaseClass", metadata.baseClass);
      useFileStore.getState().setFileConfig("pythonImports", metadata.imports);
      useFileStore.getState().setFileConfig("pythonClassVars", metadata.classVars);
      useFileStore.getState().setFileConfig("pythonInitCode", metadata.initCode);
      message.success(`已导入文件: ${file.name}`);
    } catch (err) {
      message.error("文件导入失败，请检查文件格式");
      console.error(err);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 启用全局快捷键
  useGlobalShortcuts();

  // onMounted
  useEffect(() => {
    // 检查是否有分享链接参数
    const hasShareParam = !!getShareParam();

    // 检查是否有导入请求
    const { hasPending, startIn, expectedFile } = checkPendingImport();

    // 读取本地存储
    if (!hasShareParam && !hasPending) {
      const err = useFileStore.getState().replace();
      if (!err) message.success("已读取本地缓存");
    }

    // 从分享链接加载
    if (hasShareParam) {
      loadFromShareUrl();
    }

    // 处理导入请求
    if (hasPending) {
      const dirMap: Record<string, string> = {
        desktop: "桌面",
        documents: "文档",
        downloads: "下载",
        music: "音乐",
        pictures: "图片",
        videos: "视频",
      };

      const dirName = dirMap[startIn || "downloads"] || startIn;
      const content = expectedFile
        ? `是否从 "${dirName}" 目录选择文件 "${expectedFile}" 导入？`
        : `是否从 "${dirName}" 目录选择文件导入？`;

      Modal.confirm({
        title: "检测到导入请求",
        content,
        okText: "选择文件",
        cancelText: "取消",
        onOk: () => handleImportFromUrl(),
        onCancel: () => clearImportParam(),
      });
    }

    // 加载自定义模板
    useCustomTemplateStore.getState().loadTemplates();

    // 注册WebSocket状态同步回调
    const setConnected = useWSStore.getState().setConnected;
    const setConnecting = useWSStore.getState().setConnecting;
    localServer.onStatus((connected) => {
      setConnected(connected);
    });
    localServer.onConnecting((isConnecting) => {
      setConnecting(isConnecting);
    });

    // WebSocket自动连接
    const wsAutoConnect = useConfigStore.getState().configs.wsAutoConnect;
    const configuredPort = useConfigStore.getState().configs.wsPort;

    // 统一解析 URL 参数
    const urlParams = parseUrlParams();

    // Wails 环境下的连接逻辑
    let cleanupWailsListener: (() => void) | null = null;

    if (isWailsEnvironment()) {
      console.log("[App] Running in Wails environment");
      wailsLog("[Frontend] Wails environment detected");

      // 监听后端发送的端口事件
      cleanupWailsListener = onWailsEvent<number>("bridge:port", (port) => {
        console.log("[App] Received bridge:port event:", port);
        wailsLog(`[Frontend] Received port: ${port}`);
        localServer.setPort(port);
        localServer.connect();
      });

      // 尝试直接获取端口
      getWailsPort().then((port) => {
        if (
          port &&
          !localServer.isConnected() &&
          !localServer.getIsConnecting()
        ) {
          console.log("[App] Got port from GetPort():", port);
          wailsLog(`[Frontend] Got port from GetPort: ${port}`);
          localServer.setPort(port);
          localServer.connect();
        }
      });
    } else {
      // 非 Wails 环境：使用 URL 参数或配置
      // 确定使用的端口：URL参数 > 配置端口 > 默认端口
      const targetPort = urlParams.port || configuredPort;
      if (targetPort) {
        localServer.setPort(targetPort);
      }

      // 自动连接或者 URL 参数连接
      if (wsAutoConnect || urlParams.linkLb) {
        localServer.connect();
      }
    }

    // 文件拖拽监听
    document.addEventListener("drop", handleFileDrop);
    document.addEventListener("dragover", handleDragOver);

    // 清理监听器
    return () => {
      document.removeEventListener("drop", handleFileDrop);
      document.removeEventListener("dragover", handleDragOver);
      // 清理 Wails 事件监听
      if (cleanupWailsListener) {
        cleanupWailsListener();
      }
    };
  }, [handleFileDrop, handleDragOver]);

  // 渲染组件
  return (
    <ThemeProvider>
      <Flex className={style.container} gap="middle" wrap>
        <Layout className={style.layout}>
          <HeaderSection className={style.header}>
            <Header />
          </HeaderSection>
          <Content className={style.content}>
            <FilePanel />
            <div className={style.workspace}>
              <ToolbarPanel />
              <MainFlow />
              <PythonViewer />
              <FieldPanel />
              <EdgePanel />
              <ConfigPanel />
              <AIHistoryPanel />
              <LocalFileListPanel />
              <ToolPanel.Add />
              <ToolPanel.Global />
              <SearchPanel />
              <ToolPanel.Layout />
              <ErrorPanel />
              <LoggerPanel />
            </div>
          </Content>
        </Layout>
      </Flex>
      <GlobalListener />
    </ThemeProvider>
  );
}

export default App;
