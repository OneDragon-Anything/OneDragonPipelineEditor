import style from "../../../styles/ConfigPanel.module.less";

import { memo, useMemo, useCallback } from "react";
import { Popover, Select, Button, Input, message } from "antd";
import classNames from "classnames";

import { useConfigStore } from "../../../stores/configStore";
import { useFlowStore } from "../../../stores/flow";
import { useFileStore } from "../../../stores/fileStore";
import { HANDLE_DIRECTION_OPTIONS } from "../../flow/nodes/constants";
import type { HandleDirection } from "../../flow/nodes/constants";
import TipElem from "./TipElem";

const PipelineConfigSection = memo(() => {
  const defaultHandleDirection = useConfigStore(
    (state) => state.configs.defaultHandleDirection
  );
  const setConfig = useConfigStore((state) => state.setConfig);
  const nodes = useFlowStore((state) => state.nodes);
  const setNodes = useFlowStore((state) => state.setNodes);
  const pythonClassName = useFileStore(
    (state) => state.currentFile.config.pythonClassName
  );
  const pythonBaseClass = useFileStore(
    (state) => state.currentFile.config.pythonBaseClass
  );
  const setFileConfig = useFileStore((state) => state.setFileConfig);

  const globalClass = useMemo(() => classNames(style.item, style.global), []);

  // 一键更改所有节点端点位置
  const handleApplyToAll = useCallback(() => {
    const newNodes = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        handleDirection:
          defaultHandleDirection === "left-right"
            ? undefined
            : defaultHandleDirection,
      },
    }));
    setNodes(newNodes);
    message.success(
      `已将所有节点端点位置更改为「${
        HANDLE_DIRECTION_OPTIONS.find((o) => o.value === defaultHandleDirection)
          ?.label
      }」`
    );
  }, [nodes, setNodes, defaultHandleDirection]);

  return (
    <>
      <div className={style.divider}>————— Pipeline 配置 —————</div>
      {/* 默认端点位置 */}
      <div className={globalClass}>
        <div className={style.key}>
          <Popover
            placement="bottomLeft"
            title="默认端点位置"
            content={
              <TipElem
                content={
                  "新创建节点的默认端点位置\n左右：左侧输入，右侧输出（默认）\n右左：右侧输入，左侧输出\n上下：上方输入，下方输出\n下上：下方输入，上方输出"
                }
              />
            }
          >
            <span>默认端点位置</span>
          </Popover>
        </div>
        <Select
          className={style.value}
          style={{ width: 70 }}
          value={defaultHandleDirection}
          onChange={(value: HandleDirection) =>
            setConfig("defaultHandleDirection", value)
          }
          options={HANDLE_DIRECTION_OPTIONS}
        />
      </div>
      {/* 一键更改所有节点端点位置 */}
      <div className={globalClass}>
        <div className={style.key}>
          <Popover
            placement="bottomLeft"
            title="一键更改"
            content="将所有节点的端点位置更改为当前选中的默认位置"
          >
            <span>一键更改端点位置</span>
          </Popover>
        </div>
        <Button className={style.value} size="small" onClick={handleApplyToAll}>
          应用到所有节点
        </Button>
      </div>
      <div className={style.divider}>————— Python 导出 —————</div>
      {/* 类名 */}
      <div className={globalClass}>
        <div className={style.key}>
          <Popover
            placement="bottomLeft"
            title="类名"
            content={
              <TipElem
                content="导出 Python 文件时生成的类名，留空则默认为 GeneratedApp"
              />
            }
          >
            <span>类名</span>
          </Popover>
        </div>
        <Input
          className={style.value}
          size="small"
          placeholder="GeneratedApp"
          value={pythonClassName || ""}
          onChange={(e) => setFileConfig("pythonClassName", e.target.value || undefined)}
        />
      </div>
      {/* 基类 */}
      <div className={globalClass}>
        <div className={style.key}>
          <Popover
            placement="bottomLeft"
            title="基类"
            content={
              <TipElem
                content="导出 Python 文件时继承的基类名，留空则默认为 ZApplication"
              />
            }
          >
            <span>基类</span>
          </Popover>
        </div>
        <Input
          className={style.value}
          size="small"
          placeholder="ZApplication"
          value={pythonBaseClass || ""}
          onChange={(e) => setFileConfig("pythonBaseClass", e.target.value || undefined)}
        />
      </div>
    </>
  );
});

export default PipelineConfigSection;
