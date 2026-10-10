export type PluginEdition = "core" | "premium" | "paid";

export type GeneratedPluginEdition = {
  mainFile: string;
  files: Record<string, string>;
  shortDescription: string;
  description: string;
  features: string[];
  requirements: string[];
};

type ReleaseProject = {
  slug: string;
  name: string;
  version: string;
  author: string;
  shortDescription?: string | null;
  description: string;
  coreShortDescription?: string | null;
  coreDescription?: string | null;
  seoKeywords?: string | null;
  licenseApiBaseUrl?: string | null;
  releaseNotes?: string | null;
};

const MAX_FILES = 12;
const MAX_FILE_CHARS = 32_000;
const MAX_EDITION_CHARS = 120_000;
const SAFE_SOURCE_EXTENSIONS = new Set([".php", ".js", ".css"]);

function cleanHeaderValue(value: string, maxLength: number): string {
  return value.replace(/[<>\r\n\t]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanReadmeText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .trim()
    .slice(0, 8_000);
}

function normalizePluginHeader(
  source: string,
  values: { name: string; description: string; version: string; author: string; slug: string; coreSlug?: string },
): string {
  const commentStart = source.indexOf("/*", source.indexOf("<?php"));
  const commentEnd = commentStart < 0 ? -1 : source.indexOf("*/", commentStart + 2);
  if (commentStart < 0 || commentEnd < 0) {
    throw new Error("The generated plugin entry file is missing its WordPress header comment.");
  }

  const headers: Record<string, string> = {
    "Plugin Name": cleanHeaderValue(values.name, 120),
    Description: cleanHeaderValue(values.description, 200),
    Version: cleanHeaderValue(values.version, 30),
    Author: cleanHeaderValue(values.author, 80),
    "Text Domain": values.slug,
    "Requires at least": "6.2",
    "Requires PHP": "7.4",
    License: "GPL-2.0-or-later",
    "License URI": "https://www.gnu.org/licenses/gpl-2.0.html",
  };
  if (values.coreSlug) headers["Requires Plugins"] = values.coreSlug;

  const originalBlock = source.slice(commentStart, commentEnd + 2);
  const replaceableHeaders = new Set(Object.keys(headers).map((header) => header.toLowerCase()));
  const retainedLines = originalBlock
    .slice(2, -2)
    .split("\n")
    .filter((line) => {
      const match = line.match(/^\s*(?:\/\*|\*|#|\/\/)?\s*([^:]+):/);
      return !match || !replaceableHeaders.has(match[1].trim().toLowerCase());
    })
    .map((line) => line.trim().replace(/^\*+\s?/, ""))
    .filter(Boolean);
  const normalizedBlock = [
    "/*",
    ...retainedLines.map((line) => ` * ${line}`),
    ...Object.entries(headers).map(([key, value]) => ` * ${key}: ${value}`),
    " */",
  ].join("\n");
  return source.slice(0, commentStart) + normalizedBlock + source.slice(commentEnd + 2);
}

function coreVersionConstant(slug: string): string {
  return `TASKDRIP_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_CORE_VERSION`;
}

function phpSingleQuoted(value: string): string {
  const safe = value.replace(/[\r\n\u0000]/g, " ").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `'${safe}'`;
}

function addCoreDependencyContract(
  source: string,
  project: { slug: string; name: string; version: string },
  edition: PluginEdition,
): string {
  if (edition === "paid") return source;
  const headerStart = source.indexOf("/*", source.indexOf("<?php"));
  const headerEnd = source.indexOf("*/", headerStart) + 2;
  const constant = coreVersionConstant(project.slug);
  const contract = edition === "core"
    ? `\n\nif ( ! defined( '${constant}' ) ) {\n\tdefine( '${constant}', '${project.version}' );\n}\n`
    : `

if ( ! defined( 'ABSPATH' ) ) {
\treturn;
}

if ( ! defined( '${constant}' ) ) {
\tadd_action( 'admin_notices', static function () {
\t\tif ( ! current_user_can( 'activate_plugins' ) ) {
\t\t\treturn;
\t\t}
\t\techo '<div class="notice notice-error"><p>' . esc_html( ${phpSingleQuoted(`The ${project.name} Premium add-on requires the free core plugin (${project.slug}).`)} ) . '</p></div>';
\t} );
\treturn;
}
`;
  return source.slice(0, headerEnd) + contract + source.slice(headerEnd);
}

function stripWordPressPluginHeader(source: string): string {
  const match = source.match(/Plugin Name\s*:/i);
  if (!match || match.index === undefined) return source;

  const commentStart = source.lastIndexOf("/*", match.index);
  const commentEnd = source.indexOf("*/", match.index);
  if (commentStart < 0 || commentEnd < 0) return source;

  const headerComment = source.slice(commentStart, commentEnd + 2);
  if (!/Plugin Name\s*:/i.test(headerComment)) return source;
  return source.slice(0, commentStart) + source.slice(commentEnd + 2);
}

export function normalizeGeneratedEdition(
  input: unknown,
  project: Pick<ReleaseProject, "slug" | "name" | "version" | "author">,
  edition: PluginEdition,
): GeneratedPluginEdition {
  const candidate = input as Record<string, any> | null;
  const rawFiles = candidate?.files;
  const rawMainFile = String(candidate?.mainFile || "").replace(/\\/g, "/").trim();
  if (!rawFiles || typeof rawFiles !== "object" || Array.isArray(rawFiles)) {
    throw new Error(`The generated ${edition} package did not include a source file map.`);
  }

  const files: Record<string, string> = {};
  let totalChars = 0;
  for (const [rawPath, rawContent] of Object.entries(rawFiles)) {
    const filePath = rawPath.replace(/\\/g, "/").trim();
    const segments = filePath.split("/");
    const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
    if (
      !filePath ||
      filePath.startsWith("/") ||
      /[\u0000-\u001f\u007f]/.test(filePath) ||
      segments.some((segment) => !segment || segment === "." || segment === "..") ||
      !SAFE_SOURCE_EXTENSIONS.has(extension) ||
      filePath.length > 140
    ) {
      throw new Error(`The generated ${edition} package contains an unsafe or unsupported file path.`);
    }
    if (typeof rawContent !== "string" || rawContent.length > MAX_FILE_CHARS) {
      throw new Error(`A generated ${edition} source file is too large or invalid.`);
    }
    files[filePath] = rawContent.replace(/\u0000/g, "");
    totalChars += rawContent.length;
  }
  if (Object.keys(files).length > MAX_FILES || totalChars > MAX_EDITION_CHARS) {
    throw new Error(`The generated ${edition} package is too large. Reduce the requested scope and try again.`);
  }
  if (!rawMainFile || rawMainFile.includes("/") || !rawMainFile.toLowerCase().endsWith(".php") || !files[rawMainFile]) {
    throw new Error(`The generated ${edition} package needs a root-level main PHP file.`);
  }

  const mainSource = files[rawMainFile];
  if (!mainSource.startsWith("<?php") || !/Plugin Name\s*:/i.test(mainSource)) {
    throw new Error(`The generated ${edition} package is missing a valid WordPress plugin entry file.`);
  }

  const coreSlug = edition === "premium" ? project.slug : undefined;
  const pluginSlug = edition === "premium" ? `${project.slug}-premium` : project.slug;
  const pluginName = edition === "premium"
    ? `${project.name} Premium`
    : edition === "core"
      ? `${project.name} Core`
      : project.name;
  const normalizedFiles = { ...files };
  delete normalizedFiles[rawMainFile];
  const normalizedMain = normalizePluginHeader(mainSource, {
    name: pluginName,
    description: edition === "premium"
      ? "Premium add-on for the free core plugin."
      : edition === "paid"
        ? `Licensed standalone plugin: ${project.name}.`
        : `Free core edition of ${project.name}.`,
    version: project.version,
    author: project.author,
    slug: pluginSlug,
    coreSlug,
  });
  normalizedFiles[`${pluginSlug}.php`] = addCoreDependencyContract(normalizedMain, project, edition);

  const strings = (value: unknown, maxItems: number, maxLength: number) =>
    Array.isArray(value)
      ? value.map((item) => String(item).trim().slice(0, maxLength)).filter(Boolean).slice(0, maxItems)
      : [];
  const shortDescription = String(candidate?.shortDescription || "").trim().slice(0, 180);
  const description = String(candidate?.description || "").trim().slice(0, 6_000);
  const features = strings(candidate?.features, 8, 180);
  const requirements = strings(candidate?.requirements, 8, 120);
  if (shortDescription.length < 8 || description.length < 20 || features.length < 1 || requirements.length < 1) {
    throw new Error(`The generated ${edition} package is missing its release summary, features, or requirements.`);
  }
  return {
    mainFile: `${pluginSlug}.php`,
    files: normalizedFiles,
    shortDescription,
    description,
    features,
    requirements,
  };
}

export function buildPluginReleaseFiles(
  project: ReleaseProject,
  edition: PluginEdition,
  sourceFiles: Record<string, string>,
): { folderSlug: string; files: Record<string, string> } {
  const folderSlug = edition === "premium" ? `${project.slug}-premium` : project.slug;
  const pluginName = edition === "premium"
    ? `${project.name} Premium`
    : edition === "core" ? `${project.name} Core` : project.name;
  const shortDescription = edition === "core"
    ? project.coreShortDescription || `${project.name} free core plugin`
    : project.shortDescription || `${project.name} paid plugin`;
  const description = edition === "core" ? project.coreDescription || project.description : project.description;
  const tags = (project.seoKeywords || "")
    .split(",")
    .map((tag) => tag.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().replace(/\s+/g, "-"))
    .filter((tag) => tag.length > 1 && tag.length <= 30)
    .slice(0, 5);
  const readme = `=== ${cleanReadmeText(pluginName)} ===
Contributors: taskdrip
${tags.length ? `Tags: ${tags.join(", ")}` : "Tags: wordpress, productivity"}
Requires at least: 6.2
Requires PHP: 7.4
Stable tag: ${cleanHeaderValue(project.version, 30)}
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

${cleanReadmeText(shortDescription)}

== Description ==

${cleanReadmeText(description)}

${edition === "premium" ? `== Requirements ==

Install and activate the free ${cleanReadmeText(project.name)} Core plugin first (slug: ${project.slug}).

` : edition === "paid" ? `== Requirements ==

This paid plugin requires WooCommerce and LearnPress, plus an active Taskdrip license.

` : ""}== Installation ==

1. In WordPress, open Plugins > Add New Plugin > Upload Plugin and choose this ZIP.
2. Activate WooCommerce and LearnPress, then activate ${edition === "premium" ? "the free core first and this premium add-on" : edition === "paid" ? "this paid plugin" : "the core plugin"}.
3. Review the plugin settings and permissions before enabling it on a live site.
${edition === "paid" ? "4. Open CourseBridge Pro → License to activate the purchased key, then configure CourseBridge Pro → Settings.\n" : ""}
4. Test the requested features on a staging WordPress site with representative data.

== Changelog ==

= ${cleanHeaderValue(project.version, 30)} =
* Initial generated release. Review the source and complete the included test checklist before production use.
`;
  const installation = edition === "premium"
    ? `# Install and test ${pluginName}

1. Back up the site and use a staging WordPress site.
2. Install and activate the free core package (${project.slug}.zip).
3. Install and activate this premium add-on package (${folderSlug}.zip).
4. Install each package once. If an older Premium package appears twice in Plugins, deactivate and remove both old copies before installing this release.
5. Confirm there are no PHP errors; test each feature and permission with admin and non-admin accounts.
6. Test activation, deactivation, upgrades, and uninstall cleanup with disposable site data.
7. Confirm the add-on is blocked with a clear admin notice if the core plugin is inactive.

The generated package is not a substitute for a human security or compatibility review.
`
    : edition === "paid"
      ? `# Install and test ${pluginName}

1. Back up the site and use a staging WordPress site.
2. Deactivate and remove any old CourseBridge Premium add-on copies before installing this release.
3. Upload this single ZIP from WordPress Admin → Plugins → Add New Plugin → Upload Plugin and activate it.
4. Open CourseBridge Pro → License to activate the purchased license. Then use Dashboard, Course Assignments, and Settings from the CourseBridge Pro menu.
5. In Course Assignments, map a WooCommerce product to one or more LearnPress courses and assign a test user directly.
6. Place a paid test order using a WordPress account; confirm both the assigned user and buyer can start the course from WooCommerce My Account and their LearnPress profile.
7. Test with admin and non-admin accounts, then verify deactivation and upgrades using disposable staging data.

This licensed Taskdrip package is not a separate free Core plus Premium pair and is not a WordPress.org directory package.
`
      : `# Install and test ${pluginName}

1. Back up the site and use a staging WordPress site.
2. In WordPress, open Plugins > Add New Plugin > Upload Plugin and upload this ZIP.
3. Activate the plugin and check for PHP errors or unexpected database changes.
4. In Course Assignments, map a WooCommerce product to LearnPress courses and assign a test user; verify enrolled users can start courses from their account dashboard.
5. Test every advertised core feature with representative data and both admin and non-admin accounts.
6. Test activation, deactivation, upgrades, and uninstall cleanup with disposable site data.
7. Run the current WordPress Plugin Check and test every currently supported WordPress/PHP version.

Submitting a plugin requires its own WordPress.org review and SVN release process. This ZIP is not automatically approved or uploaded.
`;
  const files: Record<string, string> = {
    ...sourceFiles,
    "readme.txt": readme,
    "LICENSE": `This plugin is licensed under the GNU General Public License, version 2 or later.
See https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
`,
    "INSTALLATION-AND-TESTING.md": installation,
  };
  if (edition === "core") {
    files["WORDPRESS.ORG-SUBMISSION.md"] = `# WordPress.org submission preparation

This is the free core edition. Before submitting it:

1. Confirm every distributed file, dependency, image, and asset is GPL-compatible.
2. Review the current Plugin Directory guidelines: https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/
3. Run the current Plugin Check tool and resolve its findings.
4. Test on a clean staging site and verify the complete stable core remains useful without the paid add-on.
5. Submit through https://wordpress.org/plugins/developers/add/ and follow the directory team's review and SVN instructions.

The directory team makes all acceptance decisions. The paid add-on is distributed separately through Taskdrip and must not be included in this core ZIP.
`;
  } else if (edition === "paid") {
    files["TASKDRIP-RELEASE.md"] = `# ${pluginName} — licensed standalone plugin

This paid plugin combines WooCommerce-to-LearnPress course mapping, automatic and manual enrollment, buyer reporting, and consent-based Resend campaigns in one installable package. It is distributed through Taskdrip Shop and requires an active Taskdrip license.

For existing CourseBridge sites, replace the old Core package in place with this package, and deactivate/remove all separate CourseBridge Premium add-on copies first. The plugin slug remains ${project.slug} so the existing Core installation path can be upgraded without leaving a second CourseBridge plugin entry.

Review licensing, generated source, WordPress compatibility, security, and the included staging test checklist before publishing this product.
`;
  } else {
    files["TASKDRIP-RELEASE.md"] = `# Taskdrip premium release

This premium add-on is distributed through Taskdrip Shop. Customers must install the free core plugin (${project.slug}) first. Keep the core ZIP as a separate release for directory review; this add-on ZIP is not the WordPress.org directory package.

Review licensing, generated source, WordPress compatibility, security, and the included staging test checklist before publishing this product.
`;
  }
  if (edition !== "core") {
    const mainEntry = Object.entries(sourceFiles).find(([path, source]) =>
      !path.includes("/") && path.toLowerCase().endsWith(".php") && /Plugin Name\s*:/i.test(source));
    if (!mainEntry) throw new Error("The premium package is missing its root plugin entry file.");

    const standalonePaid = edition === "paid";
    const [sourceMainPath, rawSourceMain] = mainEntry;
    // WordPress scans every PHP file in a plugin's root folder. Keep the
    // generated implementation header-free so only the licensed wrapper is
    // listed as an installable plugin.
    const sourceMain = stripWordPressPluginHeader(rawSourceMain);
    const apiBase = String(project.licenseApiBaseUrl || "").replace(/\/+$/, "");
    const clientClass = `Taskdrip_${project.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_License_Client`;
    const optionPrefix = `taskdrip_${project.slug.replace(/[^a-z0-9_]+/gi, "_")}`;
    const apiBasePhp = phpSingleQuoted(apiBase);
    const slugPhp = phpSingleQuoted(project.slug);
    const versionPhp = phpSingleQuoted(project.version);
    const licensePageNamePhp = phpSingleQuoted(`${project.name}${standalonePaid ? "" : " Premium"} License`);
    const lockedNoticePhp = phpSingleQuoted(
      standalonePaid
        ? `${project.name} is locked. Open CourseBridge Pro → License to activate or renew a valid key.`
        : `${project.name} Premium is locked. Open Settings → Plugin License to activate or renew a valid key.`,
    );
    const pluginDescriptionPhp = phpSingleQuoted(
      standalonePaid ? `Licensed standalone plugin: ${project.name}.` : `Licensed premium add-on for ${project.name}.`,
    );
    const updateSlugPhp = phpSingleQuoted(folderSlug);
    const classPhp = `<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

if ( ! class_exists( '${clientClass}', false ) ) {
  class ${clientClass} {
    private static $slug = ${slugPhp};
      private static $plugin_slug = ${updateSlugPhp};
    private static $version = ${versionPhp};
    private static $api_base = ${apiBasePhp};
    private static $plugin_file = '';
    private static $option_prefix = '${optionPrefix}';

    public static function boot( $plugin_file ) {
      self::$plugin_file = $plugin_file;
      add_action( 'admin_menu', array( __CLASS__, 'add_menu' ), 10 );
      add_action( 'admin_post_taskdrip_activate_${project.slug.replace(/[^a-z0-9_]+/gi, "_")}', array( __CLASS__, 'activate' ) );
      add_action( 'admin_post_taskdrip_deactivate_${project.slug.replace(/[^a-z0-9_]+/gi, "_")}', array( __CLASS__, 'deactivate' ) );
      add_action( 'admin_notices', array( __CLASS__, 'notice' ) );
      add_filter( 'pre_set_site_transient_update_plugins', array( __CLASS__, 'inject_update' ) );
      add_filter( 'plugins_api', array( __CLASS__, 'plugin_info' ), 20, 3 );
      add_filter( 'auto_update_plugin', array( __CLASS__, 'allow_auto_update' ), 10, 2 );
      add_action( 'taskdrip_license_check_${project.slug.replace(/[^a-z0-9_]+/gi, "_")}', array( __CLASS__, 'refresh' ) );
      if ( ! wp_next_scheduled( 'taskdrip_license_check_${project.slug.replace(/[^a-z0-9_]+/gi, "_")}' ) ) {
        wp_schedule_event( time() + 300, 'twicedaily', 'taskdrip_license_check_${project.slug.replace(/[^a-z0-9_]+/gi, "_")}' );
      }
      register_deactivation_hook( $plugin_file, array( __CLASS__, 'on_deactivate' ) );
    }

    private static function key_option() { return self::$option_prefix . '_license_key'; }
    private static function state_transient() { return self::$option_prefix . '_license_state'; }
    private static function update_transient() { return self::$option_prefix . '_update_data'; }
    private static function install_id() {
      $id = get_option( self::$option_prefix . '_install_id' );
      if ( ! $id ) {
        $id = function_exists( 'wp_generate_uuid4' ) ? wp_generate_uuid4() : wp_hash( home_url() . microtime( true ) );
        update_option( self::$option_prefix . '_install_id', $id, false );
      }
      return $id;
    }

    private static function request( $action, $key = '' ) {
      if ( ! self::$api_base || ! function_exists( 'wp_remote_post' ) ) {
        return new WP_Error( 'taskdrip_license_server', 'The Taskdrip license server URL is not configured.' );
      }
      $response = wp_remote_post(
        self::$api_base . '/api/plugin-license/' . rawurlencode( self::$slug ) . '/' . rawurlencode( $action ),
        array(
          'timeout' => 12,
          'redirection' => 2,
          'headers' => array( 'Accept' => 'application/json' ),
          'body' => array(
            'licenseKey' => $key ? $key : get_option( self::key_option(), '' ),
            'installationId' => self::install_id(),
            'siteUrl' => home_url(),
            'pluginVersion' => self::$version,
            'wordpressVersion' => get_bloginfo( 'version' ),
          ),
        )
      );
      if ( is_wp_error( $response ) ) { return $response; }
      $code = (int) wp_remote_retrieve_response_code( $response );
      $data = json_decode( wp_remote_retrieve_body( $response ), true );
      if ( $code < 200 || $code >= 300 || ! is_array( $data ) ) {
        return new WP_Error( 'taskdrip_license_response', 'The Taskdrip license server could not validate this request.' );
      }
      return $data;
    }

    private static function cache_state( $state ) {
      if ( is_array( $state ) ) {
        set_transient( self::state_transient(), $state, 12 * HOUR_IN_SECONDS );
      }
    }

    public static function is_licensed() {
      $state = get_transient( self::state_transient() );
      return is_array( $state )
        && ! empty( $state['valid'] )
        && ! empty( $state['expiresAt'] )
        && strtotime( $state['expiresAt'] ) > time();
    }

    public static function refresh() {
      $key = get_option( self::key_option(), '' );
      if ( ! $key ) { return false; }
      $state = self::request( 'verify', $key );
      if ( is_array( $state ) ) { self::cache_state( $state ); }
      return is_array( $state ) && ! empty( $state['valid'] );
    }

    public static function activate() {
      if ( ! current_user_can( 'manage_options' ) ) { wp_die( esc_html__( 'You are not allowed to manage this license.', 'taskdrip' ) ); }
      check_admin_referer( 'taskdrip_activate_license' );
      $key = isset( $_POST['taskdrip_license_key'] ) ? sanitize_text_field( wp_unslash( $_POST['taskdrip_license_key'] ) ) : '';
      update_option( self::key_option(), $key, false );
      $state = self::request( 'activate', $key );
      if ( is_array( $state ) ) { self::cache_state( $state ); }
      wp_safe_redirect( add_query_arg( 'taskdrip_license', is_array( $state ) && ! empty( $state['valid'] ) ? 'active' : 'error', self::settings_url() ) );
      exit;
    }

    public static function deactivate() {
      if ( ! current_user_can( 'manage_options' ) ) { wp_die( esc_html__( 'You are not allowed to manage this license.', 'taskdrip' ) ); }
      check_admin_referer( 'taskdrip_deactivate_license' );
      self::request( 'deactivate' );
      delete_transient( self::state_transient() );
      delete_option( self::key_option() );
      wp_safe_redirect( add_query_arg( 'taskdrip_license', 'deactivated', self::settings_url() ) );
      exit;
    }

    private static function settings_url() {
      return admin_url( ${phpSingleQuoted(standalonePaid ? "admin.php?page=" : "options-general.php?page=")} . rawurlencode( self::$option_prefix . '-license' ) );
    }

    public static function add_menu() {
      ${standalonePaid ? `
      add_menu_page(
        esc_html__( 'CourseBridge Pro', 'taskdrip' ),
        esc_html__( 'CourseBridge Pro', 'taskdrip' ),
        'manage_options',
        'tdlpw-dashboard',
        array( __CLASS__, 'render_root' ),
        'dashicons-welcome-learn-more',
        58
      );
      add_submenu_page(
        'tdlpw-dashboard',
        esc_html__( 'License', 'taskdrip' ),
        esc_html__( 'License', 'taskdrip' ),
        'manage_options',
        self::$option_prefix . '-license',
        array( __CLASS__, 'render_page' )
      );` : `
      add_options_page(
        esc_html__( 'Plugin License', 'taskdrip' ),
        esc_html__( 'Plugin License', 'taskdrip' ),
        'manage_options',
        self::$option_prefix . '-license',
        array( __CLASS__, 'render_page' )
      );`}
    }

    public static function render_root() {
      if ( class_exists( 'TDLPW_Admin', false ) ) {
        ( new TDLPW_Admin() )->render();
        return;
      }
      self::render_page();
    }

    public static function render_page() {
      if ( ! current_user_can( 'manage_options' ) ) { return; }
      $state = get_transient( self::state_transient() );
      $key = get_option( self::key_option(), '' );
      $active = self::is_licensed();
      $notice = isset( $_GET['taskdrip_license'] ) ? sanitize_key( wp_unslash( $_GET['taskdrip_license'] ) ) : '';
      echo '<div class="wrap"><h1>' . esc_html( ${licensePageNamePhp} ) . '</h1>';
      if ( $notice === 'active' ) { echo '<div class="notice notice-success"><p>' . esc_html__( 'License activated.', 'taskdrip' ) . '</p></div>'; }
      if ( $notice === 'error' ) { echo '<div class="notice notice-error"><p>' . esc_html__( 'The key could not be activated. Check the key, expiry, and activation limit.', 'taskdrip' ) . '</p></div>'; }
      if ( $notice === 'deactivated' ) { echo '<div class="notice notice-info"><p>' . esc_html__( 'This site has been deactivated.', 'taskdrip' ) . '</p></div>'; }
      echo '<p>' . ( $active
        ? esc_html__( 'Premium access is active until ', 'taskdrip' ) . esc_html( date_i18n( get_option( 'date_format' ), strtotime( $state['expiresAt'] ) ) ) . '.'
        : esc_html__( ${phpSingleQuoted(standalonePaid
          ? "Enter a valid Taskdrip key to activate this plugin and enable its features and updates."
          : "Enter a valid Taskdrip key to unlock premium features and updates. Expired or missing keys keep the premium add-on locked.")}, 'taskdrip' ) ) . '</p>';
      echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
      wp_nonce_field( 'taskdrip_activate_license' );
      echo '<input type="hidden" name="action" value="taskdrip_activate_${project.slug.replace(/[^a-z0-9_]+/gi, "_")}" />';
      echo '<label for="taskdrip-license-key"><strong>' . esc_html__( 'License key', 'taskdrip' ) . '</strong></label><br />';
      echo '<input id="taskdrip-license-key" class="regular-text" type="password" autocomplete="off" name="taskdrip_license_key" value="' . esc_attr( $key ) . '" required />';
      submit_button( $active ? esc_html__( 'Replace / verify key', 'taskdrip' ) : esc_html__( 'Activate license', 'taskdrip' ) );
      echo '</form>';
      if ( $active ) {
        echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
        wp_nonce_field( 'taskdrip_deactivate_license' );
        echo '<input type="hidden" name="action" value="taskdrip_deactivate_${project.slug.replace(/[^a-z0-9_]+/gi, "_")}" />';
        submit_button( esc_html__( 'Deactivate this site', 'taskdrip' ), 'secondary' );
        echo '</form>';
      }
      if ( self::$api_base ) {
        echo '<p><a href="' . esc_url( self::$api_base . '/my-plugins' ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Manage downloads and renewals in Taskdrip', 'taskdrip' ) . '</a></p>';
      } else {
        echo '<p class="notice notice-error inline">' . esc_html__( 'This plugin package has no public Taskdrip license server URL. Contact the plugin publisher.', 'taskdrip' ) . '</p>';
      }
      echo '</div>';
    }

    public static function notice() {
      if ( ! current_user_can( 'manage_options' ) || self::is_licensed() ) { return; }
      echo '<div class="notice notice-warning"><p>' . esc_html( ${lockedNoticePhp} ) . '</p></div>';
    }

    private static function get_update() {
      if ( ! self::is_licensed() ) { return false; }
      $cached = get_transient( self::update_transient() );
      if ( is_array( $cached ) ) { return $cached; }
      $response = self::request( 'check-update' );
      if ( ! is_array( $response ) || empty( $response['valid'] ) ) { return false; }
      $update = ! empty( $response['update'] ) && is_array( $response['update'] ) ? $response['update'] : array();
      set_transient( self::update_transient(), $update, 6 * HOUR_IN_SECONDS );
      return $update;
    }

    public static function inject_update( $transient ) {
      if ( ! is_object( $transient ) || ! self::is_licensed() ) { return $transient; }
      $update = self::get_update();
      if ( empty( $update['version'] ) || empty( $update['package'] ) ) { return $transient; }
      if ( ! isset( $transient->response ) || ! is_array( $transient->response ) ) { $transient->response = array(); }
      $transient->response[self::$plugin_file] = (object) array(
        'slug' => self::$plugin_slug,
        'plugin' => self::$plugin_file,
        'new_version' => sanitize_text_field( $update['version'] ),
        'url' => self::$api_base . '/my-plugins',
        'package' => esc_url_raw( $update['package'] ),
      );
      return $transient;
    }

    public static function plugin_info( $result, $action, $args ) {
      if ( $action !== 'plugin_information' || empty( $args->slug ) || $args->slug !== self::$plugin_slug || ! self::is_licensed() ) {
        return $result;
      }
      $update = self::get_update();
      return (object) array(
        'name' => esc_html( ${phpSingleQuoted(standalonePaid ? project.name : `${project.name} Premium`)} ),
        'slug' => self::$plugin_slug,
        'version' => ! empty( $update['version'] ) ? sanitize_text_field( $update['version'] ) : self::$version,
        'author' => 'Taskdrip',
        'homepage' => self::$api_base . '/my-plugins',
        'sections' => array( 'description' => esc_html( ${pluginDescriptionPhp} ), 'changelog' => nl2br( esc_html( $update['changelog'] ?? '' ) ) ),
        'download_link' => ! empty( $update['package'] ) ? esc_url_raw( $update['package'] ) : '',
      );
    }

    public static function allow_auto_update( $update, $item ) {
      return is_object( $item ) && isset( $item->plugin ) && $item->plugin === self::$plugin_file && self::is_licensed() ? true : $update;
    }

    public static function on_deactivate() {
      self::request( 'deactivate' );
      delete_transient( self::state_transient() );
      delete_transient( self::update_transient() );
      wp_clear_scheduled_hook( 'taskdrip_license_check_${project.slug.replace(/[^a-z0-9_]+/gi, "_")}' );
    }
  }
}
`;
  const coreConstant = coreVersionConstant(project.slug);
  const legacyPremiumFile = `${project.slug}-premium/${project.slug}-premium.php`;
    const wrapper = `<?php
/*
 * Plugin Name: ${cleanHeaderValue(pluginName, 120)}
 * Description: ${cleanHeaderValue(standalonePaid ? `Licensed plugin: ${project.name}.` : "Premium add-on for the free core plugin.", 200)}
 * Version: ${cleanHeaderValue(project.version, 30)}
 * Author: ${cleanHeaderValue("Taskdrip", 80)}
 * Text Domain: ${folderSlug}
 * Update URI: ${cleanHeaderValue(project.licenseApiBaseUrl ? `${project.licenseApiBaseUrl.replace(/\/+$/, "")}/plugins/${folderSlug}` : `taskdrip-plugin:${folderSlug}`, 200)}
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Requires Plugins: ${standalonePaid ? "woocommerce, learnpress" : project.slug}
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }
${standalonePaid ? `\$active_plugins = (array) get_option( 'active_plugins', array() );
\$network_active_plugins = (array) get_site_option( 'active_sitewide_plugins', array() );
\$legacy_premium_file = ${phpSingleQuoted(legacyPremiumFile)};
if ( in_array( \$legacy_premium_file, \$active_plugins, true ) || isset( \$network_active_plugins[\$legacy_premium_file] ) ) {
  add_action( 'admin_notices', static function () {
    if ( current_user_can( 'activate_plugins' ) ) {
      echo '<div class="notice notice-error"><p>' . esc_html__( 'Deactivate and remove the old CourseBridge Premium add-on before using the combined CourseBridge Pro plugin.', 'taskdrip' ) . '</p></div>';
    }
  } );
  return;
}
` : `if ( ! defined( '${coreConstant}' ) ) {
  add_action( 'admin_notices', static function () {
    if ( current_user_can( 'activate_plugins' ) ) {
      echo '<div class="notice notice-error"><p>' . esc_html( ${phpSingleQuoted(`The ${project.name} Premium add-on requires the free core plugin (${project.slug}).`)} ) . '</p></div>';
    }
  } );
  return;
}
`}
require_once __DIR__ . '/includes/class-taskdrip-license.php';
${clientClass}::boot( plugin_basename( __FILE__ ) );
if ( ! ${clientClass}::is_licensed() ) { return; }
require_once __DIR__ . '/${folderSlug}-generated-main.php';
`;
    const outputFiles = { ...files };
    delete outputFiles[sourceMainPath];
    outputFiles[`${folderSlug}-generated-main.php`] = sourceMain;
    outputFiles["includes/class-taskdrip-license.php"] = classPhp;
    outputFiles[`${folderSlug}.php`] = wrapper;
    return { folderSlug, files: outputFiles };
  }

  return { folderSlug, files };
}
