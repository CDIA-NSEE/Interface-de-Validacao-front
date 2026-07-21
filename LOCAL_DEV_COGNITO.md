# Local Development with Cognito + Amplify

## Option 1: Use Real Cognito (Recommended)

### Prerequisites
1. Deploy IaC first (creates Cognito User Pool + Client)
2. Get the values from Terraform outputs:
   ```bash
   cd bp_ecg_validacao_iac
   terraform output cognito_user_pool_id
   terraform output cognito_user_pool_client_id
   ```

### Local `.env` Setup
```bash
# Interface-de-Validacao-front/.env.local
VITE_API_URL=http://localhost:8000
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=us-east-1
```

### Run Locally
```bash
cd Interface-de-Validacao-front
npm run dev
# Opens http://localhost:5173
```

### Important: Cognito Callback URLs
The Cognito User Pool Client needs `http://localhost:5173` in its callback URLs.

**Option A: Update via Terraform** (recommended)
```hcl
# modules/amplify/main.tf
callback_urls = ["https://${aws_amplify_app.main.default_domain}", "http://localhost:5173"]
logout_urls = ["https://${aws_amplify_app.main.default_domain}", "http://localhost:5173"]
```

**Option B: Manual AWS Console** (quick test)
1. Go to AWS Console → Cognito → User Pools → Your Pool → App integration → App client
2. Edit "Callback URLs" and "Sign out URLs"
3. Add `http://localhost:5173`

---

## Option 2: Mock Cognito (No AWS Required)

For pure local development without AWS:

### Create Mock Auth Service (`src/services/authService.mock.js`)
```javascript
// Mock for local development without Cognito
const MOCK_USERS = [
  { email: 'doctor@bp.org', password: 'password123', name: 'Dr. João', role: 'doctor' },
  { email: 'admin@bp.org', password: 'admin123', name: 'Admin', role: 'admin' },
];

const MOCK_TOKEN = 'mock-jwt-token-' + Date.now();
const TOKEN_KEY = 'medpage.authToken';

export async function login(email, password) {
  const user = MOCK_USERS.find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Invalid credentials');
  
  const token = MOCK_TOKEN;
  localStorage.setItem('medpage.authToken', token);
  
  return {
    id: 1,
    username: user.email,
    email: user.email,
    full_name: user.name,
    role: user.role,
    is_active: true,
  };
}

export async function getCurrentUser() {
  const token = localStorage.getItem('medpage.authToken');
  if (!token) throw new Error('No valid session');
  
  // Return mock user based on token
  return {
    id: 1,
    username: 'doctor@bp.org',
    email: 'doctor@bp.org',
    full_name: 'Dr. João',
    role: 'doctor',
    is_active: true,
  };
}

export async function logout() {
  localStorage.removeItem('medpage.authToken');
}
```

### Switch Between Real/Mock
```javascript
// src/services/authService.js
const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

if (USE_MOCK) {
  export { login, getCurrentUser, logout } from './authService.mock.js';
} else {
  export { login, getCurrentUser, logout } from './authService.real.js';
}
```

### Environment Toggle
```bash
# .env.local (mock)
VITE_USE_MOCK_AUTH=true

# .env.local (real Cognito)
VITE_USE_MOCK_AUTH=false
VITE_COGNITO_USER_POOL_ID=...
VITE_COGNITO_CLIENT_ID=...
```

---

## Option 3: LocalStack (Full AWS Locally)

For complete local AWS simulation:

```bash
# docker-compose.yml
version: '3.8'
services:
  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
      - "4510-4559:4510-4559"
    environment:
      - SERVICES=cognito-idp
      - DEBUG=1
    volumes:
      - "./localstack/init-cognito.sh:/etc/localstack/init/ready.d/init-cognito.sh"
```

```bash
# localstack/init-cognito.sh
#!/bin/bash
awslocal cognito-idp create-user-pool --pool-name local-test-pool
```

---

## Recommended Workflow

| Scenario | Approach |
|----------|----------|
| **Team development** | Option 1: Real Cognito (deployed via Terraform) |
| **Quick solo testing** | Option 2: Mock auth (no AWS needed) |
| **CI/CD pipeline** | Option 1 + GitHub Actions with real Cognito |
| **Offline work** | Option 2: Mock auth |

## Quick Start Commands

```bash
# 1. Deploy infra first
cd bp_ecg_validacao_iac && terraform apply -var-file=environments/staging/terraform.tfvars

# 2. Get Cognito values
terraform output cognito_user_pool_id cognito_user_pool_client_id

# 3. Configure frontend
cd ../Interface-de-Validacao-front
cp .env.example .env.local
# Edit .env.local with real values

# 4. Add localhost to Cognito callback URLs (one-time)
# AWS Console → Cognito → App Client → Edit callbacks

# 5. Run
npm run dev
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Invalid origin` | Add `http://localhost:5173` to Cognito App Client callbacks |
| `Invalid redirect_uri` | Match exact URL including port |
| `Token expired` | Amplify auto-refreshes; check clock sync |
| `CORS error` | Backend CORS must allow `http://localhost:5173` |