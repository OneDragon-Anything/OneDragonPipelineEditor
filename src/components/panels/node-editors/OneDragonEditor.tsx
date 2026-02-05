import style from "../../../styles/FieldPanel.module.less";
import { memo, useMemo, useCallback, lazy, useState } from "react";
import { Input, Switch, Collapse, Button, message } from "antd";
import IconFont from "../../iconfonts";
import { useFlowStore, type PipelineNodeType } from "../../../stores/flow";

const { TextArea } = Input;

/**
 * OneDragon 节点编辑器
 * 用于编辑 OneDragon 格式的节点数据
 */
export const OneDragonEditor = lazy(() =>
  Promise.resolve({
    default: memo(({ currentNode }: { currentNode: PipelineNodeType }) => {
      const setNodeData = useFlowStore((state) => state.setNodeData);
      const [copied, setCopied] = useState(false);

      // 节点名称
      const currentLabel = useMemo(
        () => currentNode.data.label || "",
        [currentNode.data.label]
      );
      const onLabelChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          setNodeData(currentNode.id, "data", "label", e.target.value);
        },
        [currentNode.id, setNodeData]
      );

      // 方法名
      const methodName = useMemo(
        () => currentNode.data.methodName || "",
        [currentNode.data.methodName]
      );
      const onMethodNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          setNodeData(currentNode.id, "data", "methodName", e.target.value);
        },
        [currentNode.id, setNodeData]
      );

      // 是否为起始节点
      const isStartNode = useMemo(
        () => currentNode.data.isStartNode || false,
        [currentNode.data.isStartNode]
      );
      const onStartNodeChange = useCallback(
        (checked: boolean) => {
          setNodeData(currentNode.id, "data", "isStartNode", checked);
        },
        [currentNode.id, setNodeData]
      );

      // 是否保存状态
      const saveStatus = useMemo(
        () => currentNode.data.saveStatus || false,
        [currentNode.data.saveStatus]
      );
      const onSaveStatusChange = useCallback(
        (checked: boolean) => {
          setNodeData(currentNode.id, "data", "saveStatus", checked);
        },
        [currentNode.id, setNodeData]
      );

      // 方法体代码
      const code = useMemo(
        () => currentNode.data.code || "return self.round_success()",
        [currentNode.data.code]
      );
      const onCodeChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          setNodeData(currentNode.id, "data", "code", e.target.value);
        },
        [currentNode.id, setNodeData]
      );

      // 注释
      const comment = useMemo(
        () => currentNode.data.comment || "",
        [currentNode.data.comment]
      );
      const onCommentChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          setNodeData(currentNode.id, "data", "comment", e.target.value);
        },
        [currentNode.id, setNodeData]
      );

      // 生成 Python 代码预览
      const pythonCode = useMemo(() => {
        const lines: string[] = [];
        
        // 添加 node_from 装饰器
        if (currentNode.data.nodeFrom && currentNode.data.nodeFrom.length > 0) {
          for (const from of currentNode.data.nodeFrom) {
            const params: string[] = [`from_name="${from.from_name}"`];
            if (from.success !== undefined) {
              params.push(`success=${from.success ? "True" : "False"}`);
            }
            if (from.status !== undefined) {
              params.push(`status="${from.status}"`);
            }
            lines.push(`    @node_from(${params.join(", ")})`);
          }
        }

        // 添加 node_notify 装饰器
        if (currentNode.data.nodeNotify && currentNode.data.nodeNotify.length > 0) {
          for (const notify of currentNode.data.nodeNotify) {
            const params: string[] = [`when=${notify.when}`];
            if (notify.detail !== undefined) {
              params.push(`detail=${notify.detail ? "True" : "False"}`);
            }
            lines.push(`    @node_notify(${params.join(", ")})`);
          }
        }

        // 添加 operation_node 装饰器
        const opParams: string[] = [`name="${currentLabel}"`];
        if (isStartNode) {
          opParams.push("is_start_node=True");
        }
        if (saveStatus) {
          opParams.push("save_status=True");
        }
        lines.push(`    @operation_node(${opParams.join(", ")})`);

        // 添加方法定义
        lines.push(`    def ${methodName}(self) -> OperationRoundResult:`);

        // 添加文档字符串
        if (comment) {
          lines.push(`        """${comment}"""`);
        }

        // 添加方法体
        const codeLines = code.split("\n");
        for (const line of codeLines) {
          lines.push(`        ${line}`);
        }

        return lines.join("\n");
      }, [currentNode.data, currentLabel, methodName, isStartNode, saveStatus, code, comment]);

      // 复制代码
      const handleCopyCode = useCallback(() => {
        navigator.clipboard.writeText(pythonCode).then(() => {
          setCopied(true);
          message.success("代码已复制到剪贴板");
          setTimeout(() => setCopied(false), 2000);
        });
      }, [pythonCode]);

      // Collapse 配置
      const collapseItems = [
        {
          key: "basic",
          label: (
            <div className={style.collapseHeader}>
              <IconFont name="icon-biaodanmoban" size={16} />
              <span>基本属性</span>
            </div>
          ),
          children: (
            <div className={style.section}>
              <div className={style.field}>
                <label>节点名称</label>
                <Input
                  value={currentLabel}
                  onChange={onLabelChange}
                  placeholder="输入节点名称"
                />
              </div>
              <div className={style.field}>
                <label>方法名</label>
                <Input
                  value={methodName}
                  onChange={onMethodNameChange}
                  placeholder="输入方法名"
                  addonBefore="def"
                  addonAfter="(self)"
                />
              </div>
              <div className={style.fieldRow}>
                <div className={style.switchField}>
                  <label>起始节点</label>
                  <Switch checked={isStartNode} onChange={onStartNodeChange} />
                </div>
                <div className={style.switchField}>
                  <label>保存状态</label>
                  <Switch checked={saveStatus} onChange={onSaveStatusChange} />
                </div>
              </div>
            </div>
          ),
        },
        {
          key: "code",
          label: (
            <div className={style.collapseHeader}>
              <IconFont name="icon-daima" size={16} />
              <span>方法代码</span>
            </div>
          ),
          children: (
            <div className={style.section}>
              <div className={style.field}>
                <label>注释/说明</label>
                <TextArea
                  value={comment}
                  onChange={onCommentChange}
                  placeholder="输入方法说明（可选）"
                  autoSize={{ minRows: 1, maxRows: 3 }}
                />
              </div>
              <div className={style.field}>
                <label>方法体</label>
                <TextArea
                  value={code}
                  onChange={onCodeChange}
                  placeholder="return self.round_success()"
                  autoSize={{ minRows: 3, maxRows: 15 }}
                  className={style.codeInput}
                  style={{ fontFamily: "monospace" }}
                />
              </div>
            </div>
          ),
        },
        {
          key: "preview",
          label: (
            <div className={style.collapseHeader}>
              <IconFont name="icon-tuxiang" size={16} />
              <span>Python 代码预览</span>
            </div>
          ),
          children: (
            <div className={style.section}>
              <div className={style.codePreview}>
                <div className={style.codeHeader}>
                  <span>生成的 Python 代码</span>
                  <Button
                    type="text"
                    size="small"
                    icon={<IconFont name={copied ? "icon-zidingyi1" : "icon-fuzhi"} size={14} />}
                    onClick={handleCopyCode}
                  >
                    {copied ? "已复制" : "复制"}
                  </Button>
                </div>
                <pre className={style.codeBlock}>{pythonCode}</pre>
              </div>
            </div>
          ),
        },
      ];

      return (
        <div className={style.editor}>
          <Collapse
            defaultActiveKey={["basic", "code", "preview"]}
            items={collapseItems}
            bordered={false}
            expandIconPosition="end"
          />
        </div>
      );
    }),
  })
);

export const OneDragonEditorWithSuspense = memo(
  ({ currentNode }: { currentNode: PipelineNodeType }) => {
    return (
      <div className={style.editorWrapper}>
        <OneDragonEditor currentNode={currentNode} />
      </div>
    );
  }
);
