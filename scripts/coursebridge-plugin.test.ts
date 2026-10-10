import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildCourseBridgePaidEdition } from "../server/coursebridge-plugin";
import { buildPluginReleaseFiles } from "../server/wp-plugin-release";

const project = {
  slug: "coursebridge-learnpress-woocommerce",
  name: "CourseBridge Pro for LearnPress & WooCommerce",
  version: "1.0.1",
  author: "Taskdrip",
  shortDescription: "Connect WooCommerce purchases and LearnPress courses.",
  description: "Connect WooCommerce products to LearnPress courses and manage student enrollments.",
};

test("Paid CourseBridge release maps products and exposes assigned courses", () => {
  const paid = buildCourseBridgePaidEdition(project);
  const admin = paid.files["includes/class-course-admin.php"];
  const bridge = paid.files["includes/class-bridge.php"];
  const main = paid.files[paid.mainFile];

  assert.ok(admin, "course assignment admin module is included");
  assert.match(main, /class-course-admin\.php/);
  assert.match(admin, /admin_post_tdlpw_assign_course/);
  assert.match(admin, /admin_post_tdlpw_save_product_courses/);
  assert.match(admin, /check_admin_referer\('tdlpw_save_product_courses'\)/);
  assert.match(admin, /update_post_meta\(\$product_id, '_tdlpw_course_ids', \$valid\)/);
  assert.match(admin, /check_admin_referer\('tdlpw_assign_course'\)/);
  assert.match(admin, /current_user_can\('manage_options'\)/);
  assert.match(admin, /TDLPW_Bridge::enroll_user_in_course/);
  assert.match(bridge, /learn_press_get_user/);
  assert.match(bridge, /woocommerce_account_dashboard/);
  assert.match(bridge, /Start \/ continue course/);
  assert.match(bridge, /woocommerce_checkout_registration_required/);
  assert.match(bridge, /tdlpw_sync_mapped_product/);
});

test("Paid CourseBridge ZIP contains one WordPress plugin entry", () => {
  const paid = buildCourseBridgePaidEdition(project);
  const release = buildPluginReleaseFiles(project, "paid", paid.files);
  const entries = Object.entries(release.files)
    .filter(([path, source]) => path.endsWith(".php") && /Plugin Name\s*:/i.test(source));

  assert.match(paid.files[paid.mainFile], /includes\/class-course-admin\.php/);
  assert.match(paid.files[paid.mainFile], /includes\/class-audience\.php/);
  assert.match(paid.files[paid.mainFile], /includes\/class-resend\.php/);
  assert.deepEqual(entries.map(([path]) => path), [`${project.slug}.php`]);
  assert.match(release.files[`${project.slug}.php`], /Plugin Name:\s*CourseBridge Pro for LearnPress & WooCommerce/);
});

test("Admin-issued licenses allow a null purchase in both migration paths", () => {
  const startupMigrations = readFileSync(new URL("../server/startup-migrations.ts", import.meta.url), "utf8");
  const licenseMigration = readFileSync(
    new URL("../migrations/0011_admin_plugin_licenses_nullable_purchase.sql", import.meta.url),
    "utf8",
  );
  assert.match(startupMigrations, /ALTER TABLE IF EXISTS "plugin_licenses" ALTER COLUMN "purchase_id" DROP NOT NULL/);
  assert.match(licenseMigration, /ALTER COLUMN purchase_id DROP NOT NULL/);
});
