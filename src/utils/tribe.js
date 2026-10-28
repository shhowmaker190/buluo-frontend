export const ROLE_LEADER = 'LEADER'
export const ROLE_DEPUTY = 'DEPUTY'
export const ROLE_MEMBER = 'MEMBER'

export const ROLE_LABEL = {
  LEADER: '首领',
  DEPUTY: '副首领',
  MEMBER: '成员'
}

export const roleLabel = (role) => ROLE_LABEL[role] || ''

export const isLeader = (role) => role === ROLE_LEADER
