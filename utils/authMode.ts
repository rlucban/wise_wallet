import { useAuthData } from "../context/AuthContext";

const LOCAL_TOKENS = new Set(["offline_token", "local_token"]);

export function isLocalAccountToken(token: string | null): boolean {
  return token !== null && LOCAL_TOKENS.has(token);
}

export function useIsLocalAccount(): boolean {
  const { token } = useAuthData();
  return isLocalAccountToken(token);
}
