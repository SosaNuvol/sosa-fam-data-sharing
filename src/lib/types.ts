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

export interface Store {
  id: string;
  name: string;
}

export interface GroceryList {
  id: string;
  name: string;
  createdAt: string;
  archived: boolean;
  itemCount: number;
  openCount: number;
}

export interface GroceryItem {
  id: string;
  listId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  storeId: string | null;
  storeName: string | null;
  source: 'Manual' | 'LowStock';
  productId: string | null;
  isChecked: boolean;
  checkedByName: string | null;
  checkedAt: string | null;
  addedByName: string | null;
  createdAt: string;
}

export interface GroceryListDetail {
  list: GroceryList;
  items: GroceryItem[];
}
