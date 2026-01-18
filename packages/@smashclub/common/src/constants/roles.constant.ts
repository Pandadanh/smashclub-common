/**
 * User roles enum
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  PLAYER = 'PLAYER',
  COACH = 'COACH',
  GUEST = 'GUEST',
}

/**
 * Role hierarchy for permission checking
 * Higher index = more permissions
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.GUEST]: 0,
  [UserRole.PLAYER]: 1,
  [UserRole.COACH]: 2,
  [UserRole.OWNER]: 3,
  [UserRole.ADMIN]: 4,
};

