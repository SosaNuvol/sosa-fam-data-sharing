// Shapes returned by sosa-fam-api. Keep in step with its README endpoint table.

export type Role = 'Owner' | 'Adult' | 'Member' | 'Child';

export interface TokenResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface Membership {
  householdId: string;
  householdName: string;
  memberId: string;
  role: Role;
}

export interface Me {
  id: string;
  email: string;
  displayName: string | null;
  households: Membership[];
}

export interface Household {
  id: string;
  name: string;
  createdAt: string;
  myRole: Role;
}

export interface Member {
  id: string;
  userId: string;
  displayName: string;
  role: Role;
  joinedAt: string;
}

export interface CreatedInvite {
  id: string;
  code: string;
  role: Exclude<Role, 'Owner'>;
  expiresAt: string;
}

export const canManageMembers = (role: Role | undefined) => role === 'Owner' || role === 'Adult';
