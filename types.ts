
export interface Contact {
  id: string;
  name: string;
  phone: string;
  status?: 'sent' | 'failed';
  selected?: boolean;
  sentCount: number;
  failCount: number;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  isSubscribed?: boolean;
  expiryDate?: string; // ISO String ou Timestamp string
}

export interface AppState {
  user: UserProfile | null;
  contacts: Contact[];
  message: string;
  selectedFile: string | null;
  isLoading: boolean;
}
