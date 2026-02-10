
export interface Contact {
  id: string;
  name: string;
  phone: string;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export interface AppState {
  user: UserProfile | null;
  contacts: Contact[];
  message: string;
  selectedFile: string | null;
  isLoading: boolean;
}
