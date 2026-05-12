import React, { createContext, useContext, useEffect, useState } from "react";
import type { PetProfile } from "../types";
import {
  getProfileRequest,
  loginRequest,
  logoutRequest,
  signupRequest,
} from "../services/authService";
import {
  clearStoredAuth,
  extractErrorMessage,
  readStoredAuth,
  writeStoredAuth,
} from "../services/api";
import { mapApiUserToPetProfile } from "../services/mappers";
import { connectSocket, disconnectSocket } from "../services/socket";

interface AuthActionResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentPet: PetProfile | null;
  login: (petName: string, password: string) => Promise<AuthActionResult>;
  signup: (
    petName: string,
    petDetails: string,
    ownerPhone: string,
    password: string,
  ) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistSession(token: string, pet: PetProfile, rawUser: Parameters<typeof writeStoredAuth>[0]["user"]) {
  writeStoredAuth({
    token,
    user: rawUser,
  });

  connectSocket(token);
  return pet;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPet, setCurrentPet] = useState<PetProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      const storedSession = readStoredAuth();

      if (!storedSession) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await getProfileRequest();
        const pet = mapApiUserToPetProfile(response.user);

        persistSession(storedSession.token, pet, response.user);

        if (isMounted) {
          setCurrentPet(pet);
          setIsAuthenticated(true);
        }
      } catch {
        clearStoredAuth();
        disconnectSocket();

        if (isMounted) {
          setCurrentPet(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (petName: string, password: string): Promise<AuthActionResult> => {
    try {
      const response = await loginRequest({
        petName,
        password,
      });

      const pet = mapApiUserToPetProfile(response.user);
      persistSession(response.token, pet, response.user);

      setCurrentPet(pet);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error, "Unable to login right now."),
      };
    }
  };

  const signup = async (
    petName: string,
    petDetails: string,
    ownerPhone: string,
    password: string,
  ): Promise<AuthActionResult> => {
    try {
      const response = await signupRequest({
        petName,
        petDetails,
        ownerPhone,
        password,
      });

      const pet = mapApiUserToPetProfile(response.user);
      persistSession(response.token, pet, response.user);

      setCurrentPet(pet);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error, "Unable to create your account right now."),
      };
    }
  };

  const logout = async () => {
    try {
      if (readStoredAuth()) {
        await logoutRequest();
      }
    } catch {
      // Ignore logout API errors because the client session should still be cleared.
    } finally {
      clearStoredAuth();
      disconnectSocket();
      setCurrentPet(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, currentPet, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
