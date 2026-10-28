// 等级规则：唯一的等级计算入口，前后端展示都以这里为准
// 活跃值 = 已发布帖子数 × 3 + 评论数 × 1 + 签到等额外经验（user.exp）
export const POST_WEIGHT = 3
export const COMMENT_WEIGHT = 1

export const LEVEL_RULES = [
  { level: 1, name: '萌新', minExp: 0 },
  { level: 2, name: '见习', minExp: 10 },
  { level: 3, name: '常客', minExp: 30 },
  { level: 4, name: '活跃', minExp: 70 },
  { level: 5, name: '核心', minExp: 150 },
  { level: 6, name: '元老', minExp: 300 }
]

/** 满级门槛（300），管理员按这个直接拉满 */
export const MAX_LEVEL_EXP = LEVEL_RULES[LEVEL_RULES.length - 1].minExp

export const expOf = (postCount, commentCount, extraExp = 0) =>
  (Number(postCount) || 0) * POST_WEIGHT +
  (Number(commentCount) || 0) * COMMENT_WEIGHT +
  (Number(extraExp) || 0)

/**
 * 根据发帖数、评论数与额外经验（签到）计算等级
 * @param {number} postCount 已发布帖子数
 * @param {number} commentCount 评论数
 * @param {number} extraExp 签到等额外经验（user.exp）
 * @returns {{level:number,name:string,exp:number,nextExp:number,toNext:number,progress:number,max:boolean}}
 */
export function calcLevel(postCount, commentCount, extraExp = 0) {
  const exp = expOf(postCount, commentCount, extraExp)
  let current = LEVEL_RULES[0]
  let next = null
  for (let i = 0; i < LEVEL_RULES.length; i++) {
    if (exp >= LEVEL_RULES[i].minExp) {
      current = LEVEL_RULES[i]
      next = LEVEL_RULES[i + 1] || null
    }
  }
  const base = current.minExp
  const target = next ? next.minExp : current.minExp
  const progress = next
    ? Math.min(100, Math.max(0, Math.round(((exp - base) / (target - base)) * 100)))
    : 100
  return {
    level: current.level,
    name: current.name,
    exp,
    nextExp: target,
    toNext: next ? target - exp : 0,
    progress,
    max: !next
  }
}
