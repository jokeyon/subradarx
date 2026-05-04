/** Cloud sync off — stubs keep call sites stable; restore SecureStore + KEY when API ships. */
export async function getApiToken(): Promise<null> {
  return null;
}

export async function setApiToken(_token: string | null): Promise<void> {
  // No-op
}
