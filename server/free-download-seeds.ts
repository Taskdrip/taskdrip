import { randomUUID } from "node:crypto";
import { pool } from "./db";

const FREE_TOOLS_CATEGORY = {
  id: "free-creator-tools",
  name: "Free Creator Tools",
  slug: "free-creator-tools",
  description: "Trusted free and open-source tools for creating, editing, researching and sharing.",
};

type CuratedTool = {
  title: string;
  slug: string;
  description: string;
  url: string;
  format: string;
  creator?: string;
  featured?: boolean;
  features: string[];
};

const curatedTools: CuratedTool[] = [
  {
    title: "Canva",
    slug: "canva-free-design",
    description: "Create social graphics, presentations, short videos and other visual content with Canva's free plan. Some templates, assets and features require a paid plan.",
    url: "https://www.canva.com/",
    format: "Web app",
    featured: true,
    features: ["Browser-based design editor", "Templates for social posts and presentations", "Free plan available; some content and features are paid"],
  },
  {
    title: "Photopea",
    slug: "photopea-online-editor",
    description: "A browser-based image editor for photo adjustments, layered designs and common creative file formats. Free access is supported by advertising.",
    url: "https://www.photopea.com/",
    format: "Web app",
    featured: true,
    features: ["Runs in a web browser", "Layer-based image editing", "Free to use with ads"],
  },
  {
    title: "GIMP",
    slug: "gimp-image-editor",
    description: "A free, open-source image editor for photo retouching, compositing and original artwork. Download it from the official GIMP website.",
    url: "https://www.gimp.org/downloads/",
    format: "Desktop software",
    creator: "GIMP team",
    features: ["Free and open source", "Available for Windows, macOS and Linux", "Photo editing and image composition"],
  },
  {
    title: "Inkscape",
    slug: "inkscape-vector-editor",
    description: "A free, open-source vector graphics editor for logos, icons, illustrations and scalable SVG artwork.",
    url: "https://inkscape.org/release/",
    format: "Desktop software",
    creator: "Inkscape project",
    features: ["Free and open source", "Vector drawing and SVG editing", "Available for major desktop platforms"],
  },
  {
    title: "OBS Studio",
    slug: "obs-studio-recording-streaming",
    description: "Record your screen or produce live streams with this free, open-source tool for Windows, macOS and Linux.",
    url: "https://obsproject.com/download",
    format: "Desktop software",
    creator: "OBS Project",
    featured: true,
    features: ["Free and open source", "Screen recording and live streaming", "Scene composition and audio mixing"],
  },
  {
    title: "DaVinci Resolve",
    slug: "davinci-resolve-free-video-editor",
    description: "Download the free version of DaVinci Resolve for video editing, color correction, visual effects and audio post-production. Some advanced features are part of the paid Studio edition.",
    url: "https://www.blackmagicdesign.com/products/davinciresolve",
    format: "Desktop software",
    creator: "Blackmagic Design",
    features: ["Free version available", "Video editing, color, effects and audio tools", "Windows, macOS and Linux downloads"],
  },
  {
    title: "Audacity",
    slug: "audacity-audio-editor",
    description: "Record, edit and export audio with Audacity, a free and open-source audio editor.",
    url: "https://www.audacityteam.org/download/",
    format: "Desktop software",
    creator: "Audacity team",
    features: ["Free and open source", "Audio recording and editing", "Available for Windows, macOS and Linux"],
  },
  {
    title: "Blender",
    slug: "blender-3d-creation-suite",
    description: "A free, open-source 3D creation suite for modelling, animation, rendering and more.",
    url: "https://www.blender.org/download/",
    format: "Desktop software",
    creator: "Blender Foundation",
    features: ["Free and open source", "3D modelling, animation and rendering", "Available for Windows, macOS and Linux"],
  },
  {
    title: "Google Trends",
    slug: "google-trends-research",
    description: "Explore how search interest changes over time and across locations to help plan content topics and audience research.",
    url: "https://trends.google.com/trends/",
    format: "Web app",
    creator: "Google",
    features: ["Compare search-interest patterns", "Explore by time and location", "Free web-based research tool"],
  },
  {
    title: "Pexels Free Photos & Videos",
    slug: "pexels-free-stock-media",
    description: "Find free stock photos and videos for creative projects. Review the current Pexels license and restrictions before publishing or redistributing media.",
    url: "https://www.pexels.com/",
    format: "Media library",
    creator: "Pexels",
    features: ["Free photo and video library", "Searchable stock-media collection", "Use subject to the current Pexels license"],
  },
];

export async function seedFreeCreatorTools(): Promise<number> {
  const category = await pool.query(
    `INSERT INTO free_download_categories (id, name, slug, description, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (slug) DO NOTHING
     RETURNING id`,
    [FREE_TOOLS_CATEGORY.id, FREE_TOOLS_CATEGORY.name, FREE_TOOLS_CATEGORY.slug, FREE_TOOLS_CATEGORY.description],
  );
  const categoryId = category.rows[0]?.id || (await pool.query(
    "SELECT id FROM free_download_categories WHERE slug=$1 LIMIT 1",
    [FREE_TOOLS_CATEGORY.slug],
  )).rows[0]?.id;
  if (!categoryId) throw new Error("The Free Creator Tools category could not be created.");

  let added = 0;
  for (const tool of curatedTools) {
    const result = await pool.query(
      `INSERT INTO free_download_items (
         id, title, slug, short_description, description_html, category_id, tags, format, creator,
         installation_instructions, features, external_download_url, external_demo_url,
         publication_status, is_featured, seo_title, seo_description, focus_keyword,
         og_title, og_description, published_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12,
         'published', $13, $2, $4, $14, $2, $4, NOW()
       )
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [
        randomUUID(),
        tool.title,
        tool.slug,
        tool.description,
        `<p>${tool.description}</p>`,
        categoryId,
        ["free", "creator tools", tool.format.toLowerCase()],
        tool.format,
        tool.creator || tool.title,
        "Open the official website to use the tool or download its installer. Free plans, software requirements and licenses can change, so check the provider's current terms before use.",
        tool.features,
        tool.url,
        Boolean(tool.featured),
        tool.title.toLowerCase(),
      ],
    );
    added += result.rowCount || 0;
  }
  return added;
}
