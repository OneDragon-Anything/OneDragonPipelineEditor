import { Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { memo } from "react";
import { useToolbarStore } from "../../../stores/toolbarStore";
import style from "../../../styles/ToolbarPanel.module.less";

/**
 * Python 代码预览按钮组件
 * 控制 Python 代码浮动面板的显示/隐藏
 */
function PythonPreviewButton() {
  const { jsonPanelVisible, toggleJsonPanel } = useToolbarStore();

  // 点击按钮切换面板显示状态
  const handleButtonClick = () => {
    toggleJsonPanel();
  };

  return (
    <Button
      icon={<EyeOutlined />}
      onClick={handleButtonClick}
      className={`${style.toolbarButton} ${
        jsonPanelVisible ? style.active : ""
      }`}
    >
      Python 预览
    </Button>
  );
}

export default memo(PythonPreviewButton);
