// B 站风格表情包：内容里存文本标签（如 [doge]），渲染时替换成表情。
//
// 说明：B 站原版表情是一套图片资源，直接外链或搬运有版权与稳定性风险，
// 这里用「文本标签 + emoji」实现同等交互：存储格式与 B 站一致（[标签]），
// 视觉上用 emoji 呈现，跨端一致、零依赖、不会挂图。
// 若要换成真实图片，只需把下面每项的 char 改成
//   <img src="/emojis/doge.png" class="bili-emo-img" alt="doge" />
// 渲染逻辑无需改动。

export const EMOJI_GROUPS = [
  {
    name: '热门',
    items: [
      { tag: 'doge', char: '🐶', label: 'doge' },
      { tag: '滑稽', char: '😏', label: '滑稽' },
      { tag: '捂脸', char: '🤦', label: '捂脸' },
      { tag: '大哭', char: '😭', label: '大哭' },
      { tag: '妙啊', char: '🤩', label: '妙啊' },
      { tag: '笑', char: '😄', label: '笑' },
      { tag: '思考', char: '🤔', label: '思考' },
      { tag: '尴尬', char: '😅', label: '尴尬' }
    ]
  },
  {
    name: '表情',
    items: [
      { tag: '微笑', char: '🙂', label: '微笑' },
      { tag: '呲牙', char: '😁', label: '呲牙' },
      { tag: '酷', char: '😎', label: '酷' },
      { tag: '困', char: '😪', label: '困' },
      { tag: '惊吓', char: '😱', label: '惊吓' },
      { tag: '生气', char: '😠', label: '生气' },
      { tag: '辣眼睛', char: '🙈', label: '辣眼睛' },
      { tag: '灵魂出窍', char: '👻', label: '灵魂出窍' }
    ]
  },
  {
    name: '手势与物件',
    items: [
      { tag: '点赞', char: '👍', label: '点赞' },
      { tag: '投币', char: '🪙', label: '投币' },
      { tag: '收藏', char: '⭐', label: '收藏' },
      { tag: '干杯', char: '🍻', label: '干杯' },
      { tag: '庆祝', char: '🎉', label: '庆祝' },
      { tag: '爱心', char: '❤️', label: '爱心' },
      { tag: '玫瑰', char: '🌹', label: '玫瑰' },
      { tag: '便便', char: '💩', label: '便便' }
    ]
  }
]

const EMOJI_MAP = new Map()
EMOJI_GROUPS.forEach(g => g.items.forEach(e => EMOJI_MAP.set(e.tag, e)))

export function findEmoji(tag) {
  return EMOJI_MAP.get(tag) || null
}

const TAG_PATTERN = /\[([^\][\n]{1,10})\]/g

/**
 * 把已转义的 HTML 文本里的 [标签] 替换成表情。
 * 必须在 HTML 转义之后调用，避免用户输入的表情标签被当成标签解析。
 */
export function renderEmoji(escapedHtml) {
  if (!escapedHtml) return ''
  return escapedHtml.replace(TAG_PATTERN, (match, tag) => {
    const emoji = EMOJI_MAP.get(tag)
    if (!emoji) return match
    return `<span class="bili-emo" title="${emoji.label}">${emoji.char}</span>`
  })
}

/** 统计一段文本里有多少个表情标签，用于「文字+表情」的长度校验 */
export function countEmoji(text) {
  if (!text) return 0
  return (text.match(TAG_PATTERN) || []).length
}
