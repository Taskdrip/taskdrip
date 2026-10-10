export interface PluginTemplateInfo {
  slug: string;
  name: string;
  version: string;
  author: string;
  shortDescription: string;
  description: string;
}

function phpLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function headerValue(value: string, maxLength: number): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\*\//g, "* /")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function replaceTokens(source: string, info: PluginTemplateInfo): string {
  const description = info.description
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\*\//g, "* /")
    .replace(/\u0000/g, "")
    .trim();
  const safeName = headerValue(info.name, 120);
  const safeAuthor = headerValue(info.author, 80);
  const safeShortDescription = headerValue(info.shortDescription, 180);
  const values: Record<string, string> = {
    "{{SLUG}}": info.slug.replace(/[^a-z0-9_-]/g, ""),
    "{{NAME}}": safeName,
    "{{NAME_PHP}}": phpLiteral(safeName),
    "{{VERSION}}": info.version.replace(/[^a-zA-Z0-9.+-]/g, ""),
    "{{AUTHOR}}": safeAuthor,
    "{{SHORT_DESCRIPTION}}": safeShortDescription,
    "{{DESCRIPTION}}": description,
  };
  return source.replace(/\{\{[A-Z_]+\}\}/g, (token) => values[token] ?? token);
}

const mainPlugin = `<?php
/**
 * Plugin Name: {{NAME}}
 * Plugin URI: https://taskdrip.online/shop
 * Description: {{SHORT_DESCRIPTION}}
 * Version: {{VERSION}}
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce, learnpress
 * Author: {{AUTHOR}}
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: {{SLUG}}
 * Domain Path: /languages
 *
 * @package {{SLUG}}
 */

if (!defined('ABSPATH')) {
    exit;
}

define('TDLPW_VERSION', '{{VERSION}}');
define('TDLPW_FILE', __FILE__);
define('TDLPW_PATH', plugin_dir_path(__FILE__));
define('TDLPW_URL', plugin_dir_url(__FILE__));

require_once TDLPW_PATH . 'includes/class-activator.php';
require_once TDLPW_PATH . 'includes/class-core.php';

register_activation_hook(__FILE__, array('TDLPW_Activator', 'activate'));
register_deactivation_hook(__FILE__, array('TDLPW_Activator', 'deactivate'));

add_action('plugins_loaded', function () {
    load_plugin_textdomain('{{SLUG}}', false, dirname(plugin_basename(__FILE__)) . '/languages');
    (new TDLPW_Core())->run();
});
`;

const activator = `<?php
if (!defined('ABSPATH')) { exit; }

final class TDLPW_Activator {
    public static function activate() {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $table = $wpdb->prefix . 'tdlpw_order_index';
        $charset = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE " . $table . " (
            order_id bigint(20) unsigned NOT NULL,
            user_id bigint(20) unsigned NULL,
            customer_email varchar(190) NOT NULL,
            product_ids longtext NOT NULL,
            course_ids longtext NOT NULL,
            amount decimal(18,4) NOT NULL DEFAULT 0,
            currency varchar(12) NOT NULL DEFAULT '',
            order_status varchar(30) NOT NULL DEFAULT '',
            purchased_at datetime NOT NULL,
            PRIMARY KEY  (order_id),
            KEY user_id (user_id),
            KEY customer_email (customer_email),
            KEY order_status (order_status),
            KEY purchased_at (purchased_at)
        ) " . $charset . ";";
        dbDelta($sql);
        $log_table = $wpdb->prefix . 'tdlpw_campaign_log';
        $log_sql = "CREATE TABLE " . $log_table . " (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            subject varchar(190) NOT NULL,
            email varchar(190) NOT NULL,
            status varchar(20) NOT NULL,
            detail text NOT NULL,
            sent_at datetime NOT NULL,
            PRIMARY KEY  (id),
            KEY email (email),
            KEY status (status),
            KEY sent_at (sent_at)
        ) " . $charset . ";";
        dbDelta($log_sql);
        if (get_option('tdlpw_settings', false) === false) {
            add_option('tdlpw_settings', array(
                'from_name' => get_bloginfo('name'),
                'from_email' => get_option('admin_email'),
            ), '', false);
        }
    }

    public static function deactivate() {
        // Keep purchase history, course mappings, and consent records on deactivation.
        wp_clear_scheduled_hook('tdlpw_cleanup_old_campaign_logs');
        wp_clear_scheduled_hook('tdlpw_backfill_paid_orders');
        wp_clear_scheduled_hook('tdlpw_sync_mapped_product');
    }
}
`;

const core = `<?php
if (!defined('ABSPATH')) { exit; }

require_once TDLPW_PATH . 'includes/class-bridge.php';
require_once TDLPW_PATH . 'includes/class-audience.php';
require_once TDLPW_PATH . 'includes/class-resend.php';
require_once TDLPW_PATH . 'includes/class-admin.php';

final class TDLPW_Core {
    public function run() {
        (new TDLPW_Bridge())->run();
        (new TDLPW_Admin())->run();
        add_action('admin_notices', array($this, 'dependency_notice'));
        add_action('init', array($this, 'unsubscribe_route'));
        add_action('init', array($this, 'register_privacy_handlers'));
        add_action('init', array('TDLPW_Audience', 'schedule_backfill'));
        add_action('tdlpw_backfill_paid_orders', array('TDLPW_Audience', 'backfill_paid_orders'));
    }

    public function dependency_notice() {
        if (!current_user_can('activate_plugins')) { return; }
        $missing = array();
        if (!class_exists('WooCommerce')) { $missing[] = 'WooCommerce'; }
        if (!defined('LEARNPRESS_VERSION')) { $missing[] = 'LearnPress'; }
        if ($missing) {
            echo '<div class="notice notice-warning"><p><strong>' .
                esc_html('{{NAME_PHP}}') . '</strong> requires ' .
                esc_html(implode(' and ', $missing)) . ' to be installed and active.</p></div>';
        }
    }

    public function unsubscribe_route() {
        if (!isset($_GET['tdlpw_unsubscribe'])) { return; }
        $user_id = absint($_GET['tdlpw_unsubscribe']);
        $token = isset($_GET['token']) ? sanitize_text_field(wp_unslash($_GET['token'])) : '';
        $expected = hash_hmac('sha256', (string) $user_id, wp_salt('auth'));
        if (!$user_id || !$token || !hash_equals($expected, $token)) {
            wp_die(esc_html__('This unsubscribe link is invalid or expired.', '{{SLUG}}'), '', array('response' => 400));
        }
        update_user_meta($user_id, 'tdlpw_email_marketing_optin', '0');
        wp_die(
            esc_html__('You have been unsubscribed from course marketing emails.', '{{SLUG}}'),
            esc_html__('Email preferences updated', '{{SLUG}}'),
            array('response' => 200)
        );
    }

    public function register_privacy_handlers() {
        add_filter('wp_privacy_personal_data_exporters', array($this, 'privacy_exporter'));
        add_filter('wp_privacy_personal_data_erasers', array($this, 'privacy_eraser'));
    }

    public function privacy_exporter($exporters) {
        $exporters['taskdrip-course-bridge'] = array(
            'exporter_friendly_name' => __('Course Bridge purchases and email preferences', '{{SLUG}}'),
            'callback' => array($this, 'export_personal_data'),
        );
        return $exporters;
    }

    public function export_personal_data($email_address, $page = 1) {
        $user = get_user_by('email', $email_address);
        if (!$user) { return array('data' => array(), 'done' => true); }
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare(
            'SELECT order_id, product_ids, course_ids, amount, currency, order_status, purchased_at FROM ' .
            TDLPW_Audience::table() . ' WHERE user_id = %d ORDER BY purchased_at DESC LIMIT 100',
            $user->ID
        ), ARRAY_A);
        $data = array();
        foreach ((array) $rows as $row) {
            $data[] = array(
                array('name' => __('Order', '{{SLUG}}'), 'value' => absint($row['order_id'])),
                array('name' => __('Products', '{{SLUG}}'), 'value' => implode(', ', array_filter(array_map('get_the_title', (array) json_decode($row['product_ids'], true))))),
                array('name' => __('Courses', '{{SLUG}}'), 'value' => implode(', ', array_filter(array_map('get_the_title', (array) json_decode($row['course_ids'], true))))),
                array('name' => __('Amount / currency', '{{SLUG}}'), 'value' => sanitize_text_field($row['amount'] . ' ' . $row['currency'])),
                array('name' => __('Order status', '{{SLUG}}'), 'value' => sanitize_key($row['order_status'])),
                array('name' => __('Purchase date', '{{SLUG}}'), 'value' => sanitize_text_field($row['purchased_at'])),
            );
        }
        $data[] = array(
            array('name' => __('Course marketing email consent', '{{SLUG}}'), 'value' => get_user_meta($user->ID, 'tdlpw_email_marketing_optin', true) === '1' ? __('Opted in', '{{SLUG}}') : __('Not opted in', '{{SLUG}}')),
        );
        return array('data' => $data, 'done' => true);
    }

    public function privacy_eraser($erasers) {
        $erasers['taskdrip-course-bridge'] = array(
            'eraser_friendly_name' => __('Course Bridge email preferences', '{{SLUG}}'),
            'callback' => array($this, 'erase_personal_data'),
        );
        return $erasers;
    }

    public function erase_personal_data($email_address, $page = 1) {
        $user = get_user_by('email', $email_address);
        if (!$user) { return array('items_removed' => false, 'items_retained' => false, 'messages' => array(), 'done' => true); }
        global $wpdb;
        $table = TDLPW_Audience::table();
        $wpdb->query($wpdb->prepare(
            'UPDATE ' . $table . ' SET user_id = NULL, customer_email = CONCAT("anonymized-", order_id, "@example.invalid") WHERE user_id = %d',
            $user->ID
        ));
        $wpdb->delete($wpdb->prefix . 'tdlpw_campaign_log', array('email' => $email_address), array('%s'));
        delete_user_meta($user->ID, 'tdlpw_email_marketing_optin');
        delete_user_meta($user->ID, 'tdlpw_email_marketing_optin_at');
        return array(
            'items_removed' => true,
            'items_retained' => true,
            'messages' => array(__('Purchase totals and order references are retained in anonymized form for store reporting; marketing consent and email logs were removed.', '{{SLUG}}')),
            'done' => true,
        );
    }
}
`;

const bridge = `<?php
if (!defined('ABSPATH')) { exit; }

final class TDLPW_Bridge {
    public function run() {
        add_action('woocommerce_product_options_general_product_data', array($this, 'product_course_field'));
        add_action('woocommerce_admin_process_product_object', array($this, 'save_product_courses'));
        add_action('tdlpw_sync_mapped_product', array($this, 'sync_historical_product_orders'), 10, 2);
        add_action('woocommerce_checkout_after_customer_details', array($this, 'checkout_optin'));
        add_action('woocommerce_checkout_create_order', array($this, 'save_checkout_optin'), 10, 2);
        add_action('woocommerce_order_status_processing', array($this, 'sync_paid_order'));
        add_action('woocommerce_order_status_completed', array($this, 'sync_paid_order'));
        add_action('woocommerce_payment_complete', array($this, 'sync_paid_order'));
        add_action('woocommerce_order_status_changed', array($this, 'sync_order_status'), 10, 4);
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

    public function product_course_field() {
        global $post;
        if (!$post || !current_user_can('edit_product', $post->ID)) { return; }
        $selected = array_map('absint', (array) get_post_meta($post->ID, '_tdlpw_course_ids', true));
        echo '<div class="options_group"><p class="form-field"><label for="tdlpw_course_ids">' .
            esc_html__('LearnPress courses', '{{SLUG}}') . '</label>';
        echo '<select id="tdlpw_course_ids" name="tdlpw_course_ids[]" class="wc-enhanced-select" multiple="multiple" style="width:50%">';
        foreach ($this->courses() as $course) {
            echo '<option value="' . esc_attr((string) $course->ID) . '" ' .
                selected(in_array((int) $course->ID, $selected, true), true, false) . '>' .
                esc_html($course->post_title) . '</option>';
        }
        echo '</select><span class="description">' .
            esc_html__('Buyers of this WooCommerce product will be enrolled in every selected course after confirmed payment.', '{{SLUG}}') .
            '</span></p></div>';
    }

    public function save_product_courses($product) {
        if (!($product instanceof WC_Product) || !current_user_can('edit_product', $product->get_id())) { return; }
        $ids = isset($_POST['tdlpw_course_ids']) ? array_map('absint', (array) wp_unslash($_POST['tdlpw_course_ids'])) : array();
        $valid = array();
        foreach (array_unique($ids) as $id) {
            if (get_post_type($id) === 'lp_course') { $valid[] = $id; }
        }
        $product->update_meta_data('_tdlpw_course_ids', $valid);
        if (!wp_next_scheduled('tdlpw_sync_mapped_product', array($product->get_id(), 1))) {
            wp_schedule_single_event(time() + 15, 'tdlpw_sync_mapped_product', array($product->get_id(), 1));
        }
    }

    public function sync_historical_product_orders($product_id, $page = 1) {
        if (!function_exists('wc_get_orders')) { return; }
        $page = max(1, absint($page));
        $result = wc_get_orders(array(
            'status' => array('wc-processing', 'wc-completed'),
            'product' => array(absint($product_id)),
            'limit' => 100,
            'page' => $page,
            'paginate' => true,
            'orderby' => 'date',
            'order' => 'ASC',
            'return' => 'objects',
        ));
        foreach ((array) ($result->orders ?? array()) as $order) {
            $this->sync_paid_order($order->get_id());
        }
        if ($page < absint($result->max_num_pages ?? 0)) {
            wp_schedule_single_event(time() + 20, 'tdlpw_sync_mapped_product', array(absint($product_id), $page + 1));
        }
    }

    public function checkout_optin() {
        if (!function_exists('woocommerce_form_field')) { return; }
        echo '<div class="tdlpw-marketing-optin">';
        woocommerce_form_field('tdlpw_email_marketing_optin', array(
            'type' => 'checkbox',
            'class' => array('form-row-wide'),
            'label' => esc_html__('Email me optional course news and learning offers. I can unsubscribe at any time.', '{{SLUG}}'),
            'required' => false,
        ), false);
        echo '</div>';
    }

    public function save_checkout_optin($order, $data) {
        if (empty($_POST['tdlpw_email_marketing_optin'])) { return; }
        $user_id = $order->get_user_id();
        if ($user_id) {
            update_user_meta($user_id, 'tdlpw_email_marketing_optin', '1');
            update_user_meta($user_id, 'tdlpw_email_marketing_optin_at', current_time('mysql', true));
        }
        $order->update_meta_data('_tdlpw_marketing_optin', '1');
    }

    public function sync_paid_order($order_id) {
        if (!function_exists('wc_get_order')) { return; }
        $order = wc_get_order($order_id);
        if (!$order || !$order->is_paid()) { return; }
        $user_id = absint($order->get_customer_id());
        $product_ids = array();
        $course_ids = array();
        foreach ($order->get_items() as $item) {
            $product_id = absint($item->get_product_id());
            if (!$product_id) { continue; }
            $product_ids[] = $product_id;
            $mapped = array_map('absint', (array) get_post_meta($product_id, '_tdlpw_course_ids', true));
            foreach ($mapped as $course_id) {
                if (!$course_id || get_post_type($course_id) !== 'lp_course') { continue; }
                $course_ids[] = $course_id;
                $done = array_map('absint', (array) $order->get_meta('_tdlpw_enrolled_courses', true));
                if ($user_id && !in_array($course_id, $done, true)) {
                    $result = self::enroll_user_in_course($user_id, $course_id);
                    if (!is_wp_error($result)) {
                        $done[] = $course_id;
                        $order->update_meta_data('_tdlpw_enrolled_courses', array_values(array_unique($done)));
                        $order->add_order_note(sprintf(
                            /* translators: %s: LearnPress course title. */
                            __('Taskdrip Course Bridge enrolled the customer in "%s".', '{{SLUG}}'),
                            get_the_title($course_id)
                        ));
                    }
                }
            }
        }
        $order->save();
        TDLPW_Audience::index_order($order, array_values(array_unique($product_ids)), array_values(array_unique($course_ids)));
    }

    public static function enroll_user_in_course($user_id, $course_id) {
        $user_id = absint($user_id);
        $course_id = absint($course_id);
        if (!$user_id || !get_user_by('id', $user_id) || get_post_type($course_id) !== 'lp_course') {
            return new WP_Error('tdlpw_invalid_assignment', __('Choose a valid WordPress user and LearnPress course.', '{{SLUG}}'));
        }
        if (function_exists('learn_press_user_enroll_course')) {
            $result = learn_press_user_enroll_course($user_id, $course_id);
        } elseif (function_exists('learn_press_get_user')) {
            $lp_user = learn_press_get_user($user_id);
            if (!is_object($lp_user) || !method_exists($lp_user, 'enroll')) {
                return new WP_Error('tdlpw_enrollment_api_unavailable', __('LearnPress does not expose a supported enrollment method on this site.', '{{SLUG}}'));
            }
            $result = $lp_user->enroll($course_id);
        } else {
            return new WP_Error('tdlpw_enrollment_api_unavailable', __('LearnPress enrollment is not available. Confirm LearnPress is installed and active.', '{{SLUG}}'));
        }
        if (is_wp_error($result)) { return $result; }
        if ($result === false) {
            return new WP_Error('tdlpw_enrollment_failed', __('LearnPress could not enroll this user. Check the course and user status.', '{{SLUG}}'));
        }
        return true;
    }

    public function sync_order_status($order_id, $from, $to, $order) {
        if (in_array($to, array('processing', 'completed'), true)) {
            $this->sync_paid_order($order_id);
            return;
        }
        global $wpdb;
        $wpdb->update(
            TDLPW_Audience::table(),
            array('order_status' => sanitize_key($to)),
            array('order_id' => absint($order_id)),
            array('%s'),
            array('%d')
        );
    }
}
`;

const audience = `<?php
if (!defined('ABSPATH')) { exit; }

final class TDLPW_Audience {
    public static function schedule_backfill() {
        if (!function_exists('wc_get_orders') || get_option('tdlpw_backfill_complete')) { return; }
        if (!wp_next_scheduled('tdlpw_backfill_paid_orders')) {
            wp_schedule_single_event(time() + 15, 'tdlpw_backfill_paid_orders');
        }
    }

    public static function backfill_paid_orders() {
        if (!function_exists('wc_get_orders')) { return; }
        $page = max(1, absint(get_option('tdlpw_backfill_page', 1)));
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
            // Reconcile legacy paid orders against current mappings, then index their purchases.
            (new TDLPW_Bridge())->sync_paid_order($order->get_id());
        }
        if ($page < absint($result->max_num_pages ?? 0)) {
            update_option('tdlpw_backfill_page', $page + 1, false);
            wp_schedule_single_event(time() + 20, 'tdlpw_backfill_paid_orders');
        } else {
            update_option('tdlpw_backfill_complete', 1, false);
            delete_option('tdlpw_backfill_page');
        }
    }

    public static function table() {
        global $wpdb;
        return $wpdb->prefix . 'tdlpw_order_index';
    }

    public static function index_order($order, $product_ids, $course_ids) {
        global $wpdb;
        $email = sanitize_email($order->get_billing_email());
        if (!$email) { return; }
        $user_id = absint($order->get_customer_id());
        if (!$user_id) {
            $existing = get_user_by('email', $email);
            $user_id = $existing ? absint($existing->ID) : null;
        }
        $paid_at = $order->get_date_paid();
        $wpdb->replace(self::table(), array(
            'order_id' => absint($order->get_id()),
            'user_id' => $user_id,
            'customer_email' => $email,
            'product_ids' => wp_json_encode(array_map('absint', $product_ids)),
            'course_ids' => wp_json_encode(array_map('absint', $course_ids)),
            'amount' => (float) $order->get_total(),
            'currency' => sanitize_text_field($order->get_currency()),
            'order_status' => sanitize_key($order->get_status()),
            'purchased_at' => $paid_at ? gmdate('Y-m-d H:i:s', $paid_at->getTimestamp()) : gmdate('Y-m-d H:i:s'),
        ), array('%d', '%d', '%s', '%s', '%s', '%f', '%s', '%s', '%s'));
    }

    public static function rows($filters = array()) {
        global $wpdb;
        $entries = $wpdb->get_results(
            'SELECT user_id, customer_email, product_ids, course_ids, amount, currency, order_id, purchased_at FROM ' .
            self::table() . " WHERE order_status IN ('processing','completed') ORDER BY purchased_at DESC LIMIT 5000",
            ARRAY_A
        );
        $audience = array();
        foreach ((array) $entries as $entry) {
            $email = sanitize_email($entry['customer_email']);
            $user = !empty($entry['user_id']) ? get_user_by('id', absint($entry['user_id'])) : get_user_by('email', $email);
            if (!$email || !$user) { continue; }
            $id = absint($user->ID);
            if (!isset($audience[$id])) {
                $audience[$id] = array(
                    'id' => $id,
                    'name' => $user->display_name,
                    'email' => $email,
                    'role' => implode(', ', array_map('sanitize_key', (array) $user->roles)),
                    'products' => array(),
                    'courses' => array(),
                    'orders' => 0,
                    'spend_by_currency' => array(),
                    'latest_order_id' => 0,
                    'last_purchase' => '',
                    'optin' => get_user_meta($id, 'tdlpw_email_marketing_optin', true) === '1',
                );
            }
            $audience[$id]['orders']++;
            if (!$audience[$id]['latest_order_id']) {
                $audience[$id]['latest_order_id'] = absint($entry['order_id']);
                $audience[$id]['last_purchase'] = sanitize_text_field($entry['purchased_at']);
            }
            $currency = sanitize_text_field($entry['currency'] ?: 'Other');
            if (!isset($audience[$id]['spend_by_currency'][$currency])) { $audience[$id]['spend_by_currency'][$currency] = 0; }
            $audience[$id]['spend_by_currency'][$currency] += (float) $entry['amount'];
            foreach ((array) json_decode((string) $entry['product_ids'], true) as $product_id) {
                $product_id = absint($product_id);
                if ($product_id) { $audience[$id]['products'][$product_id] = get_the_title($product_id); }
            }
            foreach ((array) json_decode((string) $entry['course_ids'], true) as $course_id) {
                $course_id = absint($course_id);
                if ($course_id) { $audience[$id]['courses'][$course_id] = get_the_title($course_id); }
            }
        }

        // Include direct LearnPress course enrollments, even when the student did not buy through WooCommerce.
        $table = $wpdb->prefix . 'learnpress_user_items';
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like($table)));
        if ($exists === $table) {
            $enrollments = $wpdb->get_results(
                "SELECT user_id, item_id FROM " . $table .
                " WHERE item_type = 'lp_course' AND status IN ('enrolled','finished') ORDER BY start_time DESC LIMIT 5000",
                ARRAY_A
            );
            foreach ((array) $enrollments as $enrollment) {
                $id = absint($enrollment['user_id']);
                $course_id = absint($enrollment['item_id']);
                $user = get_user_by('id', $id);
                if (!$user || !$course_id) { continue; }
                if (!isset($audience[$id])) {
                    $audience[$id] = array(
                        'id' => $id,
                        'name' => $user->display_name,
                        'email' => sanitize_email($user->user_email),
                        'role' => implode(', ', array_map('sanitize_key', (array) $user->roles)),
                        'products' => array(), 'courses' => array(), 'orders' => 0,
                        'spend_by_currency' => array(),
                        'latest_order_id' => 0, 'last_purchase' => '',
                        'optin' => get_user_meta($id, 'tdlpw_email_marketing_optin', true) === '1',
                    );
                }
                $audience[$id]['courses'][$course_id] = get_the_title($course_id);
            }
        }

        $product_filter = absint($filters['product'] ?? 0);
        $course_filter = absint($filters['course'] ?? 0);
        $role_filter = sanitize_key($filters['role'] ?? '');
        $opted_in = !empty($filters['opted_in']);
        $rows = array_values(array_filter($audience, function ($row) use ($product_filter, $course_filter, $role_filter, $opted_in) {
            if ($product_filter && !isset($row['products'][$product_filter])) { return false; }
            if ($course_filter && !isset($row['courses'][$course_filter])) { return false; }
            if ($role_filter && !in_array($role_filter, array_map('trim', explode(',', $row['role'])), true)) { return false; }
            if ($opted_in && !$row['optin']) { return false; }
            return true;
        }));
        usort($rows, function ($a, $b) { return strcasecmp($a['name'], $b['name']); });
        return $rows;
    }
}
`;

const resend = `<?php
if (!defined('ABSPATH')) { exit; }

final class TDLPW_Resend {
    public static function send_campaign($recipient_ids, $subject, $html) {
        $settings = get_option('tdlpw_settings', array());
        $api_key = defined('TDLPW_RESEND_API_KEY') ? constant('TDLPW_RESEND_API_KEY') : ($settings['resend_api_key'] ?? '');
        $from_email = sanitize_email($settings['from_email'] ?? '');
        $from_name = sanitize_text_field($settings['from_name'] ?? get_bloginfo('name'));
        if (!$api_key || !preg_match('/^re_[A-Za-z0-9_-]+$/', $api_key)) {
            return new WP_Error('tdlpw_missing_resend_key', __('Add a valid Resend API key in plugin settings or wp-config.php.', '{{SLUG}}'));
        }
        if (!$from_email || !is_email($from_email)) {
            return new WP_Error('tdlpw_missing_from_email', __('Set a valid sender address in the plugin settings.', '{{SLUG}}'));
        }
        if (count($recipient_ids) > 100) {
            return new WP_Error('tdlpw_batch_limit', __('A single campaign can contain at most 100 selected recipients.', '{{SLUG}}'));
        }
        $emails = array();
        $recipients = array();
        foreach (array_unique(array_map('absint', $recipient_ids)) as $user_id) {
            $user = get_user_by('id', $user_id);
            if (!$user || get_user_meta($user_id, 'tdlpw_email_marketing_optin', true) !== '1') { continue; }
            $token = hash_hmac('sha256', (string) $user_id, wp_salt('auth'));
            $unsubscribe = add_query_arg(array('tdlpw_unsubscribe' => $user_id, 'token' => $token), home_url('/'));
            $body = wpautop(wp_kses_post($html)) .
                '<p style="font-size:12px;color:#6b7280">You received this because you opted in to course updates. ' .
                '<a href="' . esc_url($unsubscribe) . '">Unsubscribe</a></p>';
            $recipients[] = $user->user_email;
            $emails[] = array(
                'from' => $from_name . ' <' . $from_email . '>',
                'to' => array(sanitize_email($user->user_email)),
                'subject' => sanitize_text_field($subject),
                'html' => $body,
                'headers' => array(
                    'List-Unsubscribe' => '<' . $unsubscribe . '>',
                    'List-Unsubscribe-Post' => 'List-Unsubscribe=One-Click',
                ),
            );
        }
        if (!$emails) { return array('sent' => 0, 'failed' => 0, 'errors' => array()); }
        $response = wp_remote_post('https://api.resend.com/emails/batch', array(
            'timeout' => 25,
            'headers' => array(
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json',
            ),
            'body' => wp_json_encode($emails),
        ));
        $response_code = is_wp_error($response) ? 0 : wp_remote_retrieve_response_code($response);
        if (is_wp_error($response) || $response_code < 200 || $response_code >= 300) {
            $error = is_wp_error($response) ? $response->get_error_message() : wp_remote_retrieve_body($response);
            foreach ($recipients as $email) { self::log($subject, $email, 'failed', $error); }
            return array('sent' => 0, 'failed' => count($recipients), 'errors' => array(substr($error, 0, 500)));
        }
        $sent = count($recipients);
        $result = json_decode(wp_remote_retrieve_body($response), true);
        foreach ($recipients as $index => $email) {
            $provider_id = sanitize_text_field($result['data'][$index]['id'] ?? '');
            self::log($subject, $email, 'sent', $provider_id ? 'Resend ID: ' . $provider_id : '');
        }
        return array('sent' => $sent, 'failed' => 0, 'errors' => array());
    }

    private static function log($subject, $email, $status, $detail) {
        global $wpdb;
        $table = $wpdb->prefix . 'tdlpw_campaign_log';
        $wpdb->insert($table, array(
            'subject' => sanitize_text_field($subject),
            'email' => sanitize_email($email),
            'status' => sanitize_key($status),
            'detail' => sanitize_textarea_field($detail),
            'sent_at' => current_time('mysql', true),
        ), array('%s', '%s', '%s', '%s', '%s'));
    }
}
`;

const admin = `<?php
if (!defined('ABSPATH')) { exit; }

final class TDLPW_Admin {
    public function run() {
        add_action('admin_menu', array($this, 'menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_post_tdlpw_save_settings', array($this, 'save_settings'));
        add_action('admin_post_tdlpw_send_campaign', array($this, 'send_campaign'));
    }

    public function enqueue_assets($hook) {
        if ($hook !== 'toplevel_page_tdlpw-dashboard') { return; }
        wp_enqueue_style('{{SLUG}}-admin', TDLPW_URL . 'assets/css/admin.css', array(), TDLPW_VERSION);
    }

    public function menu() {
        add_menu_page(
            esc_html__('Course Bridge', '{{SLUG}}'),
            esc_html__('Course Bridge', '{{SLUG}}'),
            'manage_woocommerce',
            'tdlpw-dashboard',
            array($this, 'render'),
            'dashicons-welcome-learn-more',
            58
        );
    }

    public function save_settings() {
        if (!current_user_can('manage_options')) { wp_die(esc_html__('Access denied.', '{{SLUG}}'), '', array('response' => 403)); }
        check_admin_referer('tdlpw_save_settings');
        $settings = get_option('tdlpw_settings', array());
        $settings['from_name'] = sanitize_text_field(wp_unslash($_POST['from_name'] ?? ''));
        $settings['from_email'] = sanitize_email(wp_unslash($_POST['from_email'] ?? ''));
        $key = trim(sanitize_text_field(wp_unslash($_POST['resend_api_key'] ?? '')));
        if ($key !== '') { $settings['resend_api_key'] = $key; }
        if (isset($_POST['remove_resend_api_key'])) { unset($settings['resend_api_key']); }
        update_option('tdlpw_settings', $settings, false);
        wp_safe_redirect(add_query_arg(array('page' => 'tdlpw-dashboard', 'tab' => 'settings', 'updated' => '1'), admin_url('admin.php')));
        exit;
    }

    public function send_campaign() {
        if (!current_user_can('manage_woocommerce')) { wp_die(esc_html__('Access denied.', '{{SLUG}}'), '', array('response' => 403)); }
        check_admin_referer('tdlpw_send_campaign');
        $subject = sanitize_text_field(wp_unslash($_POST['subject'] ?? ''));
        $html = wp_kses_post(wp_unslash($_POST['message'] ?? ''));
        $selected = array_map('absint', (array) wp_unslash($_POST['recipient_ids'] ?? array()));
        $selected = array_slice(array_values(array_unique(array_filter($selected))), 0, 100);
        if (!$subject || !$html || !$selected) {
            wp_safe_redirect(add_query_arg(array('page' => 'tdlpw-dashboard', 'tab' => 'customers', 'notice' => 'select'), admin_url('admin.php')));
            exit;
        }
        $result = TDLPW_Resend::send_campaign($selected, $subject, $html);
        if (is_wp_error($result)) {
            $notice = rawurlencode($result->get_error_message());
        } else {
            $notice = rawurlencode(sprintf(__('Campaign complete: %1$d sent, %2$d failed.', '{{SLUG}}'), $result['sent'], $result['failed']));
        }
        wp_safe_redirect(add_query_arg(array('page' => 'tdlpw-dashboard', 'tab' => 'customers', 'notice' => $notice), admin_url('admin.php')));
        exit;
    }

    private function course_choices() {
        return get_posts(array('post_type' => 'lp_course', 'post_status' => array('publish', 'private'), 'numberposts' => 500, 'orderby' => 'title', 'order' => 'ASC'));
    }

    private function product_choices() {
        return function_exists('wc_get_products') ? wc_get_products(array('limit' => 500, 'status' => 'publish', 'orderby' => 'name', 'order' => 'ASC')) : array();
    }

    public function render() {
        if (!current_user_can('manage_woocommerce')) { return; }
        $tab = sanitize_key($_GET['tab'] ?? 'overview');
        $settings = get_option('tdlpw_settings', array());
        $is_constant_key = defined('TDLPW_RESEND_API_KEY') && constant('TDLPW_RESEND_API_KEY');
        echo '<div class="wrap tdlpw-wrap"><h1>' . esc_html__('LearnPress + WooCommerce Course Bridge', '{{SLUG}}') . '</h1>';
        echo '<p>' . esc_html__('Link course products, verify paid orders, review buyers, and send consent-based course updates through Resend.', '{{SLUG}}') . '</p>';
        if (!empty($_GET['notice'])) {
            echo '<div class="notice notice-info is-dismissible"><p>' . esc_html(sanitize_text_field(wp_unslash($_GET['notice']))) . '</p></div>';
        }
        echo '<nav class="nav-tab-wrapper">';
        foreach (array('overview' => __('Overview', '{{SLUG}}'), 'customers' => __('Customers & Campaigns', '{{SLUG}}'), 'settings' => __('Email Settings', '{{SLUG}}')) as $key => $label) {
            echo '<a class="nav-tab ' . ($tab === $key ? 'nav-tab-active' : '') . '" href="' .
                esc_url(add_query_arg(array('page' => 'tdlpw-dashboard', 'tab' => $key), admin_url('admin.php'))) . '">' . esc_html($label) . '</a>';
        }
        echo '</nav>';
        if ($tab === 'settings') { $this->render_settings($settings, $is_constant_key); }
        elseif ($tab === 'customers') { $this->render_customers(); }
        else { $this->render_overview(); }
        echo '</div>';
    }

    private function render_overview() {
        $products = $this->product_choices();
        $courses = $this->course_choices();
        echo '<div class="tdlpw-grid"><section class="tdlpw-card"><h2>' . esc_html__('How course mapping works', '{{SLUG}}') . '</h2>';
        echo '<ol><li>' . esc_html__('Edit a WooCommerce product and choose one or more LearnPress courses in Product data → General.', '{{SLUG}}') . '</li>';
        echo '<li>' . esc_html__('When WooCommerce confirms payment, each mapped course is enrolled automatically once.', '{{SLUG}}') . '</li>';
        echo '<li>' . esc_html__('Review paid product and course purchases under Customers & Campaigns.', '{{SLUG}}') . '</li></ol>';
        echo '<p><strong>' . esc_html(sprintf(__('%1$d published products · %2$d LearnPress courses', '{{SLUG}}'), count($products), count($courses))) . '</strong></p>';
        if (!class_exists('WooCommerce') || !defined('LEARNPRESS_VERSION')) {
            echo '<p class="notice notice-warning inline">' . esc_html__('Activate WooCommerce and LearnPress to enable course mapping.', '{{SLUG}}') . '</p>';
        }
        echo '</section><section class="tdlpw-card"><h2>' . esc_html__('Course mappings', '{{SLUG}}') . '</h2>';
        if (!$products) { echo '<p>' . esc_html__('Publish a WooCommerce product to start linking courses.', '{{SLUG}}') . '</p>'; }
        else {
            echo '<table class="widefat striped"><thead><tr><th>' . esc_html__('Product', '{{SLUG}}') . '</th><th>' . esc_html__('Linked LearnPress courses', '{{SLUG}}') . '</th><th>' . esc_html__('Edit', '{{SLUG}}') . '</th></tr></thead><tbody>';
            foreach (array_slice($products, 0, 100) as $product) {
                $ids = array_map('absint', (array) get_post_meta($product->get_id(), '_tdlpw_course_ids', true));
                $names = array_filter(array_map('get_the_title', $ids));
                echo '<tr><td>' . esc_html($product->get_name()) . '</td><td>' . esc_html($names ? implode(', ', $names) : __('No course linked', '{{SLUG}}')) . '</td><td><a href="' . esc_url(get_edit_post_link($product->get_id())) . '">' . esc_html__('Edit product', '{{SLUG}}') . '</a></td></tr>';
            }
            echo '</tbody></table>';
        }
        echo '</section></div>';
        echo '<p class="description">' . esc_html__('Only successful WooCommerce payments are synced. Existing order and LearnPress enrollment records remain intact when this plugin is deactivated.', '{{SLUG}}') . '</p>';
    }

    private function render_customers() {
        global $wpdb;
        $filters = array(
            'product' => absint($_GET['product'] ?? 0),
            'course' => absint($_GET['course'] ?? 0),
            'role' => sanitize_key($_GET['role'] ?? ''),
            'opted_in' => !empty($_GET['opted_in']),
        );
        $rows = TDLPW_Audience::rows($filters);
        $current_page = max(1, absint($_GET['customers_page'] ?? 1));
        $page_size = 100;
        $page_rows = array_slice($rows, ($current_page - 1) * $page_size, $page_size);
        $total_pages = max(1, (int) ceil(count($rows) / $page_size));
        $roles = wp_roles()->roles;
        $courses = $this->course_choices();
        $products = $this->product_choices();
        echo '<form method="get" class="tdlpw-filters"><input type="hidden" name="page" value="tdlpw-dashboard"><input type="hidden" name="tab" value="customers">';
        echo '<select name="product"><option value="0">' . esc_html__('All products', '{{SLUG}}') . '</option>';
        foreach ($products as $product) {
            echo '<option value="' . esc_attr((string) $product->get_id()) . '" ' . selected($filters['product'], $product->get_id(), false) . '>' . esc_html($product->get_name()) . '</option>';
        }
        echo '</select><select name="course"><option value="0">' . esc_html__('All courses', '{{SLUG}}') . '</option>';
        foreach ($courses as $course) {
            echo '<option value="' . esc_attr((string) $course->ID) . '" ' . selected($filters['course'], $course->ID, false) . '>' . esc_html($course->post_title) . '</option>';
        }
        echo '</select><select name="role"><option value="">' . esc_html__('All WordPress roles', '{{SLUG}}') . '</option>';
        foreach ($roles as $key => $role) {
            echo '<option value="' . esc_attr($key) . '" ' . selected($filters['role'], $key, false) . '>' . esc_html(translate_user_role($role['name'])) . '</option>';
        }
        echo '</select><label><input type="checkbox" name="opted_in" value="1" ' . checked($filters['opted_in'], true, false) . '> ' . esc_html__('Marketing opt-ins only', '{{SLUG}}') . '</label><button class="button">' . esc_html__('Filter', '{{SLUG}}') . '</button></form>';
        echo '<p>' . esc_html(sprintf(__('%d buyer/student records. Campaigns can be sent only to users who explicitly opted in.', '{{SLUG}}'), count($rows))) . '</p>';
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="tdlpw_send_campaign">';
        wp_nonce_field('tdlpw_send_campaign');
        echo '<div class="tdlpw-campaign"><label>' . esc_html__('Email subject', '{{SLUG}}') . '<input class="regular-text" name="subject" required maxlength="180"></label>';
        echo '<label>' . esc_html__('Message (HTML allowed: links, headings, paragraphs)', '{{SLUG}}') . '<textarea name="message" rows="5" class="large-text" required></textarea></label>';
        echo '<button class="button button-primary" type="submit">' . esc_html__('Send to selected opted-in users', '{{SLUG}}') . '</button> <span class="description">' . esc_html__('Maximum 100 selected recipients per send.', '{{SLUG}}') . '</span></div>';
        echo '<table class="widefat striped"><thead><tr><th><input type="checkbox" data-tdlpw-select-all aria-label="' . esc_attr__('Select marketing opt-ins', '{{SLUG}}') . '"></th><th>' . esc_html__('Customer', '{{SLUG}}') . '</th><th>' . esc_html__('Role', '{{SLUG}}') . '</th><th>' . esc_html__('Products', '{{SLUG}}') . '</th><th>' . esc_html__('LearnPress courses', '{{SLUG}}') . '</th><th>' . esc_html__('Orders / spend / latest', '{{SLUG}}') . '</th><th>' . esc_html__('Email consent', '{{SLUG}}') . '</th></tr></thead><tbody>';
        if (!$rows) { echo '<tr><td colspan="7">' . esc_html__('No matching buyer or enrolled-student records found yet.', '{{SLUG}}') . '</td></tr>'; }
        foreach ($page_rows as $row) {
            $spend = array();
            foreach ($row['spend_by_currency'] as $currency => $amount) {
                $spend[] = number_format_i18n($amount, 2) . ' ' . $currency;
            }
            $latest_order = $row['latest_order_id']
                ? ' <a href="' . esc_url(add_query_arg(array('page' => 'wc-orders', 'action' => 'edit', 'id' => $row['latest_order_id']), admin_url('admin.php'))) . '">#' . esc_html((string) $row['latest_order_id']) . '</a>' .
                    ($row['last_purchase'] ? '<br><small>' . esc_html($row['last_purchase']) . ' UTC</small>' : '')
                : '';
            echo '<tr><td>' . ($row['optin'] ? '<input type="checkbox" name="recipient_ids[]" value="' . esc_attr((string) $row['id']) . '">' : '—') .
                '</td><td>' . esc_html($row['name']) . '<br><a href="mailto:' . esc_attr($row['email']) . '">' . esc_html($row['email']) . '</a></td>' .
                '<td>' . esc_html($row['role'] ?: '—') . '</td><td>' . esc_html(implode(', ', array_filter($row['products'])) ?: '—') . '</td>' .
                '<td>' . esc_html(implode(', ', array_filter($row['courses'])) ?: '—') . '</td>' .
                '<td>' . esc_html((string) $row['orders']) . ' / ' . esc_html(implode(', ', $spend) ?: '—') . $latest_order . '</td>' .
                '<td>' . ($row['optin'] ? '<span class="tdlpw-status tdlpw-opted">' . esc_html__('Opted in', '{{SLUG}}') . '</span>' : '<span class="tdlpw-status">' . esc_html__('Not opted in', '{{SLUG}}') . '</span>') . '</td></tr>';
        }
        echo '</tbody></table></form>';
        if ($total_pages > 1) {
            $pagination = array(
                'page' => 'tdlpw-dashboard', 'tab' => 'customers',
                'product' => $filters['product'], 'course' => $filters['course'],
                'role' => $filters['role'], 'opted_in' => $filters['opted_in'] ? 1 : '',
            );
            echo '<p class="tablenav"><span>' . esc_html(sprintf(__('Page %1$d of %2$d · %3$d contacts', '{{SLUG}}'), $current_page, $total_pages, count($rows))) . '</span> ';
            if ($current_page > 1) {
                echo '<a class="button" href="' . esc_url(add_query_arg(array_merge($pagination, array('customers_page' => $current_page - 1)), admin_url('admin.php'))) . '">' . esc_html__('Previous', '{{SLUG}}') . '</a> ';
            }
            if ($current_page < $total_pages) {
                echo '<a class="button" href="' . esc_url(add_query_arg(array_merge($pagination, array('customers_page' => $current_page + 1)), admin_url('admin.php'))) . '">' . esc_html__('Next', '{{SLUG}}') . '</a>';
            }
            echo '</p>';
        }
        $table = TDLPW_Audience::table();
        $count = (int) $wpdb->get_var("SELECT COUNT(*) FROM " . $table . " WHERE order_status IN ('processing','completed')");
        echo '<p class="description">' . esc_html(sprintf(__('Indexed successful WooCommerce orders: %d. Contact records are paginated; Resend sends up to 100 selected recipients per request.', '{{SLUG}}'), $count)) . '</p>';
        echo '<script>document.addEventListener("change",function(e){if(e.target.matches("[data-tdlpw-select-all]"))document.querySelectorAll("input[name=\\"recipient_ids[]\\"]").forEach(function(c){if(!c.disabled)c.checked=e.target.checked})});</script>';

        $logs = $wpdb->get_results('SELECT subject, email, status, detail, sent_at FROM ' . $wpdb->prefix . 'tdlpw_campaign_log ORDER BY id DESC LIMIT 30', ARRAY_A);
        echo '<h2>' . esc_html__('Recent Resend activity', '{{SLUG}}') . '</h2><table class="widefat striped"><thead><tr><th>' . esc_html__('Subject', '{{SLUG}}') . '</th><th>' . esc_html__('Recipient', '{{SLUG}}') . '</th><th>' . esc_html__('Status', '{{SLUG}}') . '</th><th>' . esc_html__('Provider response', '{{SLUG}}') . '</th><th>' . esc_html__('Sent at (UTC)', '{{SLUG}}') . '</th></tr></thead><tbody>';
        if (!$logs) { echo '<tr><td colspan="5">' . esc_html__('No email campaigns have been sent yet.', '{{SLUG}}') . '</td></tr>'; }
        foreach ((array) $logs as $log) {
            echo '<tr><td>' . esc_html($log['subject']) . '</td><td>' . esc_html($log['email']) . '</td><td>' . esc_html($log['status']) . '</td><td>' . esc_html($log['detail'] ?: '—') . '</td><td>' . esc_html($log['sent_at']) . '</td></tr>';
        }
        echo '</tbody></table>';
    }

    private function render_settings($settings, $is_constant_key) {
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" class="tdlpw-card tdlpw-settings">';
        echo '<input type="hidden" name="action" value="tdlpw_save_settings">';
        wp_nonce_field('tdlpw_save_settings');
        echo '<h2>' . esc_html__('Resend sender settings', '{{SLUG}}') . '</h2>';
        echo '<p>' . esc_html__('A verified sending domain is required in Resend. Campaigns are restricted to users who checked the optional marketing consent at WooCommerce checkout.', '{{SLUG}}') . '</p>';
        echo '<label>' . esc_html__('Sender name', '{{SLUG}}') . '<input class="regular-text" name="from_name" value="' . esc_attr($settings['from_name'] ?? get_bloginfo('name')) . '" required></label>';
        echo '<label>' . esc_html__('Verified sender email', '{{SLUG}}') . '<input class="regular-text" type="email" name="from_email" value="' . esc_attr($settings['from_email'] ?? get_option('admin_email')) . '" required></label>';
        if ($is_constant_key) {
            echo '<p class="notice notice-success inline">' . esc_html__('Resend API key is supplied by wp-config.php and is not editable here.', '{{SLUG}}') . '</p>';
        } else {
            echo '<label>' . esc_html__('Resend API key', '{{SLUG}}') . '<input class="regular-text" type="password" name="resend_api_key" value="" autocomplete="new-password" placeholder="' . esc_attr(!empty($settings['resend_api_key']) ? __('Saved — leave blank to keep current key', '{{SLUG}}') : 're_…') . '"></label>';
            echo '<p class="description">' . esc_html__('The key is stored in this WordPress site. For stronger protection, define TDLPW_RESEND_API_KEY in wp-config.php instead.', '{{SLUG}}') . '</p>';
            if (!empty($settings['resend_api_key'])) {
                echo '<label><input type="checkbox" name="remove_resend_api_key" value="1"> ' . esc_html__('Remove the saved Resend API key', '{{SLUG}}') . '</label>';
            }
        }
        echo '<p><button class="button button-primary">' . esc_html__('Save email settings', '{{SLUG}}') . '</button></p></form>';
    }
}
`;

const readme = `=== {{NAME}} ===
Contributors: taskdrip
Tags: learnpress, woocommerce, course, enrollment, email marketing
Requires at least: 6.2
Requires PHP: 7.4
Stable tag: {{VERSION}}
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

{{SHORT_DESCRIPTION}}

== Description ==

{{DESCRIPTION}}

Connect LearnPress courses to WooCommerce products. Confirmed WooCommerce orders enroll their customer in the courses mapped to purchased products. Review buyer roles, product and course purchases, and order totals from one WordPress admin screen. Send Resend email campaigns to customer segments only after the customer has opted in.

== Features ==

* Map one WooCommerce product to one or multiple LearnPress courses.
* Enroll customers when WooCommerce confirms payment; order metadata prevents duplicate enrollment.
* View successful product purchases and LearnPress enrollments with WordPress role and spend summaries.
* Filter the audience by product, course, role, and marketing consent.
* Send individual or selected-group email campaigns through Resend.
* Respect consent, add unsubscribe links, and log each email send result.
* Keep order history and course mappings when the plugin is deactivated.

== Installation ==

1. Upload the plugin ZIP in Plugins > Add New Plugin > Upload Plugin, or copy the unzipped folder to \`/wp-content/plugins/\`.
2. Activate WooCommerce and LearnPress, then activate this plugin.
3. Edit a WooCommerce product. Under Product data > General, map it to one or more LearnPress courses.
4. Go to Course Bridge > Email Settings and enter a Resend API key and verified sender email.
5. Test a sandbox or low-value order and confirm the student's LearnPress enrollment before enabling a live launch.

== Privacy and email consent ==

The optional checkout checkbox records consent to marketing email. Campaign tools send only to users with recorded consent. Every campaign includes an unsubscribe link. Order index records are retained after deactivation so administrators do not lose their purchase history.

== Frequently Asked Questions ==

= Does an order waiting for payment enroll the student? =

No. Enrollment happens only after WooCommerce reports that the order is paid and processing or completed.

= Can a product grant multiple courses? =

Yes. Select multiple LearnPress courses in that product's settings.

= Does email require a Resend API key? =

Yes. Add a Resend API key and use a verified sender domain. You can use the plugin settings or define TDLPW_RESEND_API_KEY in wp-config.php.

== Changelog ==

= {{VERSION}} =
* Initial release: LearnPress course mapping, paid-order enrollment, buyer reporting, consent-based Resend campaigns, and SEO-ready repository metadata.
`;

const deployment = `# {{NAME}} — release and repository notes

## Install a release ZIP

Upload the generated ZIP at WordPress Admin → Plugins → Add New Plugin → Upload Plugin. Activate WooCommerce and LearnPress first. Configure a low-value test product and verify the paid-order to course-enrollment flow before selling.

## Prepare a WordPress.org submission

This archive follows the standard WordPress plugin directory layout and includes readme.txt, GPL-compatible headers, text domain, capability checks, nonce-protected admin actions, escaped output, sanitized settings, and an uninstall file. Before submitting:

1. Review the current WordPress Plugin Developer guidelines and GPL-compatible licensing for every distributed dependency and asset.
2. Run Plugin Check and the current WordPress coding standards against this release.
3. Test supported WordPress, PHP, WooCommerce, and LearnPress versions on a clean staging site.
4. Submit the public/free SVN-hosted plugin to WordPress.org for human review. Acceptance is controlled by WordPress.org; this tool does not upload credentials or bypass review.
5. Distribute paid builds through Taskdrip Shop. A plugin hosted in the WordPress.org directory must follow its current rules; do not put a paid-only build in the directory.

## Credentials and email

The Resend key belongs to the WordPress site administrator and is not embedded in this ZIP. Prefer defining TDLPW_RESEND_API_KEY in wp-config.php; alternatively save it in Course Bridge → Email Settings. Use a verified sender domain and send marketing email only to opted-in users.
`;

const uninstall = `<?php
if (!defined('WP_UNINSTALL_PLUGIN')) { exit; }

// Preserve order reports, product-course mappings, and consent/audit data by default.
// An administrator may explicitly remove the report table and plugin options here.
if (defined('TDLPW_REMOVE_DATA_ON_UNINSTALL') && TDLPW_REMOVE_DATA_ON_UNINSTALL) {
    global $wpdb;
    $wpdb->query('DROP TABLE IF EXISTS ' . $wpdb->prefix . 'tdlpw_order_index');
    $wpdb->query('DROP TABLE IF EXISTS ' . $wpdb->prefix . 'tdlpw_campaign_log');
    delete_option('tdlpw_settings');
    delete_metadata('user', 0, 'tdlpw_email_marketing_optin', '', true);
    delete_metadata('user', 0, 'tdlpw_email_marketing_optin_at', '', true);
    $products = get_posts(array('post_type' => 'product', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids'));
    foreach ($products as $product_id) { delete_post_meta($product_id, '_tdlpw_course_ids'); }
}
`;

const css = `.tdlpw-wrap{max-width:1320px}.tdlpw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px;margin:22px 0}.tdlpw-card{background:#fff;border:1px solid #dcdcde;border-radius:10px;padding:20px;margin:22px 0}.tdlpw-card h2{margin-top:0}.tdlpw-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:18px 0}.tdlpw-filters select{min-width:180px}.tdlpw-campaign{display:grid;gap:12px;background:#fff;border:1px solid #dcdcde;border-radius:8px;padding:16px;margin:16px 0}.tdlpw-campaign label,.tdlpw-settings label{display:grid;gap:6px;font-weight:600}.tdlpw-settings{max-width:760px}.tdlpw-settings label{margin:14px 0}.tdlpw-status{display:inline-block;border-radius:999px;padding:3px 8px;background:#f1f1f1}.tdlpw-opted{background:#e7f8ee;color:#146b37}.tdlpw-wrap table td{vertical-align:top}.tdlpw-wrap .notice.inline{padding:8px 12px}.tdlpw-marketing-optin{margin:8px 0}
`;

export function buildWordPressPluginFiles(info: PluginTemplateInfo): Record<string, string> {
  const tokenized: Record<string, string> = {
    [`${info.slug}.php`]: mainPlugin,
    "includes/class-activator.php": activator,
    "includes/class-core.php": core,
    "includes/class-bridge.php": bridge,
    "includes/class-audience.php": audience,
    "includes/class-resend.php": resend,
    "includes/class-admin.php": admin,
    "assets/css/admin.css": css,
    "readme.txt": readme,
    "DEPLOYMENT.md": deployment,
    "uninstall.php": uninstall,
    "index.php": "<?php\n// Silence is golden.\n",
    "includes/index.php": "<?php\n// Silence is golden.\n",
    "assets/index.php": "<?php\n// Silence is golden.\n",
  };
  return Object.fromEntries(Object.entries(tokenized).map(([file, source]) => [file, replaceTokens(source, info)]));
}
