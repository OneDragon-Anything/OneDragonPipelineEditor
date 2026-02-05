"""
示例 OneDragon 工作流
用于测试编辑器导入功能
"""

from one_dragon.base.operation.operation_node import operation_node
from one_dragon.base.operation.operation_round_result import OperationRoundResult
from one_dragon.base.conditional_operation.conditional_operator import ConditionalOperator


class ExampleWorkflow(ConditionalOperator):
    """示例工作流类"""

    @operation_node(name="开始准备", is_start_node=True)
    def start_prepare(self) -> OperationRoundResult:
        """初始化准备工作"""
        # 执行一些初始化逻辑
        self.prepare_data()
        return self.round_success()

    @node_from(from_name="开始准备")
    @operation_node(name="检查条件")
    def check_condition(self) -> OperationRoundResult:
        """检查执行条件"""
        if self.is_condition_met():
            return self.round_success()
        else:
            return self.round_fail("条件不满足")

    @node_from(from_name="检查条件", success=True)
    @operation_node(name="执行主任务", save_status=True)
    def execute_main_task(self) -> OperationRoundResult:
        """执行主要任务"""
        result = self.do_main_work()
        if result:
            return self.round_success()
        return self.round_fail("任务执行失败")

    @node_from(from_name="检查条件", success=False)
    @operation_node(name="等待重试")
    def wait_and_retry(self) -> OperationRoundResult:
        """等待后重试"""
        self.wait(5)
        return self.round_success()

    @node_from(from_name="执行主任务", success=True)
    @node_notify(when=NotifyTiming.CURRENT_DONE, detail=True)
    @operation_node(name="完成通知")
    def notify_complete(self) -> OperationRoundResult:
        """发送完成通知"""
        return self.round_success()

    @node_from(from_name="执行主任务", success=False)
    @node_from(from_name="等待重试")
    @operation_node(name="错误处理")
    def handle_error(self) -> OperationRoundResult:
        """处理错误情况"""
        self.log_error()
        return self.round_success()
