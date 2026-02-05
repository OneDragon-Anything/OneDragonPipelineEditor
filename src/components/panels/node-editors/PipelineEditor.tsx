import style from "../../../styles/FieldPanel.module.less";
import { memo, useMemo, useCallback, lazy, useState, useEffect } from "react";
import { Input, Switch, Collapse, Button, message, Modal, Select, Popconfirm, Tag, Empty } from "antd";
import { HolderOutlined } from "@ant-design/icons";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import IconFont from "../../iconfonts";
import { useFlowStore, type PipelineNodeType } from "../../../stores/flow";
import { NotifyTimingOptions } from "../../../core/fields/onedragon/enums";
import Editor from "@monaco-editor/react";

const { TextArea } = Input;

interface NodeNotify {
  when: string;
  detail?: boolean;
}

/**
 * 可排序的出口项组件
 */
interface SortableOutputItemProps {
  handle: string;
  displayName: string;
  edges: {
    edgeId: string;
    targetLabel: string;
    success?: boolean;
  }[];
}

const SortableOutputItem = memo(({
  handle,
  displayName,
  edges,
}: SortableOutputItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: handle });

  const itemStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getEdgeDisplayText = (edge: typeof edges[0]): string => {
    const parts = [`→ ${edge.targetLabel}`];
    if (edge.success === false) {
      parts.push("(失败)");
    }
    return parts.join(" ");
  };

  return (
    <div ref={setNodeRef} style={itemStyle} className={style.outputGroup}>
      <div className={style.outputHandle}>
        <HolderOutlined
          className={style.dragHandle}
          {...attributes}
          {...listeners}
        />
        <Tag color={handle === "default" ? "blue" : "green"}>
          {displayName}
        </Tag>
        <span className={style.edgeCount}>
          {edges.length > 0 ? `${edges.length} 条连接` : "未连接"}
        </span>
      </div>
      {edges.length > 0 && (
        <div className={style.outputEdges}>
          {edges.map((edge) => (
            <div key={edge.edgeId} className={style.outputEdge}>
              <span className={style.edgeText}>
                {getEdgeDisplayText(edge)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * 代码编辑弹窗组件 - 使用 Monaco Editor
 */
const CodeEditorModal = memo(({
  open,
  title,
  code,
  onOk,
  onCancel,
}: {
  open: boolean;
  title: string;
  code: string;
  onOk: (code: string) => void;
  onCancel: () => void;
}) => {
  const [editingCode, setEditingCode] = useState(code);

  useEffect(() => {
    if (open) {
      setEditingCode(code);
    }
  }, [open, code]);

  // 阻止键盘事件冒泡到 Modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Modal
      title={title}
      open={open}
      onOk={() => onOk(editingCode)}
      onCancel={onCancel}
      width={800}
      okText="确定"
      cancelText="取消"
      styles={{ body: { padding: "12px 0" } }}
      keyboard={false}
    >
      <div
        className={style.monacoContainer}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyDown}
      >
        <Editor
          height="400px"
          language="python"
          value={editingCode}
          onChange={(value) => setEditingCode(value || "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            folding: true,
            renderLineHighlight: "all",
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            padding: { top: 10, bottom: 10 },
            // 确保键盘输入正常
            acceptSuggestionOnEnter: "on",
            quickSuggestions: true,
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
          }}
        />
      </div>
    </Modal>
  );
});

/**
 * Pipeline 节点编辑器 (OneDragon 风格)
 */
export const PipelineEditor = lazy(() =>
  Promise.resolve({
    default: memo(({ currentNode }: { currentNode: PipelineNodeType }) => {
      const setNodeData = useFlowStore((state) => state.setNodeData);
      const [copied, setCopied] = useState(false);
      const [codeModalOpen, setCodeModalOpen] = useState(false);

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
      const onCodeSave = useCallback(
        (newCode: string) => {
          setNodeData(currentNode.id, "data", "code", newCode);
          setCodeModalOpen(false);
          message.success("代码已保存");
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

      // 通知配置
      const nodeNotify = useMemo<NodeNotify[]>(
        () => currentNode.data.nodeNotify || [],
        [currentNode.data.nodeNotify]
      );

      // 添加通知
      const onAddNotify = useCallback(() => {
        const newNotify: NodeNotify = {
          when: NotifyTimingOptions[0].value,
          detail: false,
        };
        setNodeData(currentNode.id, "data", "nodeNotify", [...nodeNotify, newNotify]);
      }, [currentNode.id, setNodeData, nodeNotify]);

      // 删除通知
      const onRemoveNotify = useCallback((index: number) => {
        const newNotify = nodeNotify.filter((_, i) => i !== index);
        setNodeData(currentNode.id, "data", "nodeNotify", newNotify);
      }, [currentNode.id, setNodeData, nodeNotify]);

      // 更新通知的 when
      const onNotifyWhenChange = useCallback((index: number, when: string) => {
        const newNotify = [...nodeNotify];
        newNotify[index] = { ...newNotify[index], when };
        setNodeData(currentNode.id, "data", "nodeNotify", newNotify);
      }, [currentNode.id, setNodeData, nodeNotify]);

      // 更新通知的 detail
      const onNotifyDetailChange = useCallback((index: number, detail: boolean) => {
        const newNotify = [...nodeNotify];
        newNotify[index] = { ...newNotify[index], detail };
        setNodeData(currentNode.id, "data", "nodeNotify", newNotify);
      }, [currentNode.id, setNodeData, nodeNotify]);

      // ========== 出口管理 ==========
      const edges = useFlowStore((state) => state.edges);
      const nodes = useFlowStore((state) => state.nodes);

      // 获取此节点的所有出口信息
      const nodeOutputs = useMemo(() => {
        const outputs: {
          handle: string;
          status?: string;
          success?: boolean;
          targetLabel: string;
          edgeId: string;
        }[] = [];

        edges.forEach((edge) => {
          if (edge.source === currentNode.id) {
            const handle = String(edge.sourceHandle || "default");
            let status: string | undefined;

            // 从 handle 解析 status
            if (handle.startsWith("status:")) {
              status = handle.replace("status:", "");
            }

            // 找到目标节点名称
            const targetNode = nodes.find((n) => n.id === edge.target);
            const targetLabel = targetNode?.data?.label || "未知节点";

            outputs.push({
              handle,
              status,
              success: edge.attributes?.success as boolean | undefined,
              targetLabel,
              edgeId: edge.id,
            });
          }
        });

        return outputs;
      }, [edges, nodes, currentNode.id]);

      // 获取唯一出口列表（用于显示），按存储的顺序排列
      const uniqueHandles = useMemo(() => {
        const handleSet = new Set<string>();
        handleSet.add("default"); // 默认出口始终存在

        nodeOutputs.forEach((output) => {
          handleSet.add(output.handle);
        });

        // 如果有存储的顺序，使用存储的顺序
        const savedOrder = currentNode.data.handleOrder || [];
        const allHandles = Array.from(handleSet);

        // 按照保存的顺序排列，新的出口添加到末尾
        const sortedHandles: string[] = [];

        // 首先添加保存顺序中存在的出口
        for (const handle of savedOrder) {
          if (allHandles.includes(handle)) {
            sortedHandles.push(handle);
          }
        }

        // 然后添加不在保存顺序中的出口
        for (const handle of allHandles) {
          if (!sortedHandles.includes(handle)) {
            // default 始终在最前面（如果不在保存顺序中）
            if (handle === "default") {
              sortedHandles.unshift(handle);
            } else {
              sortedHandles.push(handle);
            }
          }
        }

        return sortedHandles;
      }, [nodeOutputs, currentNode.data.handleOrder]);

      // 拖拽排序传感器
      const sensors = useSensors(
        useSensor(PointerSensor, {
          activationConstraint: { distance: 5 },
        })
      );

      // 拖拽结束处理
      const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
          const oldIndex = uniqueHandles.indexOf(String(active.id));
          const newIndex = uniqueHandles.indexOf(String(over.id));

          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(uniqueHandles, oldIndex, newIndex);
            setNodeData(currentNode.id, "data", "handleOrder", newOrder);
            // handleOrder 更新后，PipelineNodeHandles 组件会自动处理
            // updateNodeInternals 的调用（因为它订阅了 nodes store）
          }
        }
      }, [uniqueHandles, currentNode.id, setNodeData]);

      // 获取出口的显示名称
      const getHandleDisplayName = useCallback((handle: string): string => {
        if (handle === "default") return "默认出口";
        if (handle.startsWith("status:")) {
          const status = handle.replace("status:", "");
          return `状态: ${status}`;
        }
        return handle;
      }, []);

      // 获取出口下的边列表
      const getEdgesForHandle = useCallback(
        (handle: string) => {
          return nodeOutputs.filter((output) => output.handle === handle);
        },
        [nodeOutputs]
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
        if (nodeNotify.length > 0) {
          for (const notify of nodeNotify) {
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
      }, [currentNode.data, currentLabel, methodName, isStartNode, saveStatus, code, comment, nodeNotify]);

      // 复制代码
      const handleCopyCode = useCallback(() => {
        navigator.clipboard.writeText(pythonCode).then(() => {
          setCopied(true);
          message.success("代码已复制到剪贴板");
          setTimeout(() => setCopied(false), 2000);
        });
      }, [pythonCode]);

      // 代码预览（简短版本）
      const codePreviewShort = useMemo(() => {
        const lines = code.split("\n");
        if (lines.length <= 2) return code;
        return lines.slice(0, 2).join("\n") + "\n...";
      }, [code]);

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
                <div
                  className={style.codeClickable}
                  onClick={() => setCodeModalOpen(true)}
                  title="点击编辑代码"
                >
                  <pre className={style.codePreviewSmall}>{codePreviewShort}</pre>
                  <div className={style.codeEditHint}>
                    <IconFont name="icon-daima" size={14} />
                    <span>点击编辑代码</span>
                  </div>
                </div>
              </div>
            </div>
          ),
        },
        {
          key: "notify",
          label: (
            <div className={style.collapseHeader}>
              <IconFont name="icon-rizhi" size={16} />
              <span>通知配置 {nodeNotify.length > 0 ? `(${nodeNotify.length})` : ""}</span>
            </div>
          ),
          children: (
            <div className={style.section}>
              {nodeNotify.length > 0 ? (
                <div className={style.notifyList}>
                  {nodeNotify.map((notify, index) => (
                    <div key={index} className={style.notifyItem}>
                      <Select
                        size="small"
                        value={notify.when}
                        onChange={(value) => onNotifyWhenChange(index, value)}
                        options={NotifyTimingOptions}
                        className={style.notifySelect}
                      />
                      <div className={style.notifyDetailSwitch}>
                        <span>详情</span>
                        <Switch
                          size="small"
                          checked={notify.detail || false}
                          onChange={(checked) => onNotifyDetailChange(index, checked)}
                        />
                      </div>
                      <Popconfirm
                        title="确定删除此通知配置？"
                        onConfirm={() => onRemoveNotify(index)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <IconFont
                          name="icon-shanchu"
                          size={16}
                          color="#ff4a4a"
                          className={style.notifyDelete}
                        />
                      </Popconfirm>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={style.emptyTip}>暂无通知配置</div>
              )}
              <Button
                type="dashed"
                block
                onClick={onAddNotify}
                className={style.addNotifyBtn}
              >
                <IconFont name="icon-xinjiantianjia" size={14} />
                添加通知
              </Button>
            </div>
          ),
        },
        {
          key: "outputs",
          label: (
            <div className={style.collapseHeader}>
              <IconFont name="icon-lianjie" size={16} />
              <span>出口管理 {nodeOutputs.length > 0 ? `(${nodeOutputs.length})` : ""}</span>
            </div>
          ),
          children: (
            <div className={style.section}>
              {uniqueHandles.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={uniqueHandles}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className={style.outputList}>
                      {uniqueHandles.map((handle) => {
                        const edgesForHandle = getEdgesForHandle(handle);
                        return (
                          <SortableOutputItem
                            key={handle}
                            handle={handle}
                            displayName={getHandleDisplayName(handle)}
                            edges={edgesForHandle.map((e) => ({
                              edgeId: e.edgeId,
                              targetLabel: e.targetLabel,
                              success: e.success,
                            }))}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <Empty
                  description="暂无出口"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
              <div className={style.outputHint}>
                <IconFont name="icon-xiaohongshubiaoti" size={14} />
                <span>拖拽出口可调整顺序，从此节点拖出连线会自动创建出口</span>
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
            defaultActiveKey={["basic", "code", "notify", "preview"]}
            items={collapseItems}
            bordered={false}
            expandIconPosition="end"
          />

          {/* 代码编辑弹窗 */}
          <CodeEditorModal
            open={codeModalOpen}
            title={`编辑方法体 - ${methodName}`}
            code={code}
            onOk={onCodeSave}
            onCancel={() => setCodeModalOpen(false)}
          />
        </div>
      );
    }),
  })
);

export const PipelineEditorWithSuspense = memo(
  ({ currentNode }: { currentNode: PipelineNodeType }) => {
    return (
      <div className={style.editorWrapper}>
        <PipelineEditor currentNode={currentNode} />
      </div>
    );
  }
);
