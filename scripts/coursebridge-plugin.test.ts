import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildCourseBridgePaidEdition } from "../server/coursebridge-plugin";
import { buildPluginReleaseFiles } from "../server/wp-plugin-release";

const project = {
  slug: "coursebridge-learnpress-woocommerce",
  name: "CourseBridge Pro for LearnPress & WooCommerce",
  version: "2.1.5",
  author: "Taskdrip",
  shortDescription: "Connect WooCommerce purchases and LearnPress courses.",
  description: "Connect WooCommerce products to LearnPress courses and manage student enrollments.",
};

test("Paid CourseBridge release maps products and exposes assigned courses", () => {
  const paid = buildCourseBridgePaidEdition(project);
  assert.ok(Object.values(paid.files).reduce((total, file) => total + file.length, 0) <= 132_000);
  const admin = paid.files["includes/class-course-admin.php"];
  const expiry = paid.files["includes/class-course-expiry.php"];
  const audience = paid.files["includes/class-audience.php"];
  const bridge = paid.files["includes/class-bridge.php"];
  const campaigns = paid.files["includes/class-admin.php"];
  const mailer = paid.files["includes/class-resend.php"];
  const adminCss = paid.files["assets/css/admin.css"];
  const main = paid.files[paid.mainFile];

  assert.ok(admin, "course assignment admin module is included");
  assert.ok(expiry, "expiry editing is packaged as a separate module");
  assert.ok(audience, "all-user contact audience is packaged");
  assert.match(main, /class-course-admin\.php/);
  assert.match(main, /class-course-expiry\.php/);
  assert.match(admin, /admin_post_tdlpw_assign_course/);
  assert.match(admin, /admin_post_tdlpw_update_course_expiry/);
  assert.match(admin, /admin_post_tdlpw_cancel_course_access/);
  assert.match(admin, /wp_ajax_tdlpw_search_users/);
  assert.match(admin, /search_columns.*user_login.*user_email.*display_name/s);
  assert.match(admin, /Find a user by name, username, or email/);
  assert.match(admin, /var requestId=0/);
  assert.match(admin, /Select one of the matching users/);
  assert.match(admin, /admin_post_tdlpw_save_product_courses/);
  assert.match(admin, /check_admin_referer\('tdlpw_save_product_courses'\)/);
  assert.match(admin, /update_post_meta\(\$product_id, '_tdlpw_course_ids', \$valid\)/);
  assert.match(admin, /check_admin_referer\('tdlpw_assign_course'\)/);
  assert.match(admin, /current_user_can\('manage_options'\)/);
  assert.match(admin, /TDLPW_Bridge::enroll_user_in_course/);
  assert.match(admin, /tdlpw_course_access/);
  assert.match(admin, /TDLPW_Course_Expiry::render_input/);
  assert.match(expiry, /expires_at/);
  assert.match(expiry, /getLastErrors\(\)/);
  assert.match(expiry, /new DateTimeImmutable\('today', \$timezone\)/);
  assert.match(expiry, /Leave blank for no expiry/);
  assert.match(expiry, /Update expiry/);
  assert.match(admin, /Student course access/);
  assert.match(admin, /Cancel access/);
  assert.match(admin, /tdlpw_reconcile_paid_course_orders/);
  assert.match(bridge, /learn_press_get_user/);
  assert.match(bridge, /\\LearnPress\\Models\\UserItems\\UserCourseModel/);
  assert.match(bridge, /\$course_item->save\(\)/);
  assert.match(bridge, /Some LearnPress versions expose neither UserCourseModel nor an enroll method/);
  assert.match(bridge, /SHOW COLUMNS FROM/);
  assert.match(bridge, /\$wpdb->insert\(\$table, \$values\)/);
  assert.match(bridge, /SELECT status FROM .*user_item_id/s);
  assert.match(bridge, /learn-press\/user\/course-enrolled/);
  assert.match(bridge, /'purchase', \$order->get_id\(\)/);
  assert.match(bridge, /set_course_enrollment_status/);
  assert.match(bridge, /woocommerce_account_dashboard/);
  assert.match(bridge, /Start \/ continue course/);
  assert.match(bridge, /woocommerce_checkout_registration_required/);
  assert.match(bridge, /tdlpw_sync_mapped_product/);
  assert.match(campaigns, /email_provider/);
  assert.match(campaigns, /TDLPW_Audience::rows\(\$filters\)/);
  assert.match(campaigns, /array_intersect\(\$selected, \$eligible_ids\)/);
  assert.match(campaigns, /WordPress email \(wp_mail\)/);
  assert.match(campaigns, /Contacts & Campaigns/);
  assert.match(campaigns, /wp_editor\('', 'tdlpw_email_message'/);
  assert.match(campaigns, /quicktags' => true/);
  assert.match(campaigns, /wp_enqueue_media/);
  assert.match(campaigns, /data-tdlpw-insert-token/);
  assert.match(campaigns, /tdlpw_send_test_email/);
  assert.match(campaigns, /name="search"/);
  assert.match(campaigns, /Search name or email/);
  assert.match(campaigns, /name="recipient_ids\[\]"/);
  assert.match(campaigns, /select one opted-in person or several visible contacts/);
  assert.match(campaigns, /id="tdlpw-campaign-form"/);
  assert.match(campaigns, /window\.tinymce\.triggerSave\(\)/);
  assert.match(campaigns, /Select at least one opted-in contact before sending/);
  assert.match(campaigns, /theindustryminer\.com/);
  assert.match(campaigns, /October 12, 2026 – November 12, 2026/);
  assert.match(campaigns, /\$15/);
  assert.match(campaigns, /WordPress contacts\. Search by email or name/);
  assert.match(campaigns, /\$row\['optin'\] \? '<input type="checkbox"/);
  assert.match(audience, /get_users\(array\(/);
  assert.match(audience, /'number' => \$user_batch_size/);
  assert.match(audience, /'fields' => 'all'/);
  assert.match(audience, /stripos\(\$row\['email'\], \$search\)/);
  assert.match(audience, /stripos\(\$row\['name'\], \$search\)/);
  assert.match(audience, /get_user_meta\(\$id, 'tdlpw_email_marketing_optin', true\) === '1'/);
  assert.match(mailer, /get_user_meta\(\$user_id, 'tdlpw_email_marketing_optin', true\) !== '1'/);
  assert.match(campaigns, /Product and course filters above limit the recipients/);
  assert.match(mailer, /wp_mail\(/);
  assert.match(mailer, /api\.resend\.com\/emails\/batch/);
  assert.match(mailer, /api\.resend\.com\/emails'/);
  assert.match(mailer, /public static function send_test_email/);
  assert.match(mailer, /\{\{first_name\}\}/);
  assert.match(mailer, /\{\{unsubscribe_url\}\}/);
  assert.match(mailer, /tdlpw_email_marketing_optin/);
  assert.match(mailer, /List-Unsubscribe/);
  assert.ok(adminCss.includes(".tdlpw-subscription"), "campaign subscription display is styled");
  const bannerData = campaigns.match(/src="data:image\/svg\+xml;base64,([^"]+)"/);
  assert.ok(bannerData, "campaign header artwork is embedded in the generated admin page");
  assert.match(Buffer.from(bannerData[1], "base64").toString("utf8"), /Course updates, delivered\./);

  const studio = readFileSync(new URL("../server/plugin-studio.ts", import.meta.url), "utf8");
  assert.match(studio, /version: "2\.1\.5"/);
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
