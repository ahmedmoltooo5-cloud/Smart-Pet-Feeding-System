import type { ApiUser } from "../types";
import { request } from "./api";

interface AuthResponse {
  token: string;
  user: ApiUser;
}

export function signupRequest(payload: {
  petName: string;
  petDetails: string;
  ownerPhone: string;
  password: string;
}) {
  return request<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export function loginRequest(payload: { petName: string; password: string }) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export function logoutRequest() {
  return request<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

export function getProfileRequest() {
  return request<{ user: ApiUser }>("/auth/profile");
}

export function updateProfileRequest(payload: Partial<ApiUser> & { password?: string }) {
  return request<AuthResponse>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
