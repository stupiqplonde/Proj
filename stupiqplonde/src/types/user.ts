export interface User{
    id: number;
    username: string;
    display_name: string;
    avatar_path: string | null;
    status: string;
    created_at: string;
}

export interface ProfileUpdate{
    displayName: string;
    status: string;
    avatarPath: string | null;
}

export interface Login {
    login: string;
    password: string;
}

export interface Registration extends Login {
    displayName: string;
}

export interface PasswordUpdate {
    currentPassword: string;
    newPassword: string;
}
