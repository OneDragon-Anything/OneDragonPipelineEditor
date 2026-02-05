import { memo, useMemo, useRef, useEffect } from "react";
import { type NodeProps } from "@xyflow/react";

import style from "../../../../styles/nodes.module.less";
import type { PipelineNodeDataType } from "../../../../stores/flow";
import IconFont, { type IconNames } from "../../../iconfonts";
import { OneDragonNodeHandles } from "../components/OneDragonNodeHandles";

/**
 * OneDragon 节点的现代风格内容组件
 */
export const ModernContent = memo(
  ({ data }: { data: PipelineNodeDataType; props: NodeProps }) => {
    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (headerRef.current) {
        headerRef.current.offsetHeight;
      }
    }, [data.label]);

    // 获取节点图标
    const nodeIcon = useMemo<{ name: IconNames; size: number; color: string }>(() => {
      if (data.isStartNode) {
        return { name: "icon-kaishi", size: 16, color: "#52c41a" };
      }
      if (data.saveStatus) {
        return { name: "icon-beifen", size: 16, color: "#1890ff" };
      }
      if (data.nodeNotify && data.nodeNotify.length > 0) {
        return { name: "icon-rizhi", size: 16, color: "#faad14" };
      }
      return { name: "icon-m_act", size: 16, color: "#666" };
    }, [data.isStartNode, data.saveStatus, data.nodeNotify]);

    // 节点来源数量
    const fromCount = data.nodeFrom?.length || 0;

    // 是否有通知
    const hasNotify = data.nodeNotify && data.nodeNotify.length > 0;

    return (
      <>
        {/* 顶部区域 */}
        <div ref={headerRef} className={style.modernHeader}>
          <div className={style.headerLeft}>
            <span title={data.isStartNode ? "起始节点" : "操作节点"}>
              <IconFont
                className={style.typeIcon}
                name={nodeIcon.name}
                size={nodeIcon.size}
                style={{ color: nodeIcon.color }}
              />
            </span>
          </div>
          <div className={style.headerTitle}>{data.label}</div>
          <div className={style.headerRight}>
            {data.isStartNode && (
              <span className={`${style.badge} ${style.badgeStart}`}>
                起始
              </span>
            )}
            {data.saveStatus && (
              <span className={`${style.badge} ${style.badgeSave}`}>
                保存
              </span>
            )}
            <div className={style.moreBtn}>
              <IconFont name="icon-gengduo" size={14} />
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className={style.modernContent}>
          {/* 方法名 */}
          {data.methodName && (
            <div className={style.modernSection}>
              <div className={style.sectionHeader}>
                <IconFont name="icon-daima" size={14} />
                <span>方法</span>
              </div>
              <div className={style.sectionContent}>
                <code className={style.methodName}>{data.methodName}</code>
              </div>
            </div>
          )}

          {/* 来源连接信息 */}
          {fromCount > 0 && (
            <div className={style.modernSection}>
              <div className={style.sectionHeader}>
                <IconFont name="icon-lianjie" size={14} />
                <span>来源 ({fromCount})</span>
              </div>
              <div className={style.sectionContent}>
                {data.nodeFrom?.slice(0, 3).map((from, index) => (
                  <div key={index} className={style.fromItem}>
                    <span className={style.fromName}>{from.from_name}</span>
                    {from.success !== undefined && (
                      <span
                        className={style.fromCondition}
                        style={{ color: from.success ? "#52c41a" : "#ff4d4f" }}
                      >
                        {from.success ? "成功" : "失败"}
                      </span>
                    )}
                    {from.status && (
                      <span className={style.fromStatus}>
                        {from.status}
                      </span>
                    )}
                  </div>
                ))}
                {fromCount > 3 && (
                  <div className={style.moreItems}>+{fromCount - 3} 更多...</div>
                )}
              </div>
            </div>
          )}

          {/* 通知信息 */}
          {hasNotify && (
            <div className={style.modernSection}>
              <div className={style.sectionHeader}>
                <IconFont name="icon-rizhi" size={14} />
                <span>通知</span>
              </div>
              <div className={style.sectionContent}>
                {data.nodeNotify?.map((notify, index) => (
                  <div key={index} className={style.notifyItem}>
                    <span>{notify.when}</span>
                    {notify.detail && <span className={style.detailBadge}>详情</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 注释 */}
          {data.comment && (
            <div className={style.modernSection}>
              <div className={style.sectionHeader}>
                <IconFont name="icon-xiaohongshubiaoti" size={14} />
                <span>注释</span>
              </div>
              <div className={style.sectionContent}>
                <div className={style.commentText}>{data.comment}</div>
              </div>
            </div>
          )}
        </div>

        {/* Handle 连接点 */}
        <OneDragonNodeHandles handleDirection={data.handleDirection} />
      </>
    );
  }
);

ModernContent.displayName = "ModernContent";
