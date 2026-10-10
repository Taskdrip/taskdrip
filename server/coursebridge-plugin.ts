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

const coreMain = (project: Project) => `<?php
/**
 * Plugin Name: ${project.name} Core
 * Description: Free core for connecting WooCommerce products to LearnPress courses.
 * Version: ${project.version}
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce, learnpress
 * Author: ${project.author}
 * License: GPL-2.0-or-later
 * Text Domain: ${project.slug}
 */
if (!defined('ABSPATH')) { exit; }
define('TDLPW_VERSION', '${project.version}');
define('TDLPW_FILE', __FILE__);
define('TDLPW_PATH', plugin_dir_path(__FILE__));
define('TDLPW_URL', plugin_dir_url(__FILE__));
require_once TDLPW_PATH . 'includes/class-activator.php';
require_once TDLPW_PATH . 'includes/class-bridge.php';
require_once TDLPW_PATH . 'includes/class-course-admin.php';
require_once TDLPW_PATH . 'includes/class-core.php';
register_activation_hook(__FILE__, array('TDLPW_Activator', 'activate'));
register_deactivation_hook(__FILE__, array('TDLPW_Activator', 'deactivate'));
add_action('plugins_loaded', function () {
    load_plugin_textdomain('${project.slug}', false, dirname(plugin_basename(__FILE__)) . '/languages');
    (new TDLPW_Core())->run();
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
        add_action('admin_menu', array($this, 'menu'));
        add_action('admin_post_tdlpw_assign_course', array($this, 'assign_course'));
    }

    public function menu() {
        add_menu_page(
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

    public function render() {
        if (!current_user_can('manage_options')) { return; }

        $search = sanitize_text_field(wp_unslash($_GET['user_search'] ?? ''));
        $notice = sanitize_key(wp_unslash($_GET['notice'] ?? ''));
        echo '<div class="wrap"><h1>' . esc_html__('Assign LearnPress Courses', '${project.slug}') . '</h1>';
        echo '<p>' . esc_html__('Choose a WordPress user and course to enroll them directly. This does not create or change a WooCommerce order.', '${project.slug}') . '</p>';
        if ($notice === 'enrolled') {
            echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('The user was enrolled in the selected course.', '${project.slug}') . '</p></div>';
        } elseif ($notice === 'failed') {
            $detail = sanitize_text_field(wp_unslash($_GET['detail'] ?? ''));
            echo '<div class="notice notice-error is-dismissible"><p>' .
                esc_html($detail ?: __('The course assignment could not be completed.', '${project.slug}')) . '</p></div>';
        }

        if (!class_exists('WooCommerce') || !defined('LEARNPRESS_VERSION')) {
            echo '<div class="notice notice-warning"><p>' . esc_html__('Activate WooCommerce and LearnPress to use CourseBridge.', '${project.slug}') . '</p></div>';
        }

        echo '<form method="get" action="' . esc_url(admin_url('admin.php')) . '" style="margin:16px 0">';
        echo '<input type="hidden" name="page" value="tdlpw-course-assignments">';
        echo '<label for="tdlpw-user-search"><strong>' . esc_html__('Find a user by name or email', '${project.slug}') . '</strong></label> ';
        echo '<input type="search" id="tdlpw-user-search" name="user_search" value="' . esc_attr($search) . '" class="regular-text">';
        echo '<button class="button">' . esc_html__('Search users', '${project.slug}') . '</button></form>';

        $users = $this->users($search);
        $courses = $this->courses();
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

const premiumMain = (project: Project) => `<?php
/**
 * Plugin Name: ${project.name} Premium
 * Description: Buyer analytics and consent-based Resend campaigns for CourseBridge.
 * Version: ${project.version}
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Requires Plugins: ${project.slug}
 * Author: ${project.author}
 * License: GPL-2.0-or-later
 * Text Domain: ${project.slug}-premium
 */
if (!defined('ABSPATH')) { exit; }
if (!defined('TASKDRIP_${project.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_CORE_VERSION')) {
    add_action('admin_notices', static function () {
        if (current_user_can('activate_plugins')) {
            echo '<div class="notice notice-error"><p>' . esc_html__('CourseBridge Premium requires the free CourseBridge Core plugin. Activate the core first.', '${project.slug}-premium') . '</p></div>';
        }
    });
    return;
}
if (!defined('TDLPW_PATH') || !defined('TDLPW_URL')) { return; }
define('TDLPW_PREMIUM_URL', plugin_dir_url(__FILE__));
require_once __DIR__ . '/includes/class-audience.php';
require_once __DIR__ . '/includes/class-resend.php';
require_once __DIR__ . '/includes/class-admin.php';
register_activation_hook(__FILE__, array('TDLPW_Activator', 'activate'));
add_action('plugins_loaded', function () {
    (new TDLPW_Admin())->run();
    add_action('init', array('TDLPW_Audience', 'schedule_backfill'));
    add_action('tdlpw_backfill_paid_orders', array('TDLPW_Audience', 'backfill_paid_orders'));
});
`;

/**
 * Build the fixed CourseBridge editions without depending on the configured
 * text-generation service. The free edition keeps mapping/enrollment useful;
 * the paid add-on contains buyer reporting and the Resend campaign dashboard.
 */
export function buildCourseBridgePluginEdition(project: Project, edition: PluginEdition) {
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

  if (edition === "core") {
    const bridge = legacy["includes/class-bridge.php"]
      .replace(
        "        TDLPW_Audience::index_order($order, array_values(array_unique($product_ids)), array_values(array_unique($course_ids)));",
        "        if (class_exists('TDLPW_Audience')) { TDLPW_Audience::index_order($order, array_values(array_unique($product_ids)), array_values(array_unique($course_ids))); }",
      )
      .replace(
        "        global $wpdb;\n        $wpdb->update(\n            TDLPW_Audience::table(),",
        "        if (!class_exists('TDLPW_Audience')) { return; }\n        global $wpdb;\n        $wpdb->update(\n            TDLPW_Audience::table(),",
      );
    const coreFiles = {
      [`${project.slug}.php`]: coreMain(project),
      "includes/class-activator.php": legacy["includes/class-activator.php"],
      "includes/class-core.php": coreClass,
      "includes/class-course-admin.php": courseAdmin(project),
      "includes/class-bridge.php": bridge,
      "uninstall.php": legacy["uninstall.php"],
    };
    return normalizeGeneratedEdition({
      mainFile: `${project.slug}.php`,
      shortDescription: "Link WooCommerce products to LearnPress courses and enroll paid customers automatically.",
      description: "A useful free core for mapping WooCommerce products to LearnPress courses, enrolling customers after confirmed payment, and assigning courses to users from the WordPress admin dashboard.",
      features: [
        "Map one product to multiple LearnPress courses",
        "Enroll customers after successful payment",
        "Search for WordPress users and manually enroll them in LearnPress courses from the admin dashboard",
        "Prevent duplicate enrollments when WooCommerce order hooks repeat",
      ],
      requirements: ["WooCommerce", "LearnPress"],
      files: coreFiles,
    }, common, edition);
  }

  const premiumFiles = {
    [`${project.slug}-premium.php`]: premiumMain(project),
    "includes/class-audience.php": legacy["includes/class-audience.php"],
    "includes/class-resend.php": legacy["includes/class-resend.php"],
    "includes/class-admin.php": legacy["includes/class-admin.php"].replaceAll("TDLPW_URL . 'assets/css/admin.css'", "TDLPW_PREMIUM_URL . 'assets/css/admin.css'"),
    "assets/css/admin.css": legacy["assets/css/admin.css"],
  };
  return normalizeGeneratedEdition({
    mainFile: `${project.slug}-premium.php`,
    shortDescription: project.shortDescription,
    description: project.description,
    features: [
      "Searchable buyer and enrolled-student dashboard with product, course, role, order, and spend filters",
      "Send individual or segmented campaigns to explicitly opted-in WordPress users through Resend",
      "Store sender settings, unsubscribe preferences, and campaign delivery logs",
    ],
    requirements: ["WooCommerce", "LearnPress", `CourseBridge Core (${project.slug})`, "Resend API key and verified sender domain"],
    files: premiumFiles,
  }, common, edition);
}

export function buildCourseBridgePluginEditions(project: Project) {
  return {
    core: buildCourseBridgePluginEdition(project, "core"),
    premium: buildCourseBridgePluginEdition(project, "premium"),
  };
}
