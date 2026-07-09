# OWASP Top 10 Security Standard (2021)

**สถานะ:** ใช้งานจริง  
**อัปเดตล่าสุด:** 2026-07-09

---

## ภัยคุกคาม Web Application ที่พบบ่อยที่สุด

| # | ภัยคุกคาม | ความหมาย | การป้องกัน |
|---|-----------|----------|-----------|
| **A01** | Broken Access Control | ผู้ใช้เข้าถึงข้อมูลที่ไม่มีสิทธิ์ | ตรวจสอบสิทธิ์ทุก request, enforce ownership |
| **A02** | Cryptographic Failures | ข้อมูลสำคัญถูกเปิดเผย | HTTPS, bcrypt >= 12 rounds, ไม่เก็บ plain text |
| **A03** | Injection | SQL/NoSQL/LDAP injection | Parameterized query, escape output, validate input |
| **A04** | Insecure Design | ออกแบบไม่ปลอดภัย | Threat modeling, secure design pattern |
| **A05** | Security Misconfiguration | ตั้งค่าผิดพลาด | ปิด debug mode, minimal privilege |
| **A06** | Vulnerable Components | ใช้ library มีช่องโหว่ | npm audit, อัปเดต dependencies |
| **A07** | Auth Failures | ยืนยันตัวตนอ่อนแอ | Rate limit login, MFA, session timeout |
| **A08** | Data Integrity | ข้อมูลถูกดัดแปลง | ตรวจสอบ integrity, signed updates |
| **A09** | Logging Failures | ไม่มี logging | Log security events, monitor, alert |
| **A10** | SSRF | Server-Side Request Forgery | Validate URL, whitelist domains |

---

## Security Checklist

### A01 — Broken Access Control
- [ ] ตรวจสอบ Authorization ทุก API endpoint
- [ ] ห้ามให้ user อ่าน/แก้ไขข้อมูลของคนอื่น
- [ ] JWT token ตรวจสอบทุก request
- [ ] Role-based access: admin / engineer / staff / client

### A02 — Cryptographic Failures
- [ ] HTTPS ทั้ง production
- [ ] Password hash ด้วย bcrypt (>= 12 rounds)
- [ ] JWT secret เก็บใน .env (ไม่ hardcode)
- [ ] ไม่เก็บ password/token ใน log

### A03 — Injection
- [ ] ใช้ parameterized query ทุก query (`?` placeholder)
- [ ] ห้าม string concatenation ใน SQL
- [ ] Validate input ก่อนเข้าถึง DB
- [ ] Escape HTML output

### A04 — Insecure Design
- [ ] Threat modeling ก่อนเริ่มโปรเจกต์
- [ ] ใช้ secure design pattern
- [ ] Abuse case testing

### A05 — Security Misconfiguration
- [ ] `NODE_ENV=production` ใน production
- [ ] Helmet.js เปิดใช้งาน
- [ ] CORS กำหนด origin ชัดเจน
- [ ] Rate limiting เปิดใช้งาน
- [ ] ลบ default accounts

### A06 — Vulnerable Components
- [ ] รัน `npm audit` ทุก sprint
- [ ] อัปเดต dependencies ทุกเดือน
- [ ] ลบ package ที่ไม่ใช้แล้ว
- [ ] ใช้ lock file (package-lock.json)

### A07 — Auth Failures
- [ ] Rate limit login: 20 attempts / 15 min
- [ ] Lock account หลัง fail 5 ครั้ง
- [ ] Token expiration: accessToken 15 min, refreshToken 30 วัน
- [ ] Refresh token rotation (ใช้ครั้งเดียว)
- [ ] MFA สำหรับ admin

### A08 — Data Integrity Failures
- [ ] ตรวจสอบ file integrity
- [ ] ใช้ signed updates
- [ ] Validate serialized data

### A09 — Logging Failures
- [ ] Log security events (login, logout, failed auth)
- [ ] Monitor suspicious activity
- [ ] Alert on anomalies

### A10 — SSRF
- [ ] Validate URL input
- [ ] Whitelist allowed domains
- [ ] Block internal IP ranges

---

## OWASP Audit Template

```
วันที่ตรวจสอบ: _______________
ผู้ตรวจสอบ: _______________
เวอร์ชันแอป: _______________

A01 Broken Access Control     [ ] Pass  [ ] Fail  [ ] N/A
A02 Cryptographic Failures    [ ] Pass  [ ] Fail  [ ] N/A
A03 Injection                 [ ] Pass  [ ] Fail  [ ] N/A
A04 Insecure Design           [ ] Pass  [ ] Fail  [ ] N/A
A05 Security Misconfiguration [ ] Pass  [ ] Fail  [ ] N/A
A06 Vulnerable Components     [ ] Pass  [ ] Fail  [ ] N/A
A07 Auth Failures             [ ] Pass  [ ] Fail  [ ] N/A
A08 Data Integrity Failures   [ ] Pass  [ ] Fail  [ ] N/A
A09 Logging Failures          [ ] Pass  [ ] Fail  [ ] N/A
A10 SSRF                      [ ] Pass  [ ] Fail  [ ] N/A

หมายเหตุ: _______________
```
