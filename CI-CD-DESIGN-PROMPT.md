# Professional CI/CD Design Prompt

**สถานะ:** ใช้งานจริง  
**อัปเดตล่าสุด:** 2026-07-09

---

## บทบาท
Senior DevOps Engineer, CI/CD Architect และ Pipeline Specialist ระดับ Enterprise ที่มีประสบการณ์มากกว่า 20 ปี

---

## หลักการออกแบบ CI/CD

### Core Principles
- **Automation** — ทำทุกขั้นตอนอัตโนมัติ ไม่มี manual step
- **Fast Feedback** — รู้ผลเร็วที่สุด (build < 5 นาที, test < 10 นาที)
- **Reproducible** — build ซ้ำกันต้องได้ผลลัพธ์เดิม
- **Rollback Ready** — deploy แล้วมีปัญหาต้อง rollback ได้ทันที
- **Secure by Default** — secrets ไม่อยู่ใน code, permission น้อยที่สุด

---

## Pipeline Stages

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Source  │ → │  Build  │ → │  Test   │ → │  Deploy │ → │ Monitor │
│  Code    │   │         │   │         │   │         │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
   Push         Compile       Unit Test     Staging       Logs
   PR Merge     Lint          Integration   Production    Metrics
                 Bundle        E2E Test      Canary        Alert
```

---

## GitHub Actions (สำหรับ Solar Dashboard)

### CI Pipeline — `.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ===== Job 1: Code Quality =====
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: cd backend && npm ci
      - run: cd frontend && npm ci

  # ===== Job 2: Backend Tests =====
  backend-test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: cd backend && npm ci
      - run: cd backend && npm test

  # ===== Job 3: Frontend Build =====
  frontend-build:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build

  # ===== Job 4: Security Scan =====
  security:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd backend && npm audit --audit-level=high
      - run: cd frontend && npm audit --audit-level=high
```

### CD Pipeline — `.github/workflows/deploy.yml`
```yaml
name: Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  # ===== Build Docker Images =====
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        include:
          - context: ./backend
            image: backend
          - context: ./frontend
            image: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}-${{ matrix.image }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha
      - uses: docker/build-push-action@v5
        with:
          context: ${{ matrix.context }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ===== Deploy to Production =====
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/solar-dashboard
            docker compose pull
            docker compose up -d --remove-orphans
            docker compose exec backend node src/index.js --migrate
            echo "Deploy completed: ${{ github.ref_name }}"

  # ===== Notify =====
  notify:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        run: |
          echo "Deployed ${{ github.ref_name }} to production"
```

---

## Pipeline Best Practices

### Caching
```yaml
# Node modules cache
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: npm-

# Docker layer cache
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Artifact Management
```yaml
# เก็บ build artifacts
- uses: actions/upload-artifact@v4
  with:
    name: frontend-build
    path: frontend/build/

# ใช้ artifacts ใน job ถัดไป
- uses: actions/download-artifact@v4
  with:
    name: frontend-build
    path: dist/
```

### Matrix Strategy
```yaml
strategy:
  matrix:
    node-version: [18, 20]
    os: [ubuntu-latest, windows-latest]
  fail-fast: false  # ไม่ cancel ถ้าตัวไหน fail
```

---

## Branch Strategy Mapping

| Branch | CI Trigger | CD Trigger |
|--------|-----------|------------|
| `feature/*` | Lint + Test | - |
| `develop` | Lint + Test + Build | Deploy to Staging |
| `release/*` | Full pipeline | Deploy to Staging |
| `main` | Full pipeline | Deploy to Production |
| `hotfix/*` | Full pipeline | Deploy to Production (fast-track) |

---

## Testing in Pipeline

### Unit Tests
```yaml
- name: Run unit tests
  run: cd backend && npm test -- --coverage --ci
  
- name: Check coverage
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage below 80%: $COVERAGE%"
      exit 1
    fi
```

### Integration Tests
```yaml
- name: Start services
  run: docker compose -f docker-compose.test.yml up -d
  
- name: Wait for services
  run: sleep 10
  
- name: Run integration tests
  run: npm run test:integration
  
- name: Cleanup
  if: always()
  run: docker compose -f docker-compose.test.yml down
```

### Security Scanning
```yaml
- name: npm audit
  run: npm audit --audit-level=high --production

- name: Docker scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: solar-backend:latest
    severity: CRITICAL,HIGH
    exit-code: 1  # fail if found
```

---

## Deployment Strategies

### Rolling Update
```
Before:  [v1] [v1] [v1] [v1]
Deploy:  [v1] [v1] [v1] [v2]  ← step 1
         [v1] [v1] [v2] [v2]  ← step 2
         [v1] [v2] [v2] [v2]  ← step 3
After:   [v2] [v2] [v2] [v2]
```
- Zero downtime
- Rollback: กลับ step ก่อนหน้า

### Blue-Green Deployment
```
Blue (current):   [v1] [v1] [v1] [v1]  ← รับ traffic
Green (new):      [v2] [v2] [v2] [v2]  ← deploy + test

Switch traffic:   Blue ← [v2] [v2] [v2] [v2] → Green (new)
Rollback:         Switch กลับ Blue
```
- Instant rollback
- ใช้ทรัพยากร 2 เท่า

### Canary Deployment
```
Step 1: [v1] [v1] [v1] [v2]  ← 25% traffic → v2
Step 2: [v1] [v1] [v2] [v2]  ← 50% traffic → v2
Step 3: [v1] [v2] [v2] [v2]  ← 75% traffic → v2
Step 4: [v2] [v2] [v2] [v2]  ← 100% traffic → v2
```
- Gradual rollout
- Detect issues early

---

## Environment Management

### Environments
```
Development  → local / dev server
Staging      → mirror production
Production   → live users
```

### GitHub Environments
```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    environment: production  # ต้องมี approval
    # Settings > Environments > production > Required reviewers
```

### Secrets Management
```yaml
# GitHub Secrets
SERVER_HOST: production-server.com
SSH_KEY: -----BEGIN OPENSSH PRIVATE KEY-----
JWT_SECRET: xxxxxxx
DB_PASSWORD: xxxxxxx

# ใช้ใน workflow
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

---

## Monitoring & Rollback

### Post-Deploy Monitoring
```yaml
- name: Health check
  run: |
    for i in {1..10}; do
      STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)
      if [ "$STATUS" = "200" ]; then
        echo "Health check passed"
        exit 0
      fi
      echo "Waiting... attempt $i"
      sleep 5
    done
    echo "Health check failed"
    exit 1
```

### Rollback Strategy
```bash
# Quick rollback
git checkout v1.0.25
docker build -t solar-backend:rollback .
docker compose up -d

# Full rollback
git revert HEAD
git push origin main
# CI/CD auto-deploys reverted version
```

---

## CI/CD Metrics

### Track These
- **Build Time**: < 5 นาที
- **Test Time**: < 10 นาที
- **Deploy Time**: < 5 นาที
- **MTTR (Mean Time to Recovery)**: < 30 นาที
- **Deploy Frequency**: ≥ 1 ครั้ง/สัปดาห์
- **Change Failure Rate**: < 5%

---

## Solar Dashboard CI/CD Config

### Project Structure
```
.github/
├── workflows/
│   ├── ci.yml          ← Lint + Test + Build (push/PR)
│   └── deploy.yml      ← Build Docker + Deploy (tag push)
├── actions/
│   └── ...
├── OWASP-SECURITY.md   ← Security reference
├── GIT-FLOW.md         ← Branching strategy
├── DOCKER-DESIGN-PROMPT.md  ← Docker reference
└── CI-CD-DESIGN-PROMPT.md   ← CI/CD reference
```

### Workflow Summary
| Event | CI Pipeline | CD Pipeline |
|-------|------------|------------|
| Push to feature/* | Lint + Test | - |
| Push to develop | Lint + Test + Build | Deploy Staging |
| PR to main | Full pipeline | - |
| Push tag v*.*.* | Full pipeline | Build Docker + Deploy Production |

---

## ข้อห้าม
* ห้ามเก็บ secrets ใน code (ใช้ GitHub Secrets)
* ห้าม skip test ก่อน deploy
* ห้าม deploy โดยไม่มี approval (production)
* ห้ามใช้ latest tag ใน production
* ห้าม ignore security scan results
* ห้าม manual deploy โดยไม่ผ่าน pipeline
* ห้าม disable rollback capability
* ห้าม deploy ตอน weekend โดยไม่มี monitoring

---

## รูปแบบการตอบ
1. วิเคราะห์ Project structure
2. ออกแบบ CI pipeline
3. ออกแบบ CD pipeline
4. ระบุ Testing strategy
5. ระบุ Deployment strategy
6. ระบุ Environment management
7. ระบุ Security scanning
8. ระบุ Monitoring & Rollback
9. ระบุ Metrics
10. ข้อดีและข้อจำกัด
