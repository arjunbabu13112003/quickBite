# QuickBite Production Readiness Checklist

This document tracks all known development/testing shortcuts and the specific changes required before QuickBite is deployed to production.

---

## 1. Push Notifications (EAS & Expo)
- [ ] **Persistent Background Receipt Checker**:
  - **Current Dev Shortcut**: Low-overhead `setTimeout` checking after 15 minutes.
  - **Production Requirement**: Replace the in-memory timer with a robust **BullMQ + Redis** background job queue. This ensures that checks survive server crashes/restarts, support task retries, and prevent memory leaks.
- [ ] **EAS Credentials & Push Certificates**:
  - Configure production Apple Push Notification service (APNs) credentials (`.p8` file or certificates) inside EAS.
  - Configure Firebase Cloud Messaging (FCM) server keys/JSON credentials for production Android delivery.
- [ ] **EAS Project ID Lock**:
  - Hardcode the production EAS `projectId` in `app.json` for Customer Mobile and Delivery Partner apps, removing dynamic fallback checks.

## 2. Location Tracking (Production Optimization)
- [ ] **OSRM Routing Hosting**:
  - Migrate from public/free OSRM/OpenStreetMap endpoints to a private, auto-scaling self-hosted OSRM router or premium mapping API (e.g., Google Maps / Mapbox) to ensure service SLA and high availability.
- [ ] **Device Power Limits & App Store Compliance**:
  - Enable background execution permissions correctly in iOS `Info.plist` (Location updates) and Android `AndroidManifest.xml` (FOREGROUND_SERVICE_LOCATION).
  - Verify compliance with App Store/Google Play requirements for continuous background tracking (privacy policy disclosures and user permission prompts).

## 3. Database & Migrations
- [ ] **Disable Synchronize**:
  - Turn off TypeORM `synchronize: true` in NestJS backend configuration.
- [ ] **Establish Database Migrations**:
  - Run all database changes via version-controlled SQL migrations (`typeorm migration:generate`) to ensure zero-downtime, predictable updates.
- [ ] **Connection Pooling**:
  - Configure pgBouncer or NestJS database connection pooling to handle high concurrent client spikes.

## 4. API & Security Configuration
- [ ] **HTTPS & Production URL**:
  - Replace all `http://` localhost/LAN IP bindings in mobile apps with secure production domain URLs (`https://api.quickbite.com`).
- [ ] **Rate Limiting & CORS**:
  - Configure `@nestjs/throttler` (rate limiter) on public routes (especially auth, OTP verification, and location updates).
  - Tighten CORS origins in NestJS main entrypoint to only allow the official Hotel Admin dashboard domains.
- [ ] **Secrets & Env Hardening**:
  - Store all API keys, database credentials, JWT secrets, and payment tokens in a secure Vault or Environment Manager (AWS Secrets Manager, GCP Secret Manager, Vault) instead of raw `.env` files.

## 5. Payments (Razorpay Production Setup)
- [ ] **Production API Keys**:
  - Replace Razorpay test keys (`rzp_test_...`) with production live keys (`rzp_live_...`).
- [ ] **Webhook Signature Verification**:
  - Secure the backend callback endpoint by validating the SHA-256 HMAC signature sent by Razorpay to verify payload integrity and prevent spoofed payments.

## 6. Backups, Logging & Monitoring
- [ ] **Automated Backups**:
  - Schedule daily automated backups of the PostgreSQL database with point-in-time recovery (PITR) options.
- [ ] **Error Monitoring**:
  - Integrate Sentry or a similar APM tool into the NestJS backend, Customer app, and Delivery Partner app to collect crash reports.
- [ ] **Metrics & Logging**:
  - Implement Prometheus/Grafana dashboard metrics monitoring for active requests, active order volume, active delivery partners, and DB query times.
