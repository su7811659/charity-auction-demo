const STORAGE_KEY = {
  auth: {
    token: "adminToken",
  },
  user: {
    hasViewedAISearchIntro: "hasViewedAISearchIntro",
  },
};

class SessionService {
  // Auth-related methods
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEY.auth.token);
  }

  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEY.auth.token, token);
  }

  clearToken(): void {
    localStorage.removeItem(STORAGE_KEY.auth.token);
  }

  // User-related methods
  getHasViewedAISearchIntro(): boolean {
    return localStorage.getItem(STORAGE_KEY.user.hasViewedAISearchIntro) === "true";
  }

  setHasViewedAISearchIntro(value: boolean): void {
    localStorage.setItem(STORAGE_KEY.user.hasViewedAISearchIntro, value.toString());
  }

  clearHasViewedAISearchIntro(): void {
    localStorage.removeItem(STORAGE_KEY.user.hasViewedAISearchIntro);
  }
}

const sessionService = new SessionService();
export default sessionService;
