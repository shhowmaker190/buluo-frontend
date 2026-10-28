// 部落热度等级：热度 = 成员数 × 3 + 已发布帖子数 × 2（后端计算）
// 阈值随社区规模可以再调，改了这里热门榜的徽章会一起变
export const TRIBE_HEAT_RULES = [
  { level: 1, name: '新芽', minHeat: 0 },
  { level: 2, name: '微热', minHeat: 5 },
  { level: 3, name: '升温', minHeat: 12 },
  { level: 4, name: '火爆', minHeat: 25 },
  { level: 5, name: '顶流', minHeat: 50 }
]

/**
 * 按热度算部落等级
 * @param {number} heat 热度值
 * @returns {{level:number,name:string,heat:number,nextHeat:number,toNext:number,progress:number,max:boolean}}
 */
export function calcHeatLevel(heat) {
  const value = Number(heat) || 0
  let current = TRIBE_HEAT_RULES[0]
  let next = null
  for (let i = 0; i < TRIBE_HEAT_RULES.length; i++) {
    if (value >= TRIBE_HEAT_RULES[i].minHeat) {
      current = TRIBE_HEAT_RULES[i]
      next = TRIBE_HEAT_RULES[i + 1] || null
    }
  }
  const base = current.minHeat
  const target = next ? next.minHeat : current.minHeat
  const progress = next
    ? Math.min(100, Math.max(0, Math.round(((value - base) / (target - base)) * 100)))
    : 100
  return {
    level: current.level,
    name: current.name,
    heat: value,
    nextHeat: target,
    toNext: next ? target - value : 0,
    progress,
    max: !next
  }
}
