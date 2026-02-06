import { useState, useEffect } from "react";
import { Modal, Form, Input, message } from "antd";
import { DownloadOutlined, FileOutlined } from "@ant-design/icons";
import { exportToPython } from "../../core/parser";
import { useFlowStore } from "../../stores/flow";

interface ExportFileModalProps {
  visible: boolean;
  onCancel: () => void;
}

export const ExportFileModal: React.FC<ExportFileModalProps> = ({
  visible,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const { nodes, edges } = useFlowStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
  }));

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        fileName: "generated_app",
      });
      setPreviewFileName("generated_app.py");
    }
  }, [visible, form]);

  // 更新预览文件名
  const updatePreview = () => {
    const fileName = form.getFieldValue("fileName") || "";
    if (fileName.trim()) {
      setPreviewFileName(`${fileName.trim()}.py`);
    } else {
      setPreviewFileName("");
    }
  };

  // 处理文件名变化
  const handleFileNameChange = () => {
    updatePreview();
  };

  // 验证文件名
  const validateFileName = (fileName: string): boolean => {
    if (!fileName || !fileName.trim()) return false;
    const invalidChars = /[\\/:*?"<>|]/;
    return !invalidChars.test(fileName);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const { fileName } = values;
      const trimmedName = fileName.trim();

      // 过滤 Pipeline 节点（导出用）
      const pipelineNodes = nodes.filter((n) => n.type === "pipeline");
      const flowEdges = edges.map(edge => ({
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: edge.target,
        attributes: edge.attributes
      }));

      // 生成 Python 代码
      const { getExportMetadata } = await import("../../stores/fileStore");
      const pythonCode = exportToPython(pipelineNodes as any, flowEdges, getExportMetadata());

      // 导出文件
      await exportFile(`${trimmedName}.py`, pythonCode);
      message.success(`已导出 ${trimmedName}.py`);
      onCancel();
    } catch (error) {
      console.error("[ExportFileModal] Failed to export file:", error);
      message.error("导出失败");
    }
  };

  // 导出文件的通用函数
  const exportFile = async (fullFileName: string, content: string) => {
    // 检查是否支持 File System Access API
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fullFileName,
          types: [
            {
              description: "Python Files",
              accept: {
                "text/x-python": [".py"],
              },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw err;
        }
        console.warn(
          "[ExportFileModal] File System Access API failed, fallback to download:",
          err
        );
      }
    }

    // 降级使用传统下载方式
    const blob = new Blob([content], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fullFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCancel = () => {
    form.resetFields();
    setPreviewFileName("");
    onCancel();
  };

  return (
    <Modal
      title={
        <span>
          <DownloadOutlined />
          <span style={{ marginLeft: 8 }}>导出为 Python 文件</span>
        </span>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="导出"
      cancelText="取消"
      okButtonProps={{
        disabled: !previewFileName,
      }}
      width={400}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="fileName"
          label="文件名"
          rules={[
            {
              validator: (_, value) => {
                if (!value || !value.trim()) {
                  return Promise.reject("请输入文件名");
                }
                if (!validateFileName(value)) {
                  return Promise.reject(
                    '文件名不能包含特殊字符 \\ / : * ? " < > |'
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder="输入文件名（不含后缀）"
            prefix={<FileOutlined />}
            onChange={handleFileNameChange}
          />
        </Form.Item>

        {previewFileName && (
          <Form.Item label="预览文件名">
            <div
              style={{
                padding: "8px 12px",
                background: "#f5f5f5",
                borderRadius: "4px",
                color: "#52c41a",
                fontWeight: 500,
              }}
            >
              {previewFileName}
            </div>
          </Form.Item>
        )}

        <Form.Item>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            <div>提示：</div>
            <div>• 将当前画布内容编译为 OneDragon Python 代码并导出</div>
            <div>• 使用浏览器下载功能保存到本地</div>
            <div>• 文件格式：Python (.py)</div>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};
