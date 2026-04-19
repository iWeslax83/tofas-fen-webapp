export interface UserType {
  id: string;
  adSoyad: string;
  rol: string;
  email?: string;
  sinif?: string;
  sube?: string;
  childId?: string[];
}

export interface LinkedPair {
  parentId: string;
  childId: string;
  parentName: string;
  childName: string;
  childSinif?: string | undefined;
  childSube?: string | undefined;
}

export interface ConfirmAction {
  type: 'unlink';
  parentId: string;
  childId: string;
  parentName: string;
  childName: string;
}
