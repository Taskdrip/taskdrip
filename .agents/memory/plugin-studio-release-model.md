---
name: Plugin Studio release model
description: Product packaging and release expectations for WordPress plugins created in Taskdrip.
---

Taskdrip Plugin Studio releases two separate editions: a useful free core intended for WordPress.org and a paid premium add-on sold through Taskdrip. Keep the paid edition out of the directory package. Admins review both packages and test them on a staging WordPress site before release. WordPress.org submission and approval remain manual and external.

**Why:** the user selected the free-core-plus-paid-add-on model; Taskdrip must not imply that a generated ZIP is automatically reviewed or approved by WordPress.org.

**How to apply:** preserve separate installable core and add-on ZIPs, require the core before the premium extension, and keep generated releases in draft until an admin has reviewed and tested them.
