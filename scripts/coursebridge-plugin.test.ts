import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildCourseBridgePaidEdition } from "../server/coursebridge-plugin";
import { buildPluginReleaseFiles } from "../server/wp-plugin-release";
import { buildPluginLicensePlans, PLUGIN_LICENSE_PLAN_OPTIONS } from "../shared/plugin-plan-utils";

const project = {
  slug: "coursebridge-learnpresswoo-connector",
  name: "CourseBridge LearnpressWOO Connector",
  version: "2.3.0",
  author: "Taskdrip",
  shortDescription: "Connect WooCommerce purchases and LearnPress courses.",
  description: "Connect WooCommerce products to LearnPress courses and manage student enrollments.",
  features: [
    "Link WooCommerce products to multiple LearnPress courses.",
    "Search course buyers and WordPress users by email.",
    "Create consent-based email campaigns using Resend or WordPress email.",
  ],
  releaseNotes: "CourseBridge LearnpressWOO Connector 2.3.0 refreshes plugin metadata.",
  seoKeywords: "LearnPress WooCommerce, WooCommerce course enrollment, WordPress email marketing",
};

test("Paid CourseBridge release maps products and exposes assigned courses", () => {
  const paid = buildCourseBridgePaidEdition(project);
  const release = buildPluginReleaseFiles(project, "paid", paid.files);
  assert.ok(Object.values(paid.files).reduce((total, file) => total + file.length, 0) <= 132_000);
  const admin = paid.files["includes/class-course-admin.php"];
  const expiry = paid.files["includes/class-course-expiry.php"];
  const audience = paid.files["includes/class-audience.php"];
  const bridge = paid.files["includes/class-bridge.php"];
  const campaigns = paid.files["includes/class-admin.php"];
  const consentAdmin = paid.files["includes/class-consent-admin.php"];
  const core = paid.files["includes/class-core.php"];
  const mailer = paid.files["includes/class-resend.php"];
  const adminCss = paid.files["assets/css/admin.css"];
  const main = paid.files[paid.mainFile];
  const licenseClient = release.files["includes/class-taskdrip-license.php"];
  const readme = release.files["readme.txt"];

  assert.ok(admin, "course assignment admin module is included");
  assert.ok(expiry, "expiry editing is packaged as a separate module");
  assert.ok(audience, "all-user contact audience is packaged");
  assert.ok(consentAdmin, "purchaser consent admin module is packaged separately");
  assert.match(main, /class-course-admin\.php/);
  assert.match(main, /class-course-expiry\.php/);
  assert.match(main, /class-consent-admin\.php/);
  assert.match(main, /\(new TDLPW_Consent_Admin\(\)\)->run\(\)/);
  assert.equal((main.match(/\(new TDLPW_Consent_Admin\(\)\)->run\(\)/g) || []).length, 1);
  assert.equal((main.match(/class-consent-admin\.php/g) || []).length, 1);
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
  assert.match(bridge, /update_meta_data\('_tdlpw_marketing_optin_at'/);
  assert.match(bridge, /_tdlpw_marketing_optin_at/);
  assert.match(bridge, /'tdlpw_email_marketing_optin_source', 'checkout'/);
  assert.match(bridge, /woocommerce_order_status_completed/);
  assert.match(bridge, /order->get_meta\('_tdlpw_marketing_optin', true\) === '1'/);
  assert.match(bridge, /Do not let an old paid order[\s\S]*?override an unsubscribe/i);
  assert.match(core, /tdlpw_email_marketing_optout_at/);
  assert.match(campaigns, /email_provider/);
  assert.match(campaigns, /TDLPW_Audience::rows\(\$filters\)/);
  assert.match(campaigns, /array_intersect\(\$selected, \$eligible_ids\)/);
  assert.match(mailer, /WordPress email \(wp_mail\)/);
  assert.match(campaigns, /Contacts & Campaigns/);
  assert.match(campaigns, /wp_editor\('', 'tdlpw_email_message'/);
  assert.match(campaigns, /quicktags' => true/);
  assert.match(campaigns, /wp_enqueue_media/);
  assert.match(campaigns, /data-tdlpw-insert-token/);
  assert.match(campaigns, /tdlpw_send_test_email/);
  assert.match(campaigns, /TDLPW_Consent_Admin::render_form\(\$filters, \$bulk_optin_count\)/);
  assert.match(campaigns, /TDLPW_Consent_Admin::render_action\(\$row\)/);
  assert.match(consentAdmin, /admin_post_tdlpw_opt_in_customer/);
  assert.match(consentAdmin, /public function opt_in_customer\(\)/);
  assert.match(consentAdmin, /check_admin_referer\('tdlpw_opt_in_customer'\)/);
  assert.match(consentAdmin, /absint\(\$row\['orders'\] \?\? 0\) > 0/);
  assert.match(consentAdmin, /form="tdlpw-optin-form"/);
  assert.match(consentAdmin, /name="bulk_mode" value="selected"/);
  assert.match(consentAdmin, /name="bulk_mode" value="all"/);
  assert.match(consentAdmin, /name="selected_ids\[\]"/);
  assert.match(consentAdmin, /array_intersect\(\$selected_ids, array_map\('absint', array_keys\(\$eligible_ids\)\)\)/);
  assert.match(consentAdmin, /TDLPW_Audience::rows\(\$filters\)/);
  assert.match(consentAdmin, /current_user_can\('manage_options'\)/);
  assert.match(consentAdmin, /including people who may have unsubscribed/);
  assert.match(campaigns, /TDLPW_Consent_Admin::render_select_action\(\$row\)/);
  assert.match(campaigns, /selected across contact pages/);
  assert.match(campaigns, /data-tdlpw-optin-select-page/);
  assert.match(consentAdmin, /'tdlpw_email_marketing_optin_source', 'admin'/);
  assert.match(consentAdmin, /purchaser was opted in to email campaigns/);
  assert.match(campaigns, /name="search"/);
  assert.match(campaigns, /Search name or email/);
  assert.match(campaigns, /name="recipient_ids\[\]"/);
  assert.match(campaigns, /opt in selected purchasers across pages or all matching purchasers at once/);
  assert.match(campaigns, /name="course"/);
  assert.match(campaigns, /Select all opted-in contacts on this page/);
  assert.match(mailer, /array_chunk\(\$emails, 100\)/);
  assert.doesNotMatch(campaigns, /Maximum 100 selected recipients per send/);
  assert.match(campaigns, /selected across contact pages/);
  assert.match(campaigns, /id="tdlpw-campaign-form"/);
  assert.match(campaigns, /window\.tinymce\.triggerSave\(\)/);
  assert.match(campaigns, /tdlpw-campaign-recipients:/);
  assert.match(campaigns, /sessionStorage\.setItem/);
  assert.match(campaigns, /sessionStorage\.removeItem/);
  assert.match(campaigns, /tdlpw-campaign-selection-summary/);
  assert.match(campaigns, /selected across contact pages/);
  assert.match(campaigns, /Next contacts/);
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
  assert.match(campaigns, /Product and course filters limit the recipients/);
  assert.match(mailer, /wp_mail\(/);
  assert.match(mailer, /api\.resend\.com\/emails\/batch/);
  assert.match(mailer, /api\.resend\.com\/emails'/);
  assert.match(mailer, /public static function send_test_email/);
  assert.match(mailer, /\{\{first_name\}\}/);
  assert.match(mailer, /\{\{unsubscribe_url\}\}/);
  assert.match(mailer, /tdlpw_email_marketing_optin/);
  assert.match(mailer, /List-Unsubscribe/);
  assert.match(campaigns, /Settings saved\. Resend is now selected/);
  assert.match(campaigns, /\$settings\['email_provider'\] = 'resend'/);
  assert.match(campaigns, /admin_post_tdlpw_send_test_email/);
  assert.match(licenseClient, /upgrader_pre_download/);
  assert.match(licenseClient, /public static function fresh_update_package/);
  assert.match(licenseClient, /self::get_update\( true \)/);
  assert.match(licenseClient, /public static function clear_update_state/);
  assert.match(licenseClient, /delete_site_transient\( 'update_plugins' \)/);
  assert.match(licenseClient, /version_compare\( sanitize_text_field\( \$update\['version'\] \), self::\$version, '<=' \)/);
  assert.match(licenseClient, /unset\( \$transient->response\[self::\$plugin_file\]/);
  assert.match(licenseClient, /'features' => wpautop/);
  assert.match(licenseClient, /'installation' => wpautop/);
  assert.match(readme, /= 2\.3\.0 =/);
  assert.match(readme, /optional checkout checkbox records marketing consent.*only after successful payment/i);
  assert.match(readme, /Tags:.*learnpress-woocommerce/i);
  assert.match(readme, /== Changelog ==/);
  assert.match(readme, /HTML editor/);
  assert.match(readme, /administrator opt-in/i);
  assert.ok(adminCss.includes(".tdlpw-subscription"), "campaign subscription display is styled");
  const bannerData = campaigns.match(/src="data:image\/svg\+xml;base64,([^"]+)"/);
  assert.ok(bannerData, "campaign header artwork is embedded in the generated admin page");
  assert.match(Buffer.from(bannerData[1], "base64").toString("utf8"), /Course updates, delivered\./);

  const studio = readFileSync(new URL("../server/plugin-studio.ts", import.meta.url), "utf8");
  assert.match(studio, /version: "2\.3\.0"/);
  assert.match(studio, /releaseNotes:.*CourseBridge LearnpressWOO Connector 2\.3\.0/s);
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
  assert.match(release.files[`${project.slug}.php`], /Plugin Name:\s*CourseBridge LearnpressWOO Connector/);
  assert.match(release.files["readme.txt"], /^=== CourseBridge LearnpressWOO Connector ===/);
});

test("Plugin Studio exposes prices for monthly, yearly, and lifetime licenses", () => {
  assert.deepEqual(
    PLUGIN_LICENSE_PLAN_OPTIONS.map(({ cadence }) => cadence),
    ["monthly", "yearly", "lifetime"],
  );
  assert.deepEqual(
    buildPluginLicensePlans(["monthly", "yearly", "lifetime"], {
      monthly: 15,
      yearly: 120,
      lifetime: 299,
    }).map(({ id, price }) => ({ id, price })),
    [
      { id: "plugin-monthly", price: 15 },
      { id: "plugin-yearly", price: 120 },
      { id: "plugin-lifetime", price: 299 },
    ],
  );
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
