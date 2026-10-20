import { randomUUID } from "node:crypto";
import { pool } from "./db";
import { getFreeDownloadFeaturedImage } from "../shared/free-download-artwork";

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
  details: string[];
  url: string;
  format: string;
  creator?: string;
  featured?: boolean;
  tags?: string[];
  categorySlug?: string;
  features: string[];
  systemRequirements: string;
  installationInstructions: string;
};

const curatedTools: CuratedTool[] = [
  {
    title: "ChatGPT",
    slug: "chatgpt-free-ai-assistant",
    description: "Use OpenAI’s ChatGPT free plan for writing, brainstorming, learning, research and everyday problem-solving. Usage limits and available features can change.",
    details: [
      "ChatGPT is an AI assistant for drafting and revising text, explaining unfamiliar topics, brainstorming ideas, analyzing supported files and helping with common research and planning tasks. The free plan makes it easy to try without a paid subscription.",
      "Free-plan limits, models and features may change or vary by location. Check important facts against reliable sources, avoid sharing sensitive information, and review OpenAI’s current terms and privacy controls before using it for work.",
    ],
    url: "https://chatgpt.com/",
    format: "Web app",
    creator: "OpenAI",
    featured: true,
    tags: ["free", "creator tools", "ai", "writing", "research"],
    categorySlug: "ai-tools",
    features: ["Draft, revise and summarize content", "Brainstorm, learn and work through questions", "Free plan available with changing usage limits"],
    systemRequirements: "A current web browser and an internet connection. An OpenAI account may be required for some features.",
    installationInstructions: "Open the official ChatGPT website, sign in or create an account, and review the current Free plan details. Check generated answers before relying on them and do not submit confidential information.",
  },
  {
    title: "Google Gemini",
    slug: "google-gemini-free-ai-assistant",
    description: "Try Google Gemini’s free AI assistant for writing, learning, planning and creative work. Feature access and usage limits vary by plan and region.",
    details: [
      "Gemini is Google’s AI assistant for questions, writing, brainstorming, learning and other everyday tasks. It is available in a browser, with companion apps and additional features depending on device, account and location.",
      "Google changes its plans and feature availability over time. Review current limits and privacy settings, verify important answers, and avoid sharing sensitive business or personal data unless you have reviewed the applicable terms.",
    ],
    url: "https://gemini.google.com/",
    format: "Web app",
    creator: "Google",
    featured: true,
    tags: ["free", "creator tools", "ai", "writing", "research"],
    categorySlug: "ai-tools",
    features: ["AI assistance for writing and everyday questions", "Support for learning, planning and creative ideas", "Free access available; limits and features can change"],
    systemRequirements: "A current web browser and an internet connection. Sign-in and feature availability depend on your Google account and region.",
    installationInstructions: "Open Google’s official Gemini website and sign in with an eligible Google account. Review the current plan details and settings before using Gemini with personal or work information.",
  },
  {
    title: "Claude",
    slug: "claude-free-ai-assistant",
    description: "Use Claude’s free plan for writing, analysis, coding help and research, with usage limits and features that may change.",
    details: [
      "Claude is Anthropic’s AI assistant for drafting, editing, analysis, coding help and working through complex questions. Its browser experience can help with long-form writing and tasks that benefit from structured explanations.",
      "Anthropic’s official site lists a free plan, but usage and features are limited and can change. Check important information independently, review privacy settings, and do not share sensitive data unless you understand the service’s current terms.",
    ],
    url: "https://claude.ai/",
    format: "Web app",
    creator: "Anthropic",
    tags: ["free", "creator tools", "ai", "writing", "coding"],
    categorySlug: "ai-tools",
    features: ["Writing, editing and analysis assistance", "Help with coding and data questions", "Free plan available with usage limits"],
    systemRequirements: "A current web browser and an internet connection. An Anthropic account is required to use the hosted assistant.",
    installationInstructions: "Open Claude’s official website, create an account or sign in, then review the free-plan limits. Verify generated answers and avoid entering confidential information.",
  },
  {
    title: "NotebookLM",
    slug: "google-notebooklm-research",
    description: "Organize your own sources and use NotebookLM to build source-grounded summaries, study guides and research notes.",
    details: [
      "NotebookLM is Google’s research and learning assistant built around sources you provide. Add supported documents or links to a notebook, then ask questions and create summaries, study guides and other learning materials grounded in those sources.",
      "Free access and limits depend on current account eligibility, region and plan. AI summaries can still contain mistakes; open the cited source material to verify important claims and check Google’s current privacy and product terms before uploading sensitive files.",
    ],
    url: "https://notebooklm.google/",
    format: "Web app",
    creator: "Google",
    featured: true,
    tags: ["free", "creator tools", "ai", "research", "education"],
    categorySlug: "ai-tools",
    features: ["Organize notebooks around your own research sources", "Generate source-grounded summaries and study aids", "Free access available with plan and usage limits"],
    systemRequirements: "A current web browser and an internet connection. Google account and regional eligibility requirements may apply.",
    installationInstructions: "Open the official NotebookLM website, sign in and create a notebook. Add sources you have permission to use, then verify responses against their citations.",
  },
  {
    title: "Canva",
    slug: "canva-free-design",
    description: "Create social graphics, presentations, short videos and other visual content with Canva's free plan. Some templates, assets and features require a paid plan.",
    details: [
      "Canva is a browser-based visual design workspace for creators, small teams and community organizations. Start with a blank canvas or adapt a template for social posts, presentations, flyers and short videos.",
      "Its free plan is useful for everyday design work, but premium templates, stock assets and some advanced features are paid. Check the label on each asset before exporting or publishing.",
    ],
    url: "https://www.canva.com/",
    format: "Web app",
    featured: true,
    features: ["Browser-based design editor", "Templates for social posts and presentations", "Free plan available; some content and features are paid"],
    systemRequirements: "A current web browser and an internet connection. A free Canva account is required to save and export designs.",
    installationInstructions: "Open Canva, create a free account or sign in, then choose a design type or template. Review the usage label for each asset before using it in a commercial project.",
  },
  {
    title: "Photopea",
    slug: "photopea-online-editor",
    description: "A browser-based image editor for photo adjustments, layered designs and common creative file formats. Free access is supported by advertising.",
    details: [
      "Photopea runs in a web browser and provides layer-based editing for photos, mockups and graphics. It can open and export common formats, including PSD, so it is useful when you need to make a quick edit without installing desktop software.",
      "The free editor is supported by advertising. Files can be edited locally in the browser; review Photopea's current privacy information and supported formats before handling sensitive work.",
    ],
    url: "https://www.photopea.com/",
    format: "Web app",
    featured: true,
    features: ["Runs in a web browser", "Layer-based image editing", "Free to use with ads"],
    systemRequirements: "A current desktop or mobile web browser. Larger files work best on a device with sufficient available memory.",
    installationInstructions: "Open the official editor and choose Open From Computer, or create a new document. Export a copy in the format required by your next tool.",
  },
  {
    title: "GIMP",
    slug: "gimp-image-editor",
    description: "A free, open-source image editor for photo retouching, compositing and original artwork. Download it from the official GIMP website.",
    details: [
      "GIMP is a free and open-source desktop image editor for photo retouching, image composition and original artwork. Its layers, masks, selection tools and extensible workflow make it a capable option for detailed image work.",
      "The official downloads page offers current installers and platform-specific information. GIMP is not a full replacement for every commercial prepress or RAW workflow, so check your file and color-management requirements before switching.",
    ],
    url: "https://www.gimp.org/downloads/",
    format: "Desktop software",
    creator: "GIMP team",
    features: ["Free and open source", "Available for Windows, macOS and Linux", "Photo editing and image composition"],
    systemRequirements: "Windows, macOS or GNU/Linux. Confirm the current release's supported operating systems and hardware on the official downloads page.",
    installationInstructions: "Choose your operating system on the official GIMP download page and install the current stable version. Avoid third-party installer mirrors.",
  },
  {
    title: "Inkscape",
    slug: "inkscape-vector-editor",
    description: "A free, open-source vector graphics editor for logos, icons, illustrations and scalable SVG artwork.",
    details: [
      "Inkscape is a free, open-source vector editor designed for scalable artwork. Use it to draw logos, icons and illustrations that remain crisp at different sizes, or edit SVG files for websites and print projects.",
      "The project publishes platform-specific installers and release notes. Check fonts, linked images and document settings when exchanging a design with a print shop or another graphics application.",
    ],
    url: "https://inkscape.org/release/",
    format: "Desktop software",
    creator: "Inkscape project",
    features: ["Free and open source", "Vector drawing and SVG editing", "Available for major desktop platforms"],
    systemRequirements: "Windows, macOS or Linux. Check the release page for current package options and platform support.",
    installationInstructions: "Select the current stable Inkscape release and the package for your operating system. The official project release page links to the available installers.",
  },
  {
    title: "OBS Studio",
    slug: "obs-studio-recording-streaming",
    description: "Record your screen or produce live streams with this free, open-source tool for Windows, macOS and Linux.",
    details: [
      "OBS Studio is a free, open-source application for screen recording and live streaming. Build scenes from display or window capture, cameras, images and text, then mix microphone and desktop audio.",
      "It is flexible enough for tutorials, online classes and live shows, but setup takes some experimentation. Test a short recording first and check your platform's current streaming and video requirements.",
    ],
    url: "https://obsproject.com/download",
    format: "Desktop software",
    creator: "OBS Project",
    featured: true,
    features: ["Free and open source", "Screen recording and live streaming", "Scene composition and audio mixing"],
    systemRequirements: "Windows, macOS or Linux. Encoding performance depends on your processor, graphics hardware and recording settings.",
    installationInstructions: "Download the installer for your operating system from the OBS Project. Run the auto-configuration wizard, set your audio devices and make a short test recording before going live.",
  },
  {
    title: "DaVinci Resolve",
    slug: "davinci-resolve-free-video-editor",
    description: "Download the free version of DaVinci Resolve for video editing, color correction, visual effects and audio post-production. Some advanced features are part of the paid Studio edition.",
    details: [
      "DaVinci Resolve combines timeline editing, color correction, visual effects and audio post-production in one desktop application. Its free edition is a substantial option for editing videos without a recurring subscription.",
      "Blackmagic Design also sells a Studio edition with additional capabilities. The application has demanding hardware requirements and requires a registration form to access downloads; check the current edition comparison and system requirements before installing.",
    ],
    url: "https://www.blackmagicdesign.com/products/davinciresolve",
    format: "Desktop software",
    creator: "Blackmagic Design",
    features: ["Free version available", "Video editing, color, effects and audio tools", "Windows, macOS and Linux downloads"],
    systemRequirements: "A supported 64-bit Windows, macOS or Linux system with suitable graphics hardware and ample memory. Review the current minimum requirements before downloading.",
    installationInstructions: "Open Blackmagic Design's official DaVinci Resolve page, choose the free version and your operating system, then complete the download form. Start a test project to confirm playback performance.",
  },
  {
    title: "Audacity",
    slug: "audacity-audio-editor",
    description: "Record, edit and export audio with Audacity, a free and open-source audio editor.",
    details: [
      "Audacity is a free, open-source desktop audio editor for recording, trimming, cleaning and mixing sound. It is useful for voiceovers, interviews, lessons and podcast editing.",
      "The official download page provides current installers and platform guidance. Keep a copy of your original recording before applying effects, and review plugin compatibility when extending the app.",
    ],
    url: "https://www.audacityteam.org/download/",
    format: "Desktop software",
    creator: "Audacity team",
    features: ["Free and open source", "Audio recording and editing", "Available for Windows, macOS and Linux"],
    systemRequirements: "Windows, macOS or Linux. A microphone is needed for recording; available disk space depends on recording length and quality.",
    installationInstructions: "Use the official Audacity download page to select your operating system. Install the current release, import or record audio, and export a copy in your preferred format.",
  },
  {
    title: "Blender",
    slug: "blender-3d-creation-suite",
    description: "A free, open-source 3D creation suite for modelling, animation, rendering and more.",
    details: [
      "Blender is a free, open-source 3D creation suite that brings modeling, sculpting, materials, animation, rendering, video editing and compositing into one application. It is suitable for both learning and production workflows.",
      "The official download page provides stable releases and platform options. Blender can be demanding for complex scenes, so check hardware guidance and save project backups as you learn.",
    ],
    url: "https://www.blender.org/download/",
    format: "Desktop software",
    creator: "Blender Foundation",
    features: ["Free and open source", "3D modelling, animation and rendering", "Available for Windows, macOS and Linux"],
    systemRequirements: "Windows, macOS or Linux. A capable graphics processor and sufficient memory improve work with larger scenes; see Blender's official requirements.",
    installationInstructions: "Download the current stable build for your operating system from Blender.org. Follow the official manual's first steps to learn navigation, modeling and saving projects.",
  },
  {
    title: "Google Trends",
    slug: "google-trends-research",
    description: "Explore how search interest changes over time and across locations to help plan content topics and audience research.",
    details: [
      "Google Trends is a free research tool for comparing relative Google Search interest across topics, locations and time periods. It can help creators spot seasonal patterns and find related queries to investigate.",
      "The charts show normalized interest rather than absolute search counts. Treat the results as directional research, not a measure of exact audience size or a guarantee that a topic will perform.",
    ],
    url: "https://trends.google.com/trends/",
    format: "Web app",
    creator: "Google",
    features: ["Compare search-interest patterns", "Explore by time and location", "Free web-based research tool"],
    systemRequirements: "A current web browser and an internet connection. Some views and features may vary by region.",
    installationInstructions: "Open Google Trends, enter a topic or search term, then adjust the region, date range and category. Compare related terms using the same filters.",
  },
  {
    title: "Pexels Free Photos & Videos",
    slug: "pexels-free-stock-media",
    description: "Find free stock photos and videos for creative projects. Review the current Pexels license and restrictions before publishing or redistributing media.",
    details: [
      "Pexels is a searchable library of stock photographs and videos contributed by its community. It can help creators find visual material for presentations, social posts and video projects.",
      "Free availability does not mean every use is unrestricted. Read the current Pexels license, check for identifiable people, trademarks or other rights, and do not redistribute the media as a standalone stock collection.",
    ],
    url: "https://www.pexels.com/",
    format: "Media library",
    creator: "Pexels",
    features: ["Free photo and video library", "Searchable stock-media collection", "Use subject to the current Pexels license"],
    systemRequirements: "A current web browser and an internet connection.",
    installationInstructions: "Search the official Pexels library and download the asset size you need. Review the current license and any additional rights relevant to your project before publishing.",
  },
  {
    title: "Krita",
    slug: "krita-digital-painting",
    description: "A free, open-source painting program for digital illustration, concept art, comics and texture work.",
    details: [
      "Krita is a free, open-source painting application built for artists. It includes brush engines, layers, stabilizers, animation tools and comic-page workflows for illustration and digital painting.",
      "The official project provides desktop downloads and documents supported systems. Krita is focused on painting rather than general-purpose photo retouching, so pair it with an image editor when your workflow needs one.",
    ],
    url: "https://krita.org/en/download/",
    format: "Desktop software",
    creator: "Krita Foundation",
    featured: true,
    features: ["Free and open source", "Brushes, layers and drawing assistants", "Illustration, comics and animation tools"],
    systemRequirements: "Windows, macOS or Linux. A pen tablet is optional but useful for pressure-sensitive drawing.",
    installationInstructions: "Choose your operating system on Krita's official download page, install the stable release and open the included brush presets to start painting.",
  },
  {
    title: "LibreOffice",
    slug: "libreoffice-office-suite",
    description: "A free, open-source office suite for writing documents, working with spreadsheets and creating presentations.",
    details: [
      "LibreOffice is a free, open-source desktop office suite with Writer for documents, Calc for spreadsheets, Impress for presentations, and additional tools for drawings and databases.",
      "It supports many common Microsoft Office formats, though complex files may not look exactly the same in every application. Review important documents after converting or sharing them.",
    ],
    url: "https://www.libreoffice.org/download/",
    format: "Desktop software",
    creator: "The Document Foundation",
    features: ["Free and open source", "Documents, spreadsheets and presentations", "Windows, macOS and Linux builds"],
    systemRequirements: "Windows, macOS or Linux. Check the official download page for supported versions, language packs and system details.",
    installationInstructions: "Choose your operating system and language on the official LibreOffice download page. Install the suite, then open or create a document in Writer, Calc or Impress.",
  },
  {
    title: "Penpot",
    slug: "penpot-ui-design",
    description: "A free, open-source design and prototyping workspace for interface designers and product teams.",
    details: [
      "Penpot is an open-source design and prototyping platform for user interfaces. Designers and developers can collaborate on layouts, reusable components and interactive prototypes in a browser.",
      "The hosted product is available online, and the project also offers self-hosting options. Team features and hosting choices can change, so check the official site for current account and deployment information.",
    ],
    url: "https://penpot.app/",
    format: "Web app",
    creator: "Penpot",
    featured: true,
    features: ["Free and open-source design platform", "Interface design and interactive prototypes", "Browser-based collaboration with developer handoff"],
    systemRequirements: "A current web browser and an internet connection for the hosted app. Self-hosting requires a supported server environment.",
    installationInstructions: "Create an account on Penpot's official site to use the hosted platform, or follow the project's self-hosting documentation if you manage your own server.",
  },
  {
    title: "VLC Media Player",
    slug: "vlc-media-player",
    description: "A free, open-source media player for common audio, video and streaming formats.",
    details: [
      "VLC is a free, open-source media player that handles a wide range of audio and video formats, discs and network streams. It is a practical utility for checking media files before editing or sharing them.",
      "VideoLAN publishes downloads for desktop and mobile platforms. Use VLC to play media you have the right to access; it is a player, not a source of licensed movies or music.",
    ],
    url: "https://www.videolan.org/vlc/",
    format: "Desktop software",
    creator: "VideoLAN",
    features: ["Free and open source", "Plays many common audio and video formats", "Available for desktop and mobile platforms"],
    systemRequirements: "Windows, macOS, Linux or a supported mobile platform. Choose the current installer for your device on VideoLAN's official site.",
    installationInstructions: "Select your platform on VideoLAN's official VLC page, install the current release and open a media file from your device.",
  },
  {
    title: "Google Fonts",
    slug: "google-fonts-library",
    description: "Browse and download open-source font families for websites, presentations and creative projects.",
    details: [
      "Google Fonts is a searchable library of font families that can be used in web and desktop design workflows. Preview typefaces, compare styles and download families for local use or embed them in a website.",
      "Each family has its own license information. Check the license shown for the specific font, include required notices and test readability and language coverage before publishing.",
    ],
    url: "https://fonts.google.com/",
    format: "Font library",
    creator: "Google",
    features: ["Search and preview font families", "Download fonts or use web embeds", "License information shown for each family"],
    systemRequirements: "A current web browser and an internet connection. Downloaded font files can be installed on supported desktop operating systems.",
    installationInstructions: "Choose a font family on Google Fonts, review its license, then use the download control or follow the provided web embed instructions.",
  },
  {
    title: "Super Productivity",
    slug: "super-productivity-planner",
    description: "A free, open-source personal task and time-tracking app for planning focused work.",
    details: [
      "Super Productivity is an open-source task planner that combines projects, time tracking, notes and a daily work plan. It is useful for freelancers and small teams that want a local-first personal productivity workflow.",
      "The project describes the app as free and open source. Available integrations and platform packages vary; review the current documentation and choose the installation method that suits your device.",
    ],
    url: "https://super-productivity.com/download/",
    format: "Desktop and web app",
    creator: "Super Productivity",
    features: ["Task and project planning", "Built-in time tracking and work summaries", "Open-source desktop, mobile and web options"],
    systemRequirements: "A supported desktop, Android device or modern web browser. Check the official download page for current package and platform support.",
    installationInstructions: "Choose a download or install option from the official site. Create a project, add tasks and use the timer to track focused work.",
  },
  {
    title: "Shotcut",
    slug: "shotcut-video-editor",
    description: "A free, open-source video editor for assembling, trimming and exporting video projects.",
    details: [
      "Shotcut is a free, open-source desktop video editor with a timeline, filters and support for many media formats. It is a straightforward option for cutting interviews, lessons and short-form videos.",
      "Editing performance depends on source footage and hardware. Use preview scaling or proxy workflows for demanding projects, and keep the original video files available while working.",
    ],
    url: "https://www.shotcut.org/download/",
    format: "Desktop software",
    creator: "Shotcut",
    features: ["Free and open source", "Timeline editing and video filters", "Windows, macOS and Linux downloads"],
    systemRequirements: "Windows, macOS or Linux. Video editing benefits from adequate memory and storage; review the project's current requirements.",
    installationInstructions: "Choose the official installer for your operating system, install Shotcut, then open a project and add video clips to the timeline.",
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
  const categoryIds = new Map<string, string>([[FREE_TOOLS_CATEGORY.slug, categoryId]]);
  for (const tool of curatedTools) {
    let toolCategoryId = categoryId;
    if (tool.categorySlug) {
      toolCategoryId = categoryIds.get(tool.categorySlug) || "";
      if (!toolCategoryId) {
        const found = await pool.query(
          "SELECT id FROM free_download_categories WHERE slug=$1 AND is_active=TRUE LIMIT 1",
          [tool.categorySlug],
        );
        toolCategoryId = found.rows[0]?.id;
        if (!toolCategoryId) throw new Error(`Required resource category "${tool.categorySlug}" is missing or inactive.`);
        categoryIds.set(tool.categorySlug, toolCategoryId);
      }
    }
    const result = await pool.query(
      `INSERT INTO free_download_items (
         id, title, slug, short_description, description_html, category_id, tags, thumbnail_url, format, creator,
         installation_instructions, system_requirements, features, external_download_url, external_demo_url,
         publication_status, is_featured, seo_title, seo_description, focus_keyword,
         og_title, og_description, og_image, published_at
       ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14,
          'published', $15, $16, $17, $18, $19, $20, $21, NOW()
       )
       ON CONFLICT (slug) DO UPDATE SET
         thumbnail_url=COALESCE(NULLIF(free_download_items.thumbnail_url,''), EXCLUDED.thumbnail_url),
         og_image=COALESCE(NULLIF(free_download_items.og_image,''), NULLIF(free_download_items.thumbnail_url,''), EXCLUDED.og_image),
         seo_title=CASE WHEN COALESCE(free_download_items.seo_title,'')='' OR free_download_items.seo_title=free_download_items.title THEN EXCLUDED.seo_title ELSE free_download_items.seo_title END,
         seo_description=CASE WHEN COALESCE(free_download_items.seo_description,'')='' OR free_download_items.seo_description=free_download_items.short_description THEN EXCLUDED.seo_description ELSE free_download_items.seo_description END,
         focus_keyword=CASE WHEN COALESCE(free_download_items.focus_keyword,'')='' OR free_download_items.focus_keyword=LOWER(free_download_items.title) THEN EXCLUDED.focus_keyword ELSE free_download_items.focus_keyword END,
         og_title=CASE WHEN COALESCE(free_download_items.og_title,'')='' OR free_download_items.og_title=free_download_items.title THEN EXCLUDED.og_title ELSE free_download_items.og_title END,
         og_description=CASE WHEN COALESCE(free_download_items.og_description,'')='' OR free_download_items.og_description=free_download_items.short_description THEN EXCLUDED.og_description ELSE free_download_items.og_description END
       RETURNING (xmax = 0) AS inserted`,
      [
        randomUUID(),
        tool.title,
        tool.slug,
        tool.description,
        `<p>${tool.details[0]}</p><p>${tool.details[1]}</p>`,
        toolCategoryId,
        tool.tags || ["free", "creator tools", tool.format.toLowerCase()],
        getFreeDownloadFeaturedImage(tool.title, tool.format, tool.categorySlug || FREE_TOOLS_CATEGORY.slug, tool.tags || []),
        tool.format,
        tool.creator || tool.title,
        tool.installationInstructions,
        tool.systemRequirements,
        tool.features,
        tool.url,
        Boolean(tool.featured),
        `${tool.title} Free Download & Details | Taskdrip`,
        `${tool.description} Find features, setup notes and official access on Taskdrip.`,
        `${tool.title.toLowerCase()} free download`,
        `${tool.title} free resource | Taskdrip`,
        tool.description,
        getFreeDownloadFeaturedImage(tool.title, tool.format, tool.categorySlug || FREE_TOOLS_CATEGORY.slug, tool.tags || []),
      ],
    );
    if (result.rows[0]?.inserted) added += 1;
  }
  return added;
}
