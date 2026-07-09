# Git Flow Branching Strategy

**สถานะ:** ใช้งานจริง  
**อัปเดตล่าสุด:** 2026-07-09

---

## Branch Structure

```
main (production) ← release เท่านั้น
  ↑
  ├── release/v1.1.0 (pre-release testing)
  │     ↑
  │     ├── feature/dynamic-agencies
  │     └── fix/timeline-not-showing
  │
  └── develop (integration)
        ↑
        ├── feature/template-form-redesign
        └── fix/template-save-500-error
```

## Branch Rules

| Branch | สร้างจาก | Merge ไป | ใช้ทำอะไร |
|--------|----------|----------|----------|
| `main` | - | - | Production code เท่านั้น |
| `develop` | main | main (ผ่าน release) | Integration branch |
| `feature/*` | develop | develop | ฟีเจอร์ใหม่ |
| `fix/*` | develop | develop | แก้ไขบัค |
| `release/*` | develop | main + develop | Pre-release testing |
| `hotfix/*` | main | main + develop | แก้ไขด่วน production |

---

## Workflow

### Feature Branch
```bash
git checkout develop
git checkout -b feature/dynamic-agencies
# ... ทำงาน ...
git add .
git commit -m "feat(doc-review): เพิ่ม dynamic agencies dropdown"
git push origin feature/dynamic-agencies
# → Create Pull Request → Code Review → Merge to develop
```

### Release
```bash
git checkout develop
git checkout -b release/v1.1.0
# ... bug fix เฉพาะ release ...
git checkout main && git merge release/v1.1.0
git tag v1.1.0
git checkout develop && git merge release/v1.1.0
git branch -d release/v1.1.0
```

### Hotfix
```bash
git checkout main
git checkout -b hotfix/fix-security-vulnerability
# ... แก้ไข ...
git checkout main && git merge hotfix/fix-security-vulnerability
git tag v1.1.1
git checkout develop && git merge hotfix/fix-security-vulnerability
```

---

## Conventional Commits

```
feat:     เพิ่มฟีเจอร์ใหม่
fix:      แก้ไขบัค
docs:     แก้ไขเอกสาร
style:    แก้ไขรูปแบบโค้ด (ไม่กระทบ logic)
refactor: ปรับโครงสร้างโค้ด
test:     เพิ่ม/แก้ไข test
chore:    ปรับปรุง build/CI/CD
perf:     ปรับปรุง performance
ci:       ปรับปรุง CI/CD
```

### ตัวอย่าง Commit Message
```
feat(auth): เพิ่ม MFA support
fix(api): แก้ 500 error ตอนบันทึก template
docs: เพิ่ม OWASP checklist
perf: ลด startup time จาก 20s เหลือ 5s
chore: อัปเดต dependencies
```

---

## Pull Request Rules

1. **Branch naming:** `feature/`, `fix/`, `release/`, `hotfix/`
2. **Commit message:** ต้องเป็น Conventional Commits
3. **Code review:** ต้องมีคนอื่น review ก่อน merge
4. **CI must pass:** ทดสอบผ่านทุก test ก่อน merge
5. **No force push** บน main / develop
6. **Squash merge** สำหรับ feature branches (สะอาด)
7. **Merge commit** สำหรับ release/hotfix (เก็บประวัติ)

---

## Branch Protection Rules

### main
- [ ] ต้องมี code review อย่างน้อย 1 คน
- [ ] CI/CD ต้อง pass
- [ ] ห้าม force push
- [ ] ห้าม delete

### develop
- [ ] ต้องมี code review
- [ ] CI/CD ต้อง pass
- [ ] Feature branch ต้อง merge ผ่าน Pull Request
