export interface ResetPasswordRequest {
  email: string;
  oldPassword?: string;
  newPassword?: string;
}
