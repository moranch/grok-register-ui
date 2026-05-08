import { type TFunction } from 'i18next'
import type { NavGroup } from '../types'

export const WORKSPACE_IDS = {
  DEFAULT: 'default',
} as const

export type WorkspaceId = (typeof WORKSPACE_IDS)[keyof typeof WORKSPACE_IDS]

export type WorkspaceConfig = {
  id: WorkspaceId
  name: string
  pathPattern: string | RegExp
  getNavGroups?: (t: TFunction) => NavGroup[]
}

const workspaceRegistry: WorkspaceConfig[] = [
  {
    id: WORKSPACE_IDS.DEFAULT,
    name: 'Default',
    pathPattern: /.*/,
  },
]

export function getWorkspaceByPath(pathname: string): WorkspaceConfig {
  const workspace = workspaceRegistry.find((ws) => {
    if (typeof ws.pathPattern === 'string') {
      return pathname.includes(ws.pathPattern)
    }
    return ws.pathPattern.test(pathname)
  })
  return workspace || workspaceRegistry[workspaceRegistry.length - 1]
}

export function getNavGroupsForPath(
  pathname: string,
  t: TFunction
): NavGroup[] | undefined {
  const workspace = getWorkspaceByPath(pathname)
  return workspace.getNavGroups?.(t)
}

export function isInWorkspace(
  pathname: string,
  workspaceId: WorkspaceId
): boolean {
  return getWorkspaceByPath(pathname).id === workspaceId
}

export function getAllWorkspaces(): WorkspaceConfig[] {
  return workspaceRegistry
}
