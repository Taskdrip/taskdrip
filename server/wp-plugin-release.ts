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
  corePluginName?: string | null;
  coreFeatures?: string[] | null;
  testedUpTo?: string | null;
  shortDescription?: string | null;
  description: string;
  coreShortDescription?: string | null;
  coreDescription?: string | null;
  seoKeywords?: string | null;
  licenseApiBaseUrl?: string | null;
  releaseNotes?: string | null;
  features?: string[] | null;
};

// WordPress.org readmes use a major.minor version; update this target only
// after staging verification on that release.
const DEFAULT_TESTED_UP_TO = "7.1";
const MAX_FILES = 12;
const MAX_FILE_CHARS = 37_000;
const MAX_EDITION_CHARS = 132_000;
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

const TRANSLATION_DOMAIN_ARGUMENT: Record<string, number> = {
  __: 1,
  _e: 1,
  _x: 2,
  _ex: 2,
  _n: 3,
  _nx: 4,
  _n_noop: 2,
  _nx_noop: 3,
  esc_html__: 1,
  esc_attr__: 1,
  esc_html_e: 1,
  esc_attr_e: 1,
  esc_html_x: 2,
  esc_attr_x: 2,
  translate: 1,
};
const TRANSLATION_CALL = new RegExp(
  `\\b(${Object.keys(TRANSLATION_DOMAIN_ARGUMENT).sort((a, b) => b.length - a.length).join("|")})\\s*\\(`,
  "g",
);
const DIRECT_DATABASE_CALL = /\$wpdb\s*->\s*(?:get_results|get_row|get_var|query)\s*\(/g;
const PHP_STRING_PLACEHOLDER = /%(?:[1-9]\d*\$)?[bcdeEfFgGosuxX]/;

function splitPhpCallArguments(source: string, openParen: number): string[] | null {
  const args: string[] = [];
  let start = openParen + 1;
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  let quote = "";

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (quote) {
      if (char === "\\") {
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
    } else if (char === "/" && next === "*") {
      const commentEnd = source.indexOf("*/", index + 2);
      if (commentEnd < 0) return null;
      index = commentEnd + 1;
    } else if ((char === "/" && next === "/") || (char === "#" && next !== "[")) {
      const newline = source.indexOf("\n", index + 1);
      if (newline < 0) return null;
      index = newline;
    } else if (char === "(") {
      parentheses += 1;
    } else if (char === ")") {
      if (parentheses === 0 && brackets === 0 && braces === 0) {
        const finalArg = source.slice(start, index).trim();
        if (finalArg || args.length) args.push(finalArg);
        return args;
      }
      parentheses -= 1;
    } else if (char === "[") {
      brackets += 1;
    } else if (char === "]") {
      brackets -= 1;
    } else if (char === "{") {
      braces += 1;
    } else if (char === "}") {
      braces -= 1;
    } else if (char === "," && parentheses === 0 && brackets === 0 && braces === 0) {
      args.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  return null;
}

function phpStringLiteral(argument: string): string | null {
  const value = argument.trim();
  if (!/^'(?:\\.|[^'\\])*'$|^"(?:\\.|[^"\\])*"$/.test(value)) return null;
  return value.slice(1, -1).replace(/\\(['"\\])/g, "$1");
}

function validateWordPressOrgPhp(slug: string, files: Record<string, string>): void {
  const failures: string[] = [];
  const forbiddenUpdaterCode =
    /\b(?:site_transient_update_plugins|pre_set_site_transient_update_plugins|auto_update_plugin|plugins_api|upgrader_pre_download)\b|^\s*\*?\s*Update URI\s*:/im;

  for (const [path, source] of Object.entries(files).filter(([filePath]) => filePath.endsWith(".php"))) {
    if (forbiddenUpdaterCode.test(source)) {
      failures.push(`${path}: remove custom update-checker hooks and Update URI headers from the directory edition`);
    }
    DIRECT_DATABASE_CALL.lastIndex = 0;
    let databaseCallMatch: RegExpExecArray | null;
    while ((databaseCallMatch = DIRECT_DATABASE_CALL.exec(source)) !== null) {
      const match = databaseCallMatch;
      const openParen = (match.index ?? 0) + match[0].lastIndexOf("(");
      const query = splitPhpCallArguments(source, openParen)?.[0] || "";
      const codeOutsideSingleQuotedStrings = query.replace(/'(?:\\.|[^'\\])*'/g, "");
      const hasDynamicSql =
        /\$[A-Za-z_][A-Za-z0-9_]*/.test(codeOutsideSingleQuotedStrings) ||
        /%(?:[1-9]\d*\$)?[sdf]/.test(query);
      if (hasDynamicSql && !/\$wpdb\s*->\s*prepare\s*\(/i.test(query)) {
        const line = source.slice(0, match.index ?? 0).split("\n").length;
        failures.push(`${path}:${line}: wrap dynamic SQL in $wpdb->prepare() and use placeholders for values and identifiers`);
      }
    }
    TRANSLATION_CALL.lastIndex = 0;
    let translationCallMatch: RegExpExecArray | null;
    while ((translationCallMatch = TRANSLATION_CALL.exec(source)) !== null) {
      const match = translationCallMatch;
      const functionName = match[1];
      const callIndex = match.index ?? 0;
      const openParen = callIndex + match[0].lastIndexOf("(");
      const args = splitPhpCallArguments(source, openParen);
      const domainIndex = TRANSLATION_DOMAIN_ARGUMENT[functionName];
      const domain = args?.[domainIndex] ? phpStringLiteral(args[domainIndex]) : null;
      if (domain !== slug) {
        failures.push(`${path}: ${functionName}() must use the plugin text domain "${slug}"`);
        continue;
      }

      const translatableStrings = [args?.[0], functionName === "_n" || functionName === "_nx" ? args?.[1] : null]
        .filter((value): value is string => Boolean(value))
        .map(phpStringLiteral)
        .filter((value): value is string => value !== null);
      if (translatableStrings.some((value) => PHP_STRING_PLACEHOLDER.test(value))) {
        const precedingLines = source.slice(0, callIndex).split(/\r?\n/).slice(-4).join("\n");
        if (!/\btranslators:/i.test(precedingLines)) {
          const line = source.slice(0, callIndex).split("\n").length;
          failures.push(`${path}:${line}: add a translators: comment explaining the placeholders`);
        }
      }
    }
  }

  const rootEntries = Object.entries(files).filter(([path, source]) =>
    !path.includes("/") && path.toLowerCase().endsWith(".php") && /Plugin Name\s*:/i.test(source),
  );
  if (rootEntries.length !== 1) {
    failures.push("include exactly one root-level PHP plugin entry file");
  } else if (!new RegExp(
    `Text Domain:\\s*${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:\\r?\\n|\\*/)`,
    "i",
  ).test(rootEntries[0][1])) {
    failures.push(`the main plugin header must declare the "${slug}" text domain`);
  }

  if (failures.length) {
    const uniqueFailures = failures.filter((failure, index) => failures.indexOf(failure) === index);
    throw new Error(`The free core package failed WordPress.org release checks:\n- ${uniqueFailures.join("\n- ")}`);
  }
}

function validateWordPressOrgReadme(readme: string, version: string): void {
  const stableTag = cleanHeaderValue(version, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const requiredHeaders: Array<[string, RegExp]> = [
    ["plugin title", /^=== .+ ===$/m],
    ["contributors", /^Contributors:\s*\S.+$/m],
    ["tags", /^Tags:\s*\S.+$/m],
    ["minimum WordPress version", /^Requires at least:\s*\d+(?:\.\d+)?$/m],
    ["minimum PHP version", /^Requires PHP:\s*\d+(?:\.\d+)?$/m],
    ["tested WordPress version", /^Tested up to:\s*\d+(?:\.\d+)?$/m],
    ["stable tag matching the plugin version", new RegExp(`^Stable tag:\\s*${stableTag}$`, "m")],
    ["GPL license", /^License:\s*GPLv2 or later$/m],
    ["license URL", /^License URI:\s*https:\/\/\S+$/m],
  ];
  const missingHeaders = requiredHeaders
    .filter(([, pattern]) => !pattern.test(readme))
    .map(([label]) => label);
  const shortDescription = readme.match(/^License URI:[^\n]*\n\n([^\n]+)$/m)?.[1]?.trim();
  if (!shortDescription || shortDescription.length > 150) {
    missingHeaders.push("a short description of no more than 150 characters");
  }
  if (missingHeaders.length) {
    throw new Error(`The free core readme is missing valid WordPress.org metadata: ${missingHeaders.join(", ")}.`);
  }
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
  project: Pick<ReleaseProject, "slug" | "name" | "version" | "author" | "corePluginName">,
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
      const size = typeof rawContent === "string" ? `${rawContent.length} characters` : "not text";
      throw new Error(`Generated ${edition} source file "${filePath}" is too large or invalid (${size}).`);
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
      ? project.corePluginName || `${project.name} Core`
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
  if (edition === "core") validateWordPressOrgPhp(pluginSlug, normalizedFiles);

  const strings = (value: unknown, maxItems: number, maxLength: number) =>
    Array.isArray(value)
      ? value.map((item) => String(item).trim().slice(0, maxLength)).filter(Boolean).slice(0, maxItems)
      : [];
  const shortDescription = String(candidate?.shortDescription || "").trim().slice(0, edition === "core" ? 150 : 180);
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
    : edition === "core" ? project.corePluginName || `${project.name} Core` : project.name;
  const rawShortDescription = edition === "core"
    ? project.coreShortDescription || `${project.name} free core plugin`
    : project.shortDescription || `${project.name} paid plugin`;
  const shortDescription = cleanReadmeText(rawShortDescription).slice(0, edition === "core" ? 150 : 180);
  const description = edition === "core" ? project.coreDescription || project.description : project.description;
  const tags = (project.seoKeywords || "")
    .split(",")
    .map((tag) => tag.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().replace(/\s+/g, "-"))
    .filter((tag) => tag.length > 1 && tag.length <= 30)
    .slice(0, 5);
  const editionFeatures = edition === "core" ? project.coreFeatures || project.features : project.features;
  const featureList = Array.isArray(editionFeatures)
    ? editionFeatures.map((feature) => cleanReadmeText(String(feature))).filter(Boolean).slice(0, 12)
    : [];
  const releaseNotes = cleanReadmeText(project.releaseNotes || "Initial release.");
  const changelogItems = releaseNotes
    .split(/\n+|(?<=\.)\s+/)
    .map((item) => item.replace(/^[*-]\s*/, "").trim())
    .filter(Boolean);
  const readme = `=== ${cleanReadmeText(pluginName)} ===
Contributors: taskdrip
${tags.length ? `Tags: ${tags.join(", ")}` : "Tags: wordpress, productivity"}
Requires at least: 6.2
Requires PHP: 7.4
Tested up to: ${cleanHeaderValue(project.testedUpTo || DEFAULT_TESTED_UP_TO, 10)}
Stable tag: ${cleanHeaderValue(project.version, 30)}
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

${cleanReadmeText(shortDescription)}

== Description ==

${cleanReadmeText(description)}

${featureList.length ? `== Features ==

${featureList.map((feature) => `* ${feature}`).join("\n")}

  ` : ""}${edition === "paid" && project.slug === "coursebridge-learnpresswoo-connector" ? `== How it works ==

Map each WooCommerce product to one or more LearnPress courses. When WooCommerce confirms an eligible order, CourseBridge enrolls the account-holding buyer. Administrators can also assign existing WordPress users, set optional access expiry, and review purchase and enrollment history. Students open courses from WooCommerce My Account.

Contacts & Campaigns lists WordPress accounts and filters them by recorded purchases, LearnPress courses, or role. Marketing consent is tracked separately: only contacts with recorded checkout or administrator opt-in can receive campaigns. Administrators can opt in a purchaser individually, select purchasers across contact pages, or opt in every matching purchaser in the filtered audience. Use administrator opt-in only when each person has given permission. Compose with the WordPress visual or HTML editor, add media and links, personalize messages, and send through Resend or WordPress email. Test delivery before sending and review per-recipient logs.

` : ""}${edition === "paid" ? `== Email marketing and consent ==

Purchases do not silently subscribe customers. The optional checkout checkbox records marketing consent on the order and applies it to the account only after successful payment. Administrators may explicitly record opt-in for selected or filtered purchasers, but only when each person has given permission. Previous orders cannot override an unsubscribe; a later explicit checkout opt-in or administrator action is required. Campaign delivery checks consent again before sending, and each campaign includes an unsubscribe link.

` : ""}${edition === "premium" ? `== Requirements ==

Install and activate the free ${cleanReadmeText(project.name)} Core plugin first (slug: ${project.slug}).

` : edition === "paid" ? `== Requirements ==

This paid plugin requires WooCommerce and LearnPress, plus an active Taskdrip license.

` : ""}== Installation ==

1. In WordPress, open Plugins > Add New Plugin > Upload Plugin and choose this ZIP.
2. Activate WooCommerce and LearnPress, then activate ${edition === "premium" ? "the free core first and this premium add-on" : edition === "paid" ? "this paid plugin" : "the core plugin"}.
3. Review the plugin settings and permissions before enabling it on a live site.
${edition === "paid" ? `4. Open ${cleanReadmeText(pluginName)} → License to activate the purchased key, then configure ${cleanReadmeText(pluginName)} → Settings.\n` : ""}
4. Test the requested features on a staging WordPress site with representative data.

== Changelog ==

= ${cleanHeaderValue(project.version, 30)} =
${changelogItems.map((item) => `* ${item}`).join("\n")}
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
2. Deactivate and remove any older CourseBridge Premium add-on copies before installing this release.
3. Upload this single ZIP from WordPress Admin → Plugins → Add New Plugin → Upload Plugin and activate it.
4. Open ${cleanReadmeText(pluginName)} → License to activate the purchased license. Then use Dashboard, Course Assignments, and Settings from the ${cleanReadmeText(pluginName)} menu.
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
  const listingFiles = edition === "core"
    ? Object.fromEntries(Object.entries(sourceFiles).filter(([filePath]) => !/\.md$/i.test(filePath)))
    : sourceFiles;
  const files: Record<string, string> = {
    ...listingFiles,
    "readme.txt": readme,
    "LICENSE": `This plugin is licensed under the GNU General Public License, version 2 or later.
See https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
`,
  };
  if (edition !== "core") files["INSTALLATION-AND-TESTING.md"] = installation;
  if (edition === "core") {
    // The WordPress.org ZIP should contain only plugin code, readme.txt, and license.
    // Submission instructions and staging checklists stay in the admin UI, not in the directory package.
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
  if (edition === "core") {
    validateWordPressOrgPhp(project.slug, files);
    validateWordPressOrgReadme(files["readme.txt"], project.version);
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
        ? `${project.name} is locked. Open ${project.name} → License to activate or renew a valid key.`
        : `${project.name} Premium is locked. Open Settings → Plugin License to activate or renew a valid key.`,
    );
    const pluginDescriptionPhp = phpSingleQuoted(
      standalonePaid
        ? String(project.description || `Licensed standalone plugin: ${project.name}.`)
        : `Licensed premium add-on for ${project.name}.\n\n${project.description || ""}`,
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
      add_filter( 'upgrader_pre_download', array( __CLASS__, 'fresh_update_package' ), 10, 4 );
      add_action( 'upgrader_process_complete', array( __CLASS__, 'clear_update_state' ), 10, 2 );
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
        esc_html__( ${phpSingleQuoted(project.name)}, 'taskdrip' ),
        esc_html__( ${phpSingleQuoted(project.name)}, 'taskdrip' ),
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

    private static function get_update( $force_refresh = false ) {
      if ( ! self::is_licensed() ) { return false; }
      if ( ! $force_refresh ) {
        $cached = get_transient( self::update_transient() );
        if ( is_array( $cached ) ) { return $cached; }
      }
      $response = self::request( 'check-update' );
      if ( ! is_array( $response ) || empty( $response['valid'] ) ) { return false; }
      $update = ! empty( $response['update'] ) && is_array( $response['update'] ) ? $response['update'] : array();
      // Update download URLs are short-lived, so only cache version metadata
      // through a normal check. Downloads request a fresh package URL below.
      if ( ! $force_refresh ) {
        set_transient( self::update_transient(), $update, 6 * HOUR_IN_SECONDS );
      }
      return $update;
    }

    public static function inject_update( $transient ) {
      if ( ! is_object( $transient ) ) { return $transient; }
      if ( ! isset( $transient->response ) || ! is_array( $transient->response ) ) { $transient->response = array(); }
      if ( ! isset( $transient->no_update ) || ! is_array( $transient->no_update ) ) { $transient->no_update = array(); }
      if ( ! self::is_licensed() ) {
        unset( $transient->response[self::$plugin_file], $transient->no_update[self::$plugin_file] );
        return $transient;
      }
      $update = self::get_update();
      if (
        empty( $update['version'] ) ||
        empty( $update['package'] ) ||
        version_compare( sanitize_text_field( $update['version'] ), self::$version, '<=' )
      ) {
        // WordPress can retain an old response entry after an install. Remove
        // it when this release is already current so the update notice clears.
        unset( $transient->response[self::$plugin_file], $transient->no_update[self::$plugin_file] );
        return $transient;
      }
      unset( $transient->no_update[self::$plugin_file] );
      $transient->response[self::$plugin_file] = (object) array(
        'slug' => self::$plugin_slug,
        'plugin' => self::$plugin_file,
        'new_version' => sanitize_text_field( $update['version'] ),
        'url' => self::$api_base . '/my-plugins',
        'package' => esc_url_raw( $update['package'] ),
      );
      return $transient;
    }

    public static function fresh_update_package( $reply, $package, $upgrader, $hook_extra ) {
      if ( $reply !== false || ! is_array( $hook_extra ) ) { return $reply; }
      $plugins = array_filter( array_merge(
        array( $hook_extra['plugin'] ?? '' ),
        (array) ( $hook_extra['plugins'] ?? array() )
      ) );
      if ( ! in_array( self::$plugin_file, $plugins, true ) ) { return $reply; }
      if ( ! self::is_licensed() ) {
        return new WP_Error( 'taskdrip_license_invalid', __( 'Activate a valid CourseBridge license before installing plugin updates.', 'taskdrip' ) );
      }
      if ( ! function_exists( 'download_url' ) ) {
        return new WP_Error( 'taskdrip_download_unavailable', __( 'WordPress could not prepare the plugin update download. Try again from Plugins → Updates.', 'taskdrip' ) );
      }
      $update = self::get_update( true );
      if ( empty( $update['version'] ) || empty( $update['package'] ) || version_compare( sanitize_text_field( $update['version'] ), self::$version, '<=' ) ) {
        return new WP_Error( 'taskdrip_update_unavailable', __( 'No newer CourseBridge update is available for this license.', 'taskdrip' ) );
      }
      return download_url( esc_url_raw( $update['package'] ) );
    }

    public static function clear_update_state( $upgrader, $options ) {
      if ( ! is_array( $options ) || ( $options['action'] ?? '' ) !== 'update' || ( $options['type'] ?? '' ) !== 'plugin' ) { return; }
      $plugins = array_filter( array_merge(
        array( $options['plugin'] ?? '' ),
        (array) ( $options['plugins'] ?? array() )
      ) );
      if ( ! in_array( self::$plugin_file, $plugins, true ) ) { return; }
      delete_transient( self::update_transient() );
      delete_site_transient( 'update_plugins' );
      if ( function_exists( 'wp_clean_plugins_cache' ) ) { wp_clean_plugins_cache( true ); }
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
        'requires' => '6.2',
        'requires_php' => '7.4',
        'sections' => array(
          'description' => wpautop( esc_html( ${pluginDescriptionPhp} ) ),
          'features' => wpautop( esc_html__( 'Connect WooCommerce products with LearnPress courses; enroll buyers after confirmed payment; manage student access and expiry; search buyers and WordPress contacts; and create consent-based campaigns with the visual or HTML editor, media, links, personalization, Resend or WordPress email, unsubscribe links, delivery tests, and send logs.', 'taskdrip' ) ),
          'installation' => wpautop( esc_html__( ${phpSingleQuoted(`Install the ZIP from WordPress Admin → Plugins → Add New Plugin → Upload Plugin. Activate WooCommerce and LearnPress, activate ${project.name}, enter your Taskdrip license, map products to courses, and configure and test the email provider before sending a campaign.`)}, 'taskdrip' ) ),
          'changelog' => nl2br( esc_html( $update['changelog'] ?? '' ) ),
        ),
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
         echo '<div class="notice notice-error"><p>' . esc_html__( ${phpSingleQuoted(`Deactivate and remove the old CourseBridge Premium add-on before using ${project.name}.`)}, 'taskdrip' ) . '</p></div>';
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
