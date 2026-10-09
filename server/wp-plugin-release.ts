export type PluginEdition = "core" | "premium";

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
  const pluginName = edition === "premium" ? `${project.name} Premium` : `${project.name} Core`;
  const normalizedFiles = { ...files };
  delete normalizedFiles[rawMainFile];
  const normalizedMain = normalizePluginHeader(mainSource, {
    name: pluginName,
    description: edition === "premium"
      ? "Premium add-on for the free core plugin."
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
  const pluginName = edition === "premium" ? `${project.name} Premium` : `${project.name} Core`;
  const shortDescription = edition === "premium"
    ? project.shortDescription || `${project.name} premium add-on`
    : project.coreShortDescription || `${project.name} free core plugin`;
  const description = edition === "premium"
    ? project.description
    : project.coreDescription || project.description;
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

` : ""}== Installation ==

1. In WordPress, open Plugins > Add New Plugin > Upload Plugin and choose this ZIP.
2. Install and activate the ${edition === "premium" ? "core plugin first, then this premium add-on" : "core plugin"}.
3. Review the plugin settings and permissions before enabling it on a live site.
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
4. Confirm there are no PHP errors; test each feature and permission with admin and non-admin accounts.
5. Test activation, deactivation, upgrades, and uninstall cleanup with disposable site data.
6. Confirm the add-on is blocked with a clear admin notice if the core plugin is inactive.

The generated package is not a substitute for a human security or compatibility review.
`
    : `# Install and test ${pluginName}

1. Back up the site and use a staging WordPress site.
2. In WordPress, open Plugins > Add New Plugin > Upload Plugin and upload this ZIP.
3. Activate the plugin and check for PHP errors or unexpected database changes.
4. Test every advertised core feature with representative data and both admin and non-admin accounts.
5. Test activation, deactivation, upgrades, and uninstall cleanup with disposable site data.
6. Run the current WordPress Plugin Check and test every currently supported WordPress/PHP version.

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
  } else {
    files["TASKDRIP-RELEASE.md"] = `# Taskdrip premium release

This premium add-on is distributed through Taskdrip Shop. Customers must install the free core plugin (${project.slug}) first. Keep the core ZIP as a separate release for directory review; this add-on ZIP is not the WordPress.org directory package.

Review licensing, generated source, WordPress compatibility, security, and the included staging test checklist before publishing this product.
`;
  }
  return { folderSlug, files };
}
