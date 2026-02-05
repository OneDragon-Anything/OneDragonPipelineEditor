import type { EdgeType } from "../types";

// 查找边
export function findEdgeById(
  edges: EdgeType[],
  id: string
): EdgeType | undefined {
  return edges.find((edge) => edge.id === id);
}

// 筛选选中的边
export function getSelectedEdges(edges: EdgeType[]): EdgeType[] {
  return edges.filter((edge) => edge.selected);
}

// 计算链接次序
export function calcuLinkOrder(
  edges: EdgeType[],
  source: string,
  sourceHandle: string
): number {
  let order = 1;

  edges.forEach((edge) => {
    if (edge.source === source && edge.sourceHandle === sourceHandle) {
      order++;
    }
  });
  return order;
}
