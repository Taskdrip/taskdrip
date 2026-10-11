---
name: Plugin Studio release model
description: Product packaging and release expectations for WordPress plugins created in Taskdrip.
---

Taskdrip Plugin Studio releases two separate editions: a useful free core intended for WordPress.org and a paid premium add-on sold through Taskdrip. Keep the paid edition out of the directory package. Admins review both packages and test them on a staging WordPress site before release. WordPress.org submission and approval remain manual and external.

**Why:** the user selected the free-core-plus-paid-add-on model; Taskdrip must not imply that a generated ZIP is automatically reviewed or approved by WordPress.org.

**How to apply:** preserve separate installable core and add-on ZIPs, require the core before the premium extension, and keep generated releases in draft until an admin has reviewed and tested them.

Every paid Plugin Studio product also needs monthly and yearly plans, Taskdrip-issued per-customer license keys, install limits and usage tracking, expiry-enforced premium feature locking, renewal reminders, update delivery, and a buyer/developer support channel. Keys may be issued after verified payment or directly granted by an administrator to an existing Taskdrip account; an admin grant is not a purchase. The current shop verifies payment proof and admin approval; do not claim automatic recurring charges unless a billing provider is configured.

**Why:** the user made licensing and subscription management a standing requirement for all paid plugins and explicitly requested direct admin key generation for any plugin. The current checkout does not charge cards automatically.

**How to apply:** require a public HTTPS license-server URL before listing a premium package or issuing WordPress-ready keys. Require the recipient to have a Taskdrip account, link the license to the plugin and shop product even when no purchase exists, and keep renewal payment on the verified-payment flow until an actual billing provider is connected.

When an internal plugin feature grows beyond the shared generated-file size limit, split the generated PHP into another included module rather than widening the limit for every plugin.

**Why:** the shared limit protects all generated plugin releases; CourseBridge can grow without weakening that release guard.

**How to apply:** keep the root bootstrap explicit, include new module files in the paid package map, and assert the include and module behavior in release tests.

CourseBridge Contacts & Campaigns should list every WordPress account and group its recorded product purchases and LearnPress enrollments. Keep marketing consent separate; only explicitly opted-in accounts may be selected or sent campaigns.

**Why:** the user selected an all-contacts audience while preserving existing consent status.

**How to apply:** include users without purchase history with empty product/course groupings, retain the opt-in status in the UI, and enforce consent again when sending.
