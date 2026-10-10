import { normalizeGeneratedEdition, type PluginEdition } from "./wp-plugin-release";
import { buildWordPressPluginFiles } from "./wp-plugin-template";

type Project = {
  slug: string;
  name: string;
  version: string;
  author: string;
  shortDescription: string;
  description: string;
};

const paidMain = (project: Project) => `<?php
/**
 * Plugin Name: ${project.name} Core
 * Description: Licensed CourseBridge plugin for WooCommerce and LearnPress course management.
 * Version: ${project.version}
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce, learnpress
 * Author: ${project.author}
 * License: GPL-2.0-or-later
 * Text Domain: ${project.slug}
 */
if (!defined('ABSPATH')) { exit; }
define('TDLPW_SINGLE_PAID_PLUGIN', true);
define('TDLPW_VERSION', '${project.version}');
define('TDLPW_FILE', __FILE__);
define('TDLPW_PATH', plugin_dir_path(__FILE__));
define('TDLPW_URL', plugin_dir_url(__FILE__));
require_once TDLPW_PATH . 'includes/class-activator.php';
require_once TDLPW_PATH . 'includes/class-bridge.php';
require_once TDLPW_PATH . 'includes/class-course-admin.php';
require_once TDLPW_PATH . 'includes/class-core.php';
require_once TDLPW_PATH . 'includes/class-audience.php';
require_once TDLPW_PATH . 'includes/class-resend.php';
require_once TDLPW_PATH . 'includes/class-admin.php';
register_activation_hook(__FILE__, array('TDLPW_Activator', 'activate'));
register_deactivation_hook(__FILE__, array('TDLPW_Activator', 'deactivate'));
add_action('plugins_loaded', function () {
    load_plugin_textdomain('${project.slug}', false, dirname(plugin_basename(__FILE__)) . '/languages');
    (new TDLPW_Core())->run();
    (new TDLPW_Admin())->run();
    add_action('init', array('TDLPW_Audience', 'schedule_backfill'));
    add_action('tdlpw_backfill_paid_orders', array('TDLPW_Audience', 'backfill_paid_orders'));
});
`;

const coreClass = `<?php
if (!defined('ABSPATH')) { exit; }
final class TDLPW_Core {
    public function run() {
        (new TDLPW_Bridge())->run();
        (new TDLPW_Course_Admin())->run();
        add_action('admin_notices', array($this, 'dependency_notice'));
        add_action('init', array($this, 'unsubscribe_route'));
        add_action('init', array($this, 'register_privacy_handlers'));
    }
    public function dependency_notice() {
        if (!current_user_can('activate_plugins')) { return; }
        $missing = array();
        if (!class_exists('WooCommerce')) { $missing[] = 'WooCommerce'; }
        if (!defined('LEARNPRESS_VERSION')) { $missing[] = 'LearnPress'; }
        if ($missing) {
            echo '<div class="notice notice-warning"><p><strong>CourseBridge</strong> requires ' . esc_html(implode(' and ', $missing)) . ' to be active.</p></div>';
        }
    }
    public function unsubscribe_route() {
        if (!isset($_GET['tdlpw_unsubscribe'])) { return; }
        $user_id = absint($_GET['tdlpw_unsubscribe']);
        $token = isset($_GET['token']) ? sanitize_text_field(wp_unslash($_GET['token'])) : '';
        $expected = hash_hmac('sha256', (string) $user_id, wp_salt('auth'));
        if (!$user_id || !$token || !hash_equals($expected, $token)) {
            wp_die(esc_html__('This unsubscribe link is invalid or expired.', 'coursebridge-learnpress-woocommerce'), '', array('response' => 400));
        }
        update_user_meta($user_id, 'tdlpw_email_marketing_optin', '0');
        wp_die(esc_html__('You have been unsubscribed from course marketing emails.', 'coursebridge-learnpress-woocommerce'), esc_html__('Email preferences updated', 'coursebridge-learnpress-woocommerce'), array('response' => 200));
    }
    public function register_privacy_handlers() {
        if (!class_exists('TDLPW_Audience')) { return; }
        add_filter('wp_privacy_personal_data_exporters', array($this, 'privacy_exporter'));
        add_filter('wp_privacy_personal_data_erasers', array($this, 'privacy_eraser'));
    }
    public function privacy_exporter($exporters) {
        $exporters['taskdrip-course-bridge'] = array(
            'exporter_friendly_name' => __('Course Bridge purchases and email preferences', 'coursebridge-learnpress-woocommerce'),
            'callback' => array($this, 'export_personal_data'),
        );
        return $exporters;
    }
    public function export_personal_data($email_address, $page = 1) {
        $user = get_user_by('email', $email_address);
        if (!$user) { return array('data' => array(), 'done' => true); }
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare(
            'SELECT order_id, product_ids, course_ids, amount, currency, order_status, purchased_at FROM ' . TDLPW_Audience::table() . ' WHERE user_id = %d ORDER BY purchased_at DESC LIMIT 100',
            absint($user->ID)
        ), ARRAY_A);
        $data = array();
        foreach ((array) $rows as $row) {
            $product_ids = (array) json_decode((string) $row['product_ids'], true);
            $course_ids = (array) json_decode((string) $row['course_ids'], true);
            $data[] = array(
                array('name' => __('Order', 'coursebridge-learnpress-woocommerce'), 'value' => absint($row['order_id'])),
                array('name' => __('Products', 'coursebridge-learnpress-woocommerce'), 'value' => implode(', ', array_filter(array_map('get_the_title', $product_ids)))),
                array('name' => __('Courses', 'coursebridge-learnpress-woocommerce'), 'value' => implode(', ', array_filter(array_map('get_the_title', $course_ids)))),
                array('name' => __('Amount / currency', 'coursebridge-learnpress-woocommerce'), 'value' => sanitize_text_field($row['amount'] . ' ' . $row['currency'])),
                array('name' => __('Order status', 'coursebridge-learnpress-woocommerce'), 'value' => sanitize_key($row['order_status'])),
                array('name' => __('Purchase date', 'coursebridge-learnpress-woocommerce'), 'value' => sanitize_text_field($row['purchased_at'])),
            );
        }
        $data[] = array(array(
            'name' => __('Course marketing email consent', 'coursebridge-learnpress-woocommerce'),
            'value' => get_user_meta($user->ID, 'tdlpw_email_marketing_optin', true) === '1' ? __('Opted in', 'coursebridge-learnpress-woocommerce') : __('Not opted in', 'coursebridge-learnpress-woocommerce'),
        ));
        return array('data' => $data, 'done' => true);
    }
    public function privacy_eraser($erasers) {
        $erasers['taskdrip-course-bridge'] = array(
            'eraser_friendly_name' => __('Course Bridge email preferences', 'coursebridge-learnpress-woocommerce'),
            'callback' => array($this, 'erase_personal_data'),
        );
        return $erasers;
    }
    public function erase_personal_data($email_address, $page = 1) {
        $user = get_user_by('email', $email_address);
        if (!$user) { return array('items_removed' => false, 'items_retained' => false, 'messages' => array(), 'done' => true); }
        global $wpdb;
        $wpdb->query($wpdb->prepare(
            'UPDATE ' . TDLPW_Audience::table() . ' SET user_id = NULL, customer_email = CONCAT("anonymized-", order_id, "@example.invalid") WHERE user_id = %d',
            absint($user->ID)
        ));
        $wpdb->delete($wpdb->prefix . 'tdlpw_campaign_log', array('email' => $email_address), array('%s'));
        delete_user_meta($user->ID, 'tdlpw_email_marketing_optin');
        delete_user_meta($user->ID, 'tdlpw_email_marketing_optin_at');
        return array('items_removed' => true, 'items_retained' => true, 'messages' => array(__('Purchase totals and order references are retained in anonymized form; email preferences and logs were removed.', 'coursebridge-learnpress-woocommerce')), 'done' => true);
    }
}
`;

const courseAdmin = (project: Project) => `<?php
if (!defined('ABSPATH')) { exit; }

final class TDLPW_Course_Admin {
    public function run() {
        self::ensure_access_table();
        add_action('admin_menu', array($this, 'menu'), 20);
        add_action('admin_post_tdlpw_assign_course', array($this, 'assign_course'));
        add_action('admin_post_tdlpw_cancel_course_access', array($this, 'cancel_course_access'));
        add_action('admin_post_tdlpw_save_product_courses', array($this, 'save_product_courses'));
        add_action('wp_ajax_tdlpw_search_users', array($this, 'search_users'));
        add_action('tdlpw_reconcile_paid_course_orders', array($this, 'reconcile_paid_orders'), 10, 1);
        add_action('init', array($this, 'expire_course_access'));
        self::schedule_paid_order_reconciliation();
    }

    public static function access_table() {
        global $wpdb;
        return $wpdb->prefix . 'tdlpw_course_access';
    }

    public static function ensure_access_table() {
        global $wpdb;
        $version = defined('TDLPW_VERSION') ? TDLPW_VERSION : '1.0.0';
        if (get_option('tdlpw_course_access_schema') === $version) { return; }
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $table = self::access_table();
        $charset = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE " . $table . " (
            access_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            course_id bigint(20) unsigned NOT NULL,
            source varchar(20) NOT NULL DEFAULT 'admin',
            source_id bigint(20) unsigned NOT NULL DEFAULT 0,
            starts_at datetime NOT NULL,
            expires_at datetime NULL,
            status varchar(20) NOT NULL DEFAULT 'active',
            assigned_by bigint(20) unsigned NOT NULL DEFAULT 0,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY  (access_id),
            UNIQUE KEY grant_identity (user_id,course_id,source,source_id),
            KEY user_id (user_id),
            KEY course_id (course_id),
            KEY status_expiry (status,expires_at)
        ) " . $charset . ";";
        dbDelta($sql);
        update_option('tdlpw_course_access_schema', $version, false);
    }

    private static function schedule_paid_order_reconciliation() {
        if (!function_exists('wc_get_orders')) { return; }
        $version = defined('TDLPW_VERSION') ? TDLPW_VERSION : '1.0.0';
        if (get_option('tdlpw_course_reconcile_version') === $version) { return; }
        $pending = get_option('tdlpw_course_reconcile_pending');
        $page = max(1, absint(get_option('tdlpw_course_reconcile_page', 1)));
        if ($pending !== $version) {
            update_option('tdlpw_course_reconcile_pending', $version, false);
            update_option('tdlpw_course_reconcile_page', 1, false);
            $page = 1;
        }
        if (!wp_next_scheduled('tdlpw_reconcile_paid_course_orders', array($page))) {
            wp_schedule_single_event(time() + 15, 'tdlpw_reconcile_paid_course_orders', array($page));
        }
    }

    public function reconcile_paid_orders($page = 1) {
        if (!function_exists('wc_get_orders')) { return; }
        $page = max(1, absint($page));
        $result = wc_get_orders(array(
            'status' => array('wc-processing', 'wc-completed'),
            'limit' => 100,
            'page' => $page,
            'paginate' => true,
            'orderby' => 'date',
            'order' => 'ASC',
            'return' => 'objects',
        ));
        foreach ((array) ($result->orders ?? array()) as $order) {
            (new TDLPW_Bridge())->sync_paid_order($order->get_id());
        }
        $max_pages = absint($result->max_num_pages ?? 0);
        if ($page < $max_pages) {
            $next_page = $page + 1;
            update_option('tdlpw_course_reconcile_page', $next_page, false);
            if (!wp_next_scheduled('tdlpw_reconcile_paid_course_orders', array($next_page))) {
                wp_schedule_single_event(time() + 20, 'tdlpw_reconcile_paid_course_orders', array($next_page));
            }
            return;
        }
        $version = defined('TDLPW_VERSION') ? TDLPW_VERSION : '1.0.0';
        update_option('tdlpw_course_reconcile_version', $version, false);
        delete_option('tdlpw_course_reconcile_pending');
        delete_option('tdlpw_course_reconcile_page');
    }

    public static function record_access($user_id, $course_id, $source = 'purchase', $source_id = 0, $expires_at = null, $starts_at = null) {
        global $wpdb;
        self::ensure_access_table();
        $now = current_time('mysql', true);
        $source = in_array($source, array('admin', 'purchase'), true) ? $source : 'purchase';
        $wpdb->replace(self::access_table(), array(
            'user_id' => absint($user_id),
            'course_id' => absint($course_id),
            'source' => $source,
            'source_id' => absint($source_id),
            'starts_at' => $starts_at ?: $now,
            'expires_at' => $expires_at ?: null,
            'status' => 'active',
            'assigned_by' => $source === 'admin' ? get_current_user_id() : 0,
            'created_at' => $now,
            'updated_at' => $now,
        ), array('%d', '%d', '%s', '%d', '%s', '%s', '%s', '%d', '%s', '%s'));
        if ($wpdb->last_error) {
            return new WP_Error('tdlpw_access_record_failed', __('The course was enrolled, but its access period could not be saved.', '${project.slug}'));
        }
        return true;
    }

    private static function active_access_exists($user_id, $course_id) {
        global $wpdb;
        $table = self::access_table();
        return (bool) $wpdb->get_var($wpdb->prepare(
            "SELECT access_id FROM " . $table . " WHERE user_id = %d AND course_id = %d AND status = 'active' AND (expires_at IS NULL OR expires_at > %s) LIMIT 1",
            absint($user_id),
            absint($course_id),
            current_time('mysql', true)
        ));
    }

    public static function revoke_course_access($user_id, $course_id) {
        global $wpdb;
        self::ensure_access_table();
        $now = current_time('mysql', true);
        $wpdb->update(self::access_table(), array(
            'status' => 'cancelled',
            'updated_at' => $now,
        ), array(
            'user_id' => absint($user_id),
            'course_id' => absint($course_id),
            'status' => 'active',
        ), array('%s', '%s'), array('%d', '%d', '%s'));
        return TDLPW_Bridge::set_course_enrollment_status($user_id, $course_id, 'cancel');
    }

    public function expire_course_access() {
        global $wpdb;
        $table = self::access_table();
        $now = current_time('mysql', true);
        $expired = $wpdb->get_results($wpdb->prepare(
            "SELECT DISTINCT user_id, course_id FROM " . $table . " WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= %s",
            $now
        ));
        if (!$expired) { return; }
        $wpdb->query($wpdb->prepare(
            "UPDATE " . $table . " SET status = 'expired', updated_at = %s WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= %s",
            $now,
            $now
        ));
        foreach ($expired as $row) {
            if (!self::active_access_exists($row->user_id, $row->course_id)) {
                TDLPW_Bridge::set_course_enrollment_status($row->user_id, $row->course_id, 'cancel');
            }
        }
    }

    public function cancel_course_access() {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('Access denied.', '${project.slug}'), '', array('response' => 403));
        }
        $user_id = absint(wp_unslash($_POST['user_id'] ?? 0));
        $course_id = absint(wp_unslash($_POST['course_id'] ?? 0));
        check_admin_referer('tdlpw_cancel_course_access_' . $user_id . '_' . $course_id);
        $result = ($user_id && get_user_by('id', $user_id) && get_post_type($course_id) === 'lp_course')
            ? self::revoke_course_access($user_id, $course_id)
            : new WP_Error('tdlpw_invalid_assignment', __('Choose a valid WordPress user and LearnPress course.', '${project.slug}'));
        $args = array(
            'page' => 'tdlpw-course-assignments',
            'notice' => is_wp_error($result) ? 'failed' : 'cancelled',
        );
        if (is_wp_error($result)) { $args['detail'] = $result->get_error_message(); }
        wp_safe_redirect(add_query_arg($args, admin_url('admin.php')));
        exit;
    }

    public function search_users() {
        check_ajax_referer('tdlpw_search_users', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Access denied.', '${project.slug}')), 403);
        }
        $search = sanitize_text_field(wp_unslash($_GET['term'] ?? ''));
        $args = array(
            'number' => 20,
            'orderby' => 'display_name',
            'order' => 'ASC',
            'fields' => array('ID', 'display_name', 'user_login', 'user_email'),
        );
        if ($search !== '') {
            $args['search'] = '*' . $search . '*';
            $args['search_columns'] = array('user_login', 'user_email', 'display_name');
        }
        $results = array();
        foreach (get_users($args) as $user) {
            $results[] = array(
                'id' => absint($user->ID),
                'label' => sanitize_text_field($user->display_name . ' (' . $user->user_login . ' · ' . $user->user_email . ')'),
            );
        }
        wp_send_json_success($results);
    }

    private function enrolled_users() {
        global $wpdb;
        $table = $wpdb->prefix . 'learnpress_user_items';
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table)));
        if ($exists !== $table) { return array(); }
        $access = self::access_table();
        return $wpdb->get_results(
            "SELECT item.user_id, item.item_id AS course_id, item.status AS lp_status, item.start_time AS lp_start_time,
                user.display_name, user.user_login, user.user_email, course.post_title,
                admin_access.starts_at AS access_start, admin_access.expires_at AS access_expiry,
                admin_access.status AS admin_access_status,
                purchase_access.access_status AS purchase_access_status
             FROM " . $table . " item
             INNER JOIN (
                SELECT MAX(user_item_id) AS user_item_id
                FROM " . $table . "
                WHERE item_type = 'lp_course'
                GROUP BY user_id, item_id
             ) latest ON latest.user_item_id = item.user_item_id
             INNER JOIN " . $wpdb->users . " user ON user.ID = item.user_id
             INNER JOIN " . $wpdb->posts . " course ON course.ID = item.item_id AND course.post_type = 'lp_course'
             LEFT JOIN " . $access . " admin_access ON admin_access.user_id = item.user_id AND admin_access.course_id = item.item_id AND admin_access.source = 'admin' AND admin_access.source_id = 0
             LEFT JOIN (
                SELECT user_id, course_id, MAX(status) AS access_status
                FROM " . $access . "
                WHERE source = 'purchase' AND status = 'active'
                GROUP BY user_id, course_id
             ) purchase_access ON purchase_access.user_id = item.user_id AND purchase_access.course_id = item.item_id
             WHERE item.item_type = 'lp_course'
             ORDER BY item.start_time DESC
             LIMIT 500",
            ARRAY_A
        );
    }

    public function menu() {
        add_submenu_page(
            'tdlpw-dashboard',
            esc_html__('Course Assignments', '${project.slug}'),
            esc_html__('Course Assignments', '${project.slug}'),
            'manage_options',
            'tdlpw-course-assignments',
            array($this, 'render'),
            'dashicons-welcome-learn-more',
            58
        );
    }

    public function assign_course() {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('Access denied.', '${project.slug}'), '', array('response' => 403));
        }
        check_admin_referer('tdlpw_assign_course');

        $user_id = absint(wp_unslash($_POST['user_id'] ?? 0));
        $course_id = absint(wp_unslash($_POST['course_id'] ?? 0));
        $search = sanitize_text_field(wp_unslash($_POST['user_search'] ?? ''));
        $expires_on = sanitize_text_field(wp_unslash($_POST['expires_on'] ?? ''));
        $user = $user_id ? get_user_by('id', $user_id) : false;
        $expires_at = $this->expiry_from_input($expires_on);
        if (is_wp_error($expires_at)) {
            $result = $expires_at;
        } elseif (!$user || !$course_id || get_post_type($course_id) !== 'lp_course') {
            $result = new WP_Error('tdlpw_invalid_assignment', __('Choose a valid WordPress user and LearnPress course.', '${project.slug}'));
        } else {
            $result = TDLPW_Bridge::enroll_user_in_course($user_id, $course_id, 'admin', 0, $expires_at);
        }

        $args = array(
            'page' => 'tdlpw-course-assignments',
            'notice' => is_wp_error($result) ? 'failed' : 'enrolled',
        );
        if ($search !== '') { $args['user_search'] = $search; }
        if (is_wp_error($result)) { $args['detail'] = $result->get_error_message(); }
        wp_safe_redirect(add_query_arg($args, admin_url('admin.php')));
        exit;
    }

    private function expiry_from_input($value) {
        if ($value === '') { return null; }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return new WP_Error('tdlpw_invalid_expiry', __('Enter a valid course access expiry date.', '${project.slug}'));
        }
        $timezone = function_exists('wp_timezone') ? wp_timezone() : new DateTimeZone('UTC');
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, $timezone);
        if (!$date || $date->format('Y-m-d') !== $value) {
            return new WP_Error('tdlpw_invalid_expiry', __('Enter a valid course access expiry date.', '${project.slug}'));
        }
        $expiry = $date->setTime(23, 59, 59);
        if ($expiry->getTimestamp() <= time()) {
            return new WP_Error('tdlpw_invalid_expiry', __('The expiry date must be today or later.', '${project.slug}'));
        }
        return gmdate('Y-m-d H:i:s', $expiry->getTimestamp());
    }

    private function courses() {
        return get_posts(array(
            'post_type' => 'lp_course',
            'post_status' => array('publish', 'private'),
            'numberposts' => 500,
            'orderby' => 'title',
            'order' => 'ASC',
        ));
    }

    private function products() {
        return function_exists('wc_get_products') ? wc_get_products(array(
            'limit' => 500,
            'status' => 'publish',
            'orderby' => 'name',
            'order' => 'ASC',
        )) : array();
    }

    public function save_product_courses() {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(esc_html__('Access denied.', '${project.slug}'), '', array('response' => 403));
        }
        check_admin_referer('tdlpw_save_product_courses');
        $product_id = absint(wp_unslash($_POST['product_id'] ?? 0));
        $product = function_exists('wc_get_product') ? wc_get_product($product_id) : false;
        if (!$product || !current_user_can('edit_product', $product_id)) {
            wp_die(esc_html__('Choose a WooCommerce product you are allowed to edit.', '${project.slug}'), '', array('response' => 400));
        }
        $ids = array_map('absint', (array) wp_unslash($_POST['course_ids'] ?? array()));
        $valid = array();
        foreach (array_unique($ids) as $course_id) {
            if (get_post_type($course_id) === 'lp_course' && in_array(get_post_status($course_id), array('publish', 'private'), true)) {
                $valid[] = $course_id;
            }
        }
        update_post_meta($product_id, '_tdlpw_course_ids', $valid);
        if (!wp_next_scheduled('tdlpw_sync_mapped_product', array($product_id, 1))) {
            wp_schedule_single_event(time() + 10, 'tdlpw_sync_mapped_product', array($product_id, 1));
        }
        wp_safe_redirect(add_query_arg(array(
            'page' => 'tdlpw-course-assignments',
            'edit_product' => $product_id,
            'mapping_notice' => 'saved',
        ), admin_url('admin.php')) . '#tdlpw-map-product');
        exit;
    }

    private function render_product_mapping($courses, $products, $selected_product_id) {
        $selected_courses = $selected_product_id
            ? array_map('absint', (array) get_post_meta($selected_product_id, '_tdlpw_course_ids', true))
            : array();
        echo '<section id="tdlpw-map-product" style="max-width:900px;margin:20px 0;padding:20px;background:#fff;border:1px solid #dcdcde">';
        echo '<h2>' . esc_html__('Link WooCommerce products to LearnPress courses', '${project.slug}') . '</h2>';
        echo '<p>' . esc_html__('Choose a product and one or more courses. After a confirmed payment, the buyer is enrolled; existing paid orders for this product are also reconciled.', '${project.slug}') . '</p>';
        if (!class_exists('WooCommerce')) {
            echo '<p class="notice notice-warning inline">' . esc_html__('Activate WooCommerce to map products to courses.', '${project.slug}') . '</p></section>';
            return;
        }
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        echo '<input type="hidden" name="action" value="tdlpw_save_product_courses">';
        wp_nonce_field('tdlpw_save_product_courses');
        echo '<p><label for="tdlpw-map-product"><strong>' . esc_html__('WooCommerce product', '${project.slug}') . '</strong></label><br>';
        echo '<select id="tdlpw-map-product" name="product_id" required style="min-width:360px;max-width:100%">';
        echo '<option value="">' . esc_html__('Select a product', '${project.slug}') . '</option>';
        foreach ($products as $product) {
            echo '<option value="' . esc_attr((string) $product->get_id()) . '" ' .
                selected((int) $selected_product_id, (int) $product->get_id(), false) . '>' .
                esc_html($product->get_name()) . '</option>';
        }
        echo '</select></p><p><label for="tdlpw-map-courses"><strong>' .
            esc_html__('LearnPress courses', '${project.slug}') . '</strong></label><br>';
        echo '<select id="tdlpw-map-courses" name="course_ids[]" multiple required size="8" style="min-width:360px;max-width:100%">';
        foreach ($courses as $course) {
            echo '<option value="' . esc_attr((string) $course->ID) . '" ' .
                selected(in_array((int) $course->ID, $selected_courses, true), true, false) . '>' .
                esc_html($course->post_title) . '</option>';
        }
        echo '</select><br><span class="description">' . esc_html__('Use Ctrl (Windows) or Command (Mac) to select multiple courses.', '${project.slug}') . '</span></p>';
        echo '<p><button type="submit" class="button button-primary" ' . ((!$products || !$courses) ? 'disabled' : '') . '>' .
            esc_html__('Save course mapping', '${project.slug}') . '</button></p></form></section>';
    }

    public function render() {
        if (!current_user_can('manage_options')) { return; }

        $search = sanitize_text_field(wp_unslash($_GET['user_search'] ?? ''));
        $notice = sanitize_key(wp_unslash($_GET['notice'] ?? ''));
        $mapping_notice = sanitize_key(wp_unslash($_GET['mapping_notice'] ?? ''));
        $edit_product = absint(wp_unslash($_GET['edit_product'] ?? 0));
        echo '<div class="wrap"><h1>' . esc_html__('Assign LearnPress Courses', '${project.slug}') . '</h1>';
        echo '<p>' . esc_html__('Choose a WordPress user and course to enroll them directly. This does not create or change a WooCommerce order.', '${project.slug}') . '</p>';
        if ($mapping_notice === 'saved') {
            echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('The product-to-course mapping was saved. Confirmed orders will be enrolled, and existing paid orders are being checked.', '${project.slug}') . '</p></div>';
        }
        if ($notice === 'enrolled') {
            echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('The user was enrolled in the selected course.', '${project.slug}') . '</p></div>';
        } elseif ($notice === 'failed') {
            $detail = sanitize_text_field(wp_unslash($_GET['detail'] ?? ''));
            echo '<div class="notice notice-error is-dismissible"><p>' .
                esc_html($detail ?: __('The course assignment could not be completed.', '${project.slug}')) . '</p></div>';
        }

        if (!defined('LEARNPRESS_VERSION')) {
            echo '<div class="notice notice-warning"><p>' . esc_html__('Activate LearnPress to assign users to courses.', '${project.slug}') . '</p></div>';
        }

        $courses = $this->courses();
        $products = $this->products();
        $this->render_product_mapping($courses, $products, $edit_product);

        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" style="max-width:760px;background:#fff;border:1px solid #dcdcde;padding:20px">';
        echo '<input type="hidden" name="action" value="tdlpw_assign_course">';
        echo '<input type="hidden" id="tdlpw-user-search-value" name="user_search" value="' . esc_attr($search) . '">';
        wp_nonce_field('tdlpw_assign_course');
        echo '<p><label for="tdlpw-user-search"><strong>' . esc_html__('Find a user by name, username, or email', '${project.slug}') . '</strong></label><br>';
        echo '<input type="search" id="tdlpw-user-search" value="' . esc_attr($search) . '" class="regular-text" autocomplete="off" placeholder="' . esc_attr__('Start typing a name, username, or email', '${project.slug}') . '"></p>';
        echo '<p><label for="tdlpw-user"><strong>' . esc_html__('WordPress user', '${project.slug}') . '</strong></label><br>';
        echo '<select id="tdlpw-user" name="user_id" required size="5" style="min-width:360px;max-width:100%"><option value="">' . esc_html__('Search for and select a user', '${project.slug}') . '</option></select>';
        echo '<span id="tdlpw-user-search-status" class="description" aria-live="polite"></span></p>';
        echo '<p><label for="tdlpw-course"><strong>' . esc_html__('LearnPress course', '${project.slug}') . '</strong></label><br>';
        echo '<select id="tdlpw-course" name="course_id" required style="min-width:360px;max-width:100%">';
        echo '<option value="">' . esc_html__('Select a course', '${project.slug}') . '</option>';
        foreach ($courses as $course) {
            echo '<option value="' . esc_attr((string) $course->ID) . '">' . esc_html($course->post_title) . '</option>';
        }
        echo '</select></p>';
        echo '<p><label for="tdlpw-expires-on"><strong>' . esc_html__('Access expires on (optional)', '${project.slug}') . '</strong></label><br>';
        echo '<input type="date" id="tdlpw-expires-on" name="expires_on" min="' . esc_attr(wp_date('Y-m-d')) . '"> ';
        echo '<span class="description">' . esc_html__('Leave blank for access with no CourseBridge expiry.', '${project.slug}') . '</span></p>';
        if (!$courses) {
            echo '<p class="notice notice-warning inline">' . esc_html__('No published or private LearnPress courses were found.', '${project.slug}') . '</p>';
        }
        echo '<p><button type="submit" class="button button-primary" ' . (!$courses ? 'disabled' : '') . '>' .
            esc_html__('Assign course', '${project.slug}') . '</button></p></form>';
        echo '<script>(function(){'
            . 'var input=document.getElementById("tdlpw-user-search");var select=document.getElementById("tdlpw-user");var hidden=document.getElementById("tdlpw-user-search-value");var status=document.getElementById("tdlpw-user-search-status");'
            . 'var ajaxUrl=' . wp_json_encode(admin_url('admin-ajax.php')) . ';var nonce=' . wp_json_encode(wp_create_nonce('tdlpw_search_users')) . ';var timer=null;'
            . 'function searchUsers(){hidden.value=input.value;var params=new URLSearchParams({action:"tdlpw_search_users",term:input.value.trim(),nonce:nonce});'
            . 'fetch(ajaxUrl+"?"+params.toString(),{credentials:"same-origin"}).then(function(response){return response.json();}).then(function(result){'
            . 'select.options.length=0;if(!result.success){select.add(new Option("' . esc_js(__('Could not search users. Please try again.', '${project.slug}')) . '",""));status.textContent="";return;}'
            . 'select.add(new Option(result.data.length?"' . esc_js(__('Select a user', '${project.slug}')) . '":"' . esc_js(__('No matching users found.', '${project.slug}')) . '",""));'
            . 'result.data.forEach(function(user){select.add(new Option(user.label,user.id));});status.textContent=result.data.length?"' . esc_js(__('Select one of the matching users.', '${project.slug}')) . '":"";'
            . '}).catch(function(){select.options.length=0;select.add(new Option("' . esc_js(__('Could not search users. Please try again.', '${project.slug}')) . '",""));status.textContent="";});}'
            . 'input.addEventListener("input",function(){clearTimeout(timer);timer=setTimeout(searchUsers,250);});searchUsers();})();</script>';

        $rows = $this->enrolled_users();
        echo '<h2>' . esc_html__('Student course access', '${project.slug}') . '</h2>';
        echo '<p>' . esc_html__('Review current LearnPress enrollments and CourseBridge access dates. Cancel revokes the user’s LearnPress course access.', '${project.slug}') . '</p>';
        if (!$rows) {
            echo '<p>' . esc_html__('No LearnPress course enrollments were found yet.', '${project.slug}') . '</p>';
        } else {
            echo '<table class="widefat striped"><thead><tr><th>' . esc_html__('User', '${project.slug}') . '</th><th>' .
                esc_html__('Course', '${project.slug}') . '</th><th>' . esc_html__('Access source', '${project.slug}') . '</th><th>' .
                esc_html__('Access started', '${project.slug}') . '</th><th>' . esc_html__('Expires', '${project.slug}') . '</th><th>' .
                esc_html__('Status', '${project.slug}') . '</th><th>' . esc_html__('Action', '${project.slug}') . '</th></tr></thead><tbody>';
            foreach ($rows as $row) {
                $user_id = absint($row['user_id']);
                $course_id = absint($row['course_id']);
                $source = !empty($row['admin_access_status'])
                    ? __('Administrator assignment', '${project.slug}')
                    : ($row['purchase_access_status'] === 'active' ? __('WooCommerce purchase', '${project.slug}') : __('LearnPress enrollment', '${project.slug}'));
                $started = $row['access_start'] ?: $row['lp_start_time'];
                $expires = $row['access_expiry']
                    ? $row['access_expiry']
                    : __('No expiry recorded', '${project.slug}');
                $status = $row['admin_access_status'] === 'expired'
                    ? __('Expired', '${project.slug}')
                    : ($row['admin_access_status'] === 'cancelled' ? __('Cancelled', '${project.slug}') : ucfirst(sanitize_key($row['lp_status'])));
                echo '<tr><td>' . esc_html($row['display_name']) . '<br><small>@' . esc_html($row['user_login']) . ' · ' . esc_html($row['user_email']) . '</small></td>';
                echo '<td>' . esc_html($row['post_title']) . '</td><td>' . esc_html($source) . '</td><td>' .
                    esc_html($started ?: '—') . '</td><td>' . esc_html($expires) . '</td><td>' . esc_html($status) . '</td><td>';
                if (in_array($row['lp_status'], array('enrolled', 'finished'), true)) {
                    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
                    echo '<input type="hidden" name="action" value="tdlpw_cancel_course_access">';
                    echo '<input type="hidden" name="user_id" value="' . esc_attr((string) $user_id) . '">';
                    echo '<input type="hidden" name="course_id" value="' . esc_attr((string) $course_id) . '">';
                    wp_nonce_field('tdlpw_cancel_course_access_' . $user_id . '_' . $course_id);
                    echo '<button type="submit" class="button button-small" onclick="return confirm(' . esc_attr(wp_json_encode(__('Cancel this user’s access to the course?', '${project.slug}'))) . ')">' .
                        esc_html__('Cancel access', '${project.slug}') . '</button></form>';
                } else {
                    echo '—';
                }
                echo '</td></tr>';
            }
            echo '</tbody></table>';
        }
        echo '</div>';
    }
}
`;

/**
 * Build the complete, licensed CourseBridge plugin as one installable package.
 */
export function buildCourseBridgePaidEdition(project: Project) {
  const legacy = buildWordPressPluginFiles({
    ...project,
    slug: project.slug,
    name: project.name,
    shortDescription: project.shortDescription,
    description: project.description,
  });
  const common = {
    slug: project.slug,
    name: project.name,
    version: project.version,
    author: project.author,
  };
  const bridge = legacy["includes/class-bridge.php"]
    .replace(
      "        TDLPW_Audience::index_order($order, array_values(array_unique($product_ids)), array_values(array_unique($course_ids)));",
      "        if (class_exists('TDLPW_Audience')) { TDLPW_Audience::index_order($order, array_values(array_unique($product_ids)), array_values(array_unique($course_ids))); }",
    )
    .replace(
      "        global $wpdb;\n        $wpdb->update(\n            TDLPW_Audience::table(),",
      "        if (!class_exists('TDLPW_Audience')) { return; }\n        global $wpdb;\n        $wpdb->update(\n            TDLPW_Audience::table(),",
    );
  const paidFiles = {
    [`${project.slug}.php`]: paidMain(project),
    "includes/class-activator.php": legacy["includes/class-activator.php"],
    "includes/class-core.php": coreClass,
    "includes/class-course-admin.php": courseAdmin(project),
    "includes/class-bridge.php": bridge,
    "includes/class-audience.php": legacy["includes/class-audience.php"],
    "includes/class-resend.php": legacy["includes/class-resend.php"],
    "includes/class-admin.php": legacy["includes/class-admin.php"],
    "assets/css/admin.css": legacy["assets/css/admin.css"],
    "uninstall.php": legacy["uninstall.php"],
  };
  return normalizeGeneratedEdition({
    mainFile: `${project.slug}.php`,
    shortDescription: project.shortDescription,
    description: project.description,
    features: [
      "Link WooCommerce products to multiple LearnPress courses from Course Assignments or product settings",
      "Require or create a buyer account for mapped course purchases, then enroll on confirmed payment",
      "Reconcile existing paid WooCommerce orders after plugin updates and mapping changes",
      "Search users by display name, username, or email before assigning LearnPress courses",
      "Set optional course access expiry dates, review student access, and cancel assignments",
      "List purchased and administrator-assigned courses in WooCommerce My Account with start links",
      "Searchable buyer and enrolled-student dashboard with product, course, role, order, and spend filters",
      "Send individual or segmented campaigns to explicitly opted-in WordPress users through Resend",
      "Manage plugin settings, sender details, and license from one CourseBridge Pro menu",
    ],
    requirements: ["WooCommerce", "LearnPress", "Active Taskdrip license", "Resend API key for email campaigns"],
    files: paidFiles,
  }, common, "paid");
}
