# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Multi-agent workflow documentation system
- Agent task board for tracking work
- Human QA checklists for manual testing
- **STRIPE-001**: Stripe webhook handler for subscription lifecycle events (invoice.paid, invoice.payment_failed, subscription.updated, subscription.deleted)

### Changed
<!-- List changes to existing functionality -->

### Fixed
- **FIX-008**: Widget localStorage reconnect token expiry synced to 30s (matches server timeout)

### Security
- **STRIPE-001**: Webhook signature verification with `STRIPE_WEBHOOK_SECRET`

### Deprecated
<!-- List deprecated features -->

### Removed
<!-- List removed features -->

---

## [Previous Releases]

<!-- 
When releasing, move [Unreleased] items to a new version section:

## [1.0.1] - 2024-12-03

### Fixed
- FIX-001: Pool routing now always respected during reassignment
- FIX-002: RNA countdown shows accurate org timeout

### Added
- FIX-003: Handoff message shown during RNA reassignment
-->

---

## Changelog Management

**PM Agent:** After each fix is approved and merged:
1. Move the fix from [Unreleased] to appropriate section
2. Use format: `- [TICKET-ID]: [Description]`
3. Categorize correctly (Added/Changed/Fixed/etc.)

**On Release:**
1. Create new version section with date
2. Move all [Unreleased] items to it
3. Update version in package.json

