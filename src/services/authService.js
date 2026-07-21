import api from "./api.js";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

let authModule;

async function initAuthModule() {
  if (import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
    // Mock auth for local development without Cognito
    const MOCK_USERS = [
      { email: 'doctor@bp.org', password: 'password123', name: 'Dr. João', role: 'doctor' },
      { email: 'admin@bp.org', password: 'admin123', name: 'Admin', role: 'admin' },
    ];

    const MOCK_TOKEN = 'mock-jwt-token-' + Date.now();
    const TOKEN_KEY = 'medpage.authToken';

    return {
      async login(email, password) {
        const user = MOCK_USERS.find(u => u.email === email && u.password === password);
        if (!user) throw new Error('Invalid credentials');

        const token = 'mock-jwt-token-' + Date.now();
        localStorage.setItem('medpage.authToken', token);

        return {
          id: 1,
          username: user.email,
          email: user.email,
          full_name: user.name,
          role: user.role,
          is_active: true,
        };
      },

      async getCurrentUser() {
        const token = localStorage.getItem('medpage.authToken');
        if (!token) throw new Error('No valid session');

        return {
          id: 1,
          username: 'doctor@bp.org',
          email: 'doctor@bp.org',
          full_name: 'Dr. João',
          role: 'doctor',
          is_active: true,
        };
      },

      async logout() {
        localStorage.removeItem('medpage.authToken');
      },
    };
  } else {
    // Real Cognito auth
    const { signInWithEmail, getCurrentAuthUser, signOutUser } = await import('./amplify-auth.js');

    return {
      async login(email, password) {
        const result = await signInWithEmail(email, password);
        localStorage.setItem('medpage.authToken', result.access_token);
        return result.user;
      },

      async getCurrentUser() {
        const result = await getCurrentAuthUser();
        localStorage.setItem('medpage.authToken', result.access_token);
        return result.user;
      },

      async logout() {
        await signOutUser();
        localStorage.removeItem('medpage.authToken');
      },
    };
  }
}

async function getAuthModule() {
  if (!authModule) {
    authModule = await initAuthModule();
  }
  return authModule;
}

export async function login(email, password) {
  const authModule = await getAuthModule();
  return authModule.login(email, password);
}

export async function getCurrentUser() {
  const authModule = await getAuthModule();
  return authModule.getCurrentUser();
}

export async function logout() {
  const authModule = await getAuthModule();
  return authModule.logout();
}