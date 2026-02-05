<p align="center">
  <img alt="LOGO" src="./public/logo.png" width="256" height="256" />
</p>

<div align="center">

# OneDragon Pipeline Editor

_✨ 可视化构建 OneDragon 节点工作流的下一代编辑器 ✨_

🛠️ 用拖拽+配置的方式，高效构建、调试、分享您的 OneDragon 自动化流程 🛠️

</div>

## 简介

**OneDragon Pipeline Editor** 是一款支持 OneDragon 框架装饰器风格节点工作流的可视化编辑器。

### OneDragon 工作流格式

本编辑器支持 OneDragon 框架的 Python 装饰器风格节点定义：

```python
from one_dragon.base.operation.operation_edge import node_from
from one_dragon.base.operation.operation_node import operation_node
from one_dragon.base.operation.operation_notify import NotifyTiming, node_notify
from one_dragon.base.operation.operation_round_result import OperationRoundResult

class MyApp(ZApplication):
    
    @operation_node(name='开始节点', is_start_node=True)
    def start_node(self) -> OperationRoundResult:
        return self.round_success()

    @node_from(from_name='开始节点')
    @operation_node(name='执行操作')
    def do_operation(self) -> OperationRoundResult:
        op = SomeOperation(self.ctx)
        return self.round_by_op_result(op.execute())

    @node_from(from_name='执行操作', success=True)
    @node_from(from_name='执行操作', success=False)
    @operation_node(name='完成处理')
    def handle_complete(self) -> OperationRoundResult:
        if self.previous_node.is_success:
            return self.round_success('成功')
        else:
            return self.round_success('失败')

    @node_from(from_name='执行操作', status='特定状态')
    @node_notify(when=NotifyTiming.CURRENT_DONE, detail=True)
    @operation_node(name='结束')
    def end_node(self) -> OperationRoundResult:
        op = BackToNormalWorld(self.ctx)
        return self.round_by_op_result(op.execute())
```

### 核心装饰器

| 装饰器 | 参数 | 说明 |
|--------|------|------|
| `@operation_node` | `name`, `is_start_node`, `save_status` | 定义操作节点 |
| `@node_from` | `from_name`, `success`, `status` | 定义节点来源连接 |
| `@node_notify` | `when`, `detail` | 定义节点通知 |

### 连接条件类型

| 条件 | 说明 | 示例 |
|------|------|------|
| 默认 | 无条件连接 | `@node_from(from_name='A')` |
| 成功 | 成功时连接 | `@node_from(from_name='A', success=True)` |
| 失败 | 失败时连接 | `@node_from(from_name='A', success=False)` |
| 状态 | 特定状态时连接 | `@node_from(from_name='A', status='状态值')` |

## 亮点

### ✨ 极致轻量，开箱即用

- **无需下载、无需安装**，打开在线编辑器即可开始可视化编辑
- 基于 Web 的**真正意义跨平台**

### 🧠 所见即所思，流程即逻辑

- 注重**编辑功能**，更注重**阅读体验**
- **多种节点样式**，依据数据查阅场景随意切换
- 选中**节点聚焦**、**关键路径高亮**、**可拖拽连接**，让逻辑跃然纸上

### 🐍 Python 装饰器风格

- 完整支持 OneDragon 框架的 `@operation_node`、`@node_from`、`@node_notify` 装饰器
- **导入 Python 文件**自动解析为可视化流程图
- **导出 Python 代码**生成标准的 OneDragon 类定义

### 🧰 全面辅助，模板自由

- 内置丰富**节点预制模板**
  - 起始节点
  - 操作节点
  - 判断节点
  - 循环节点
  - 通知节点
  - 结束节点
- 支持创建与保存**自定义模板**，一次配置，处处复用

## 节点模板

编辑器内置以下节点模板：

| 模板名称 | 说明 |
|----------|------|
| 空节点 | 基础的空白节点 |
| 起始节点 | 流程的起点，`is_start_node=True` |
| 操作节点 | 执行具体操作的节点 |
| 判断节点 | 根据条件返回不同状态 |
| 循环节点 | 循环执行的节点 |
| 通知节点 | 带通知功能的节点 |
| 结束节点 | 流程的终点 |
| 保存状态节点 | `save_status=True` 的节点 |

## 使用方法

### 导入 Python 文件

1. 打开编辑器
2. 点击"导入"按钮
3. 选择 OneDragon 风格的 Python 文件
4. 自动解析并显示为可视化流程图

### 编辑节点

1. 双击节点打开编辑面板
2. 修改节点属性：
   - 节点名称
   - 方法名
   - 是否为起始节点
   - 是否保存状态
   - 注释
   - 代码

### 创建连接

1. 从源节点的输出端口拖拽
2. 连接到目标节点的输入端口
3. 设置连接条件（默认/成功/失败/状态）

### 导出 Python 代码

1. 点击"导出"按钮
2. 选择导出为 Python 文件
3. 自动生成完整的 OneDragon 类定义

## 技术栈

- **React 19** - UI 框架
- **TypeScript 5.8** - 类型安全
- **React Flow 12** - 流程图引擎
- **Zustand** - 状态管理
- **Vite** - 构建工具

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## License

MIT License
