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
        add_action('admin_menu', array($this, 'menu'), 20);
        add_action('admin_post_tdlpw_assign_course', array($this, 'assign_course'));
        add_action('admin_post_tdlpw_save_product_courses', array($this, 'save_product_courses'));
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
        $user = $user_id ? get_user_by('id', $user_id) : false;
        if (!$user || !$course_id || get_post_type($course_id) !== 'lp_course') {
            $result = new WP_Error('tdlpw_invalid_assignment', __('Choose a valid WordPress user and LearnPress course.', '${project.slug}'));
        } else {
            $result = TDLPW_Bridge::enroll_user_in_course($user_id, $course_id);
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

    private function users($search) {
        $args = array(
            'number' => 200,
            'orderby' => 'display_name',
            'order' => 'ASC',
            'fields' => array('ID', 'display_name', 'user_email'),
        );
        if ($search !== '') {
            $args['search'] = '*' . $search . '*';
            $args['search_columns'] = array('user_login', 'user_email', 'display_name');
        }
        return get_users($args);
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

        echo '<form method="get" action="' . esc_url(admin_url('admin.php')) . '" style="margin:16px 0">';
        echo '<input type="hidden" name="page" value="tdlpw-course-assignments">';
        echo '<label for="tdlpw-user-search"><strong>' . esc_html__('Find a user by name or email', '${project.slug}') . '</strong></label> ';
        echo '<input type="search" id="tdlpw-user-search" name="user_search" value="' . esc_attr($search) . '" class="regular-text">';
        echo '<button class="button">' . esc_html__('Search users', '${project.slug}') . '</button></form>';

        $users = $this->users($search);
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" style="max-width:760px;background:#fff;border:1px solid #dcdcde;padding:20px">';
        echo '<input type="hidden" name="action" value="tdlpw_assign_course">';
        echo '<input type="hidden" name="user_search" value="' . esc_attr($search) . '">';
        wp_nonce_field('tdlpw_assign_course');
        echo '<p><label for="tdlpw-user"><strong>' . esc_html__('WordPress user', '${project.slug}') . '</strong></label><br>';
        echo '<select id="tdlpw-user" name="user_id" required style="min-width:360px;max-width:100%">';
        echo '<option value="">' . esc_html__('Select a user', '${project.slug}') . '</option>';
        foreach ($users as $user) {
            $label = $user->display_name . ' (' . $user->user_email . ')';
            echo '<option value="' . esc_attr((string) $user->ID) . '">' . esc_html($label) . '</option>';
        }
        echo '</select></p>';
        echo '<p><label for="tdlpw-course"><strong>' . esc_html__('LearnPress course', '${project.slug}') . '</strong></label><br>';
        echo '<select id="tdlpw-course" name="course_id" required style="min-width:360px;max-width:100%">';
        echo '<option value="">' . esc_html__('Select a course', '${project.slug}') . '</option>';
        foreach ($courses as $course) {
            echo '<option value="' . esc_attr((string) $course->ID) . '">' . esc_html($course->post_title) . '</option>';
        }
        echo '</select></p>';
        if (!$users) {
            echo '<p>' . esc_html__('No users matched. Search with another name or email address.', '${project.slug}') . '</p>';
        } elseif (!$search) {
            echo '<p class="description">' . esc_html__('Showing up to 200 users. Search by name or email if the user is not listed.', '${project.slug}') . '</p>';
        }
        if (!$courses) {
            echo '<p class="notice notice-warning inline">' . esc_html__('No published or private LearnPress courses were found.', '${project.slug}') . '</p>';
        }
        echo '<p><button type="submit" class="button button-primary" ' . ((!$users || !$courses) ? 'disabled' : '') . '>' .
            esc_html__('Enroll user in course', '${project.slug}') . '</button></p></form></div>';
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
      "Backfill existing paid orders after a product-to-course mapping is saved",
      "Assign users to LearnPress courses directly from the WordPress dashboard",
      "List purchased and administrator-assigned courses in WooCommerce My Account with start links",
      "Searchable buyer and enrolled-student dashboard with product, course, role, order, and spend filters",
      "Send individual or segmented campaigns to explicitly opted-in WordPress users through Resend",
      "Manage plugin settings, sender details, and license from one CourseBridge Pro menu",
    ],
    requirements: ["WooCommerce", "LearnPress", "Active Taskdrip license", "Resend API key for email campaigns"],
    files: paidFiles,
  }, common, "paid");
}
