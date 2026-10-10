import assert from "node:assert/strict";
import test from "node:test";
import { buildCourseBridgePluginEditions } from "../server/coursebridge-plugin";
import { buildPluginReleaseFiles } from "../server/wp-plugin-release";

const project = {
  slug: "coursebridge-learnpress-woocommerce",
  name: "CourseBridge Pro for LearnPress & WooCommerce",
  version: "1.0.1",
  author: "Taskdrip",
  shortDescription: "Connect WooCommerce purchases and LearnPress courses.",
  description: "Connect WooCommerce products to LearnPress courses and manage student enrollments.",
};

test("Core release contains the secure user-to-course assignment screen", () => {
  const core = buildCourseBridgePluginEditions(project).core;
  const admin = core.files["includes/class-course-admin.php"];
  const bridge = core.files["includes/class-bridge.php"];
  const main = core.files[core.mainFile];

  assert.ok(admin, "course assignment admin module is included");
  assert.match(main, /class-course-admin\.php/);
  assert.match(admin, /admin_post_tdlpw_assign_course/);
  assert.match(admin, /check_admin_referer\('tdlpw_assign_course'\)/);
  assert.match(admin, /current_user_can\('manage_options'\)/);
  assert.match(admin, /TDLPW_Bridge::enroll_user_in_course/);
  assert.match(bridge, /learn_press_user_enroll_course/);
  assert.match(bridge, /learn_press_get_user/);
});

test("Premium release has a single WordPress plugin entry and keeps its Core dependency", () => {
  const premium = buildCourseBridgePluginEditions(project).premium;
  const sourceMain = premium.files[premium.mainFile];
  const release = buildPluginReleaseFiles(project, "premium", premium.files);
  const entries = Object.entries(release.files)
    .filter(([path, source]) => path.endsWith(".php") && /Plugin Name\s*:/i.test(source));

  assert.match(sourceMain, /require_once __DIR__ \. '\/includes\/class-audience\.php'/);
  assert.match(sourceMain, /require_once __DIR__ \. '\/includes\/class-resend\.php'/);
  assert.match(sourceMain, /require_once __DIR__ \. '\/includes\/class-admin\.php'/);
  assert.doesNotMatch(sourceMain, /require_once TDLPW_PATH/);
  assert.deepEqual(entries.map(([path]) => path), [`${project.slug}-premium.php`]);
  assert.doesNotMatch(release.files[`${project.slug}-premium-generated-main.php`], /Plugin Name\s*:/i);
  assert.match(release.files[`${project.slug}-premium.php`], /Requires Plugins:\s*coursebridge-learnpress-woocommerce/i);
});
