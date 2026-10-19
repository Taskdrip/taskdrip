WITH curated(slug, official_url, detail_html, system_requirements, installation_instructions) AS (
  VALUES
    (
      'canva-free-design',
      'https://www.canva.com/',
      $detail$<p>Canva is a browser-based visual design workspace for creators, small teams and community organizations. Start with a blank canvas or adapt a template for social posts, presentations, flyers and short videos.</p><p>Its free plan is useful for everyday design work, but premium templates, stock assets and some advanced features are paid. Check the label on each asset before exporting or publishing.</p><h2>What you can do</h2><ul><li>Design social posts, presentations and flyers</li><li>Use free templates and browser-based editing tools</li><li>Collaborate and export designs from a Canva account</li></ul><h2>Get started</h2><p>Open Canva, create a free account or sign in, then choose a design type or template. Review the usage label for each asset before using it in a commercial project.</p><p><strong>Free access:</strong> Check Canva’s current plan and asset terms; some content and features are paid.</p>$detail$,
      'A current web browser and an internet connection. A free Canva account is required to save and export designs.',
      'Open Canva, create a free account or sign in, then choose a design type or template. Review the usage label for each asset before using it in a commercial project.'
    ),
    (
      'photopea-online-editor',
      'https://www.photopea.com/',
      $detail$<p>Photopea runs in a web browser and provides layer-based editing for photos, mockups and graphics. It can open and export common formats, including PSD, so it is useful for quick edits without installing desktop software.</p><p>The free editor is supported by advertising. Files can be edited locally in the browser; review Photopea’s current privacy information and supported formats before handling sensitive work.</p><h2>What you can do</h2><ul><li>Edit images with layers, masks and selections</li><li>Open and export common creative file formats</li><li>Work in a browser without a desktop installation</li></ul><h2>Get started</h2><p>Open the official editor and choose Open From Computer, or create a new document. Export a copy in the format required by your next tool.</p><p><strong>Free access:</strong> The free editor is supported by ads; check the current terms for any optional paid plan.</p>$detail$,
      'A current desktop or mobile web browser. Larger files work best on a device with sufficient available memory.',
      'Open the official editor and choose Open From Computer, or create a new document. Export a copy in the format required by your next tool.'
    ),
    (
      'gimp-image-editor',
      'https://www.gimp.org/downloads/',
      $detail$<p>GIMP is a free and open-source desktop image editor for photo retouching, image composition and original artwork. Its layers, masks, selection tools and extensible workflow make it a capable option for detailed image work.</p><p>The official downloads page offers current installers and platform-specific information. GIMP is not a full replacement for every commercial prepress or RAW workflow, so check your file and color-management requirements before switching.</p><h2>What you can do</h2><ul><li>Retouch photos and compose layered images</li><li>Create original raster artwork</li><li>Extend workflows with community plugins</li></ul><h2>Get started</h2><p>Choose your operating system on the official GIMP download page and install the current stable version. Avoid third-party installer mirrors.</p><p><strong>Free access:</strong> GIMP is free and open source; review the project’s license and release notes.</p>$detail$,
      'Windows, macOS or GNU/Linux. Confirm the current release’s supported operating systems and hardware on the official downloads page.',
      'Choose your operating system on the official GIMP download page and install the current stable version. Avoid third-party installer mirrors.'
    ),
    (
      'inkscape-vector-editor',
      'https://inkscape.org/release/',
      $detail$<p>Inkscape is a free, open-source vector editor designed for scalable artwork. Use it to draw logos, icons and illustrations that remain crisp at different sizes, or edit SVG files for websites and print projects.</p><p>The project publishes platform-specific installers and release notes. Check fonts, linked images and document settings when exchanging a design with a print shop or another graphics application.</p><h2>What you can do</h2><ul><li>Draw and edit scalable vector artwork</li><li>Create logos, icons and illustrations</li><li>Open and export SVG graphics</li></ul><h2>Get started</h2><p>Select the current stable Inkscape release and the package for your operating system. The official project release page links to available installers.</p><p><strong>Free access:</strong> Inkscape is free and open source; check the project’s license and release notes.</p>$detail$,
      'Windows, macOS or Linux. Check the release page for current package options and platform support.',
      'Select the current stable Inkscape release and the package for your operating system. The official project release page links to available installers.'
    ),
    (
      'obs-studio-recording-streaming',
      'https://obsproject.com/download',
      $detail$<p>OBS Studio is a free, open-source application for screen recording and live streaming. Build scenes from display or window capture, cameras, images and text, then mix microphone and desktop audio.</p><p>It is flexible enough for tutorials, online classes and live shows, but setup takes some experimentation. Test a short recording first and check your platform’s current streaming and video requirements.</p><h2>What you can do</h2><ul><li>Record a screen, window or camera</li><li>Compose scenes and mix audio sources</li><li>Stream to supported services or save local recordings</li></ul><h2>Get started</h2><p>Download the installer for your operating system from the OBS Project. Run the auto-configuration wizard, set your audio devices and make a short test recording before going live.</p><p><strong>Free access:</strong> OBS Studio is free and open source.</p>$detail$,
      'Windows, macOS or Linux. Encoding performance depends on your processor, graphics hardware and recording settings.',
      'Download the installer for your operating system from the OBS Project. Run the auto-configuration wizard, set your audio devices and make a short test recording before going live.'
    ),
    (
      'davinci-resolve-free-video-editor',
      'https://www.blackmagicdesign.com/products/davinciresolve',
      $detail$<p>DaVinci Resolve combines timeline editing, color correction, visual effects and audio post-production in one desktop application. Its free edition is a substantial option for editing videos without a recurring subscription.</p><p>Blackmagic Design also sells a Studio edition with additional capabilities. The application has demanding hardware requirements and requires a registration form to access downloads; check the current edition comparison and system requirements before installing.</p><h2>What you can do</h2><ul><li>Edit video on a multi-track timeline</li><li>Color-correct footage and add visual effects</li><li>Mix and finish audio in the same application</li></ul><h2>Get started</h2><p>Open Blackmagic Design’s official DaVinci Resolve page, choose the free version and your operating system, then complete the download form. Start a test project to confirm playback performance.</p><p><strong>Free access:</strong> The free version is available; some advanced features are reserved for the paid Studio edition.</p>$detail$,
      'A supported 64-bit Windows, macOS or Linux system with suitable graphics hardware and ample memory. Review the current minimum requirements before downloading.',
      'Open Blackmagic Design’s official DaVinci Resolve page, choose the free version and your operating system, then complete the download form. Start a test project to confirm playback performance.'
    ),
    (
      'audacity-audio-editor',
      'https://www.audacityteam.org/download/',
      $detail$<p>Audacity is a free, open-source desktop audio editor for recording, trimming, cleaning and mixing sound. It is useful for voiceovers, interviews, lessons and podcast editing.</p><p>The official download page provides current installers and platform guidance. Keep a copy of your original recording before applying effects, and review plugin compatibility when extending the app.</p><h2>What you can do</h2><ul><li>Record and edit audio tracks</li><li>Trim, arrange and apply effects to sound</li><li>Export a finished recording in a common audio format</li></ul><h2>Get started</h2><p>Use the official Audacity download page to select your operating system. Install the current release, import or record audio, and export a copy in your preferred format.</p><p><strong>Free access:</strong> Audacity is free and open source.</p>$detail$,
      'Windows, macOS or Linux. A microphone is needed for recording; available disk space depends on recording length and quality.',
      'Use the official Audacity download page to select your operating system. Install the current release, import or record audio, and export a copy in your preferred format.'
    ),
    (
      'blender-3d-creation-suite',
      'https://www.blender.org/download/',
      $detail$<p>Blender is a free, open-source 3D creation suite that brings modeling, sculpting, materials, animation, rendering, video editing and compositing into one application. It is suitable for both learning and production workflows.</p><p>The official download page provides stable releases and platform options. Blender can be demanding for complex scenes, so check hardware guidance and save project backups as you learn.</p><h2>What you can do</h2><ul><li>Model and sculpt 3D objects</li><li>Animate scenes and render images or video</li><li>Use built-in compositing and video tools</li></ul><h2>Get started</h2><p>Download the current stable build for your operating system from Blender.org. Follow the official manual’s first steps to learn navigation, modeling and saving projects.</p><p><strong>Free access:</strong> Blender is free and open source.</p>$detail$,
      'Windows, macOS or Linux. A capable graphics processor and sufficient memory improve work with larger scenes; see Blender’s official requirements.',
      'Download the current stable build for your operating system from Blender.org. Follow the official manual’s first steps to learn navigation, modeling and saving projects.'
    ),
    (
      'google-trends-research',
      'https://trends.google.com/trends/',
      $detail$<p>Google Trends is a free research tool for comparing relative Google Search interest across topics, locations and time periods. It can help creators spot seasonal patterns and find related queries to investigate.</p><p>The charts show normalized interest rather than absolute search counts. Treat the results as directional research, not a measure of exact audience size or a guarantee that a topic will perform.</p><h2>What you can do</h2><ul><li>Compare interest in multiple search terms</li><li>Explore patterns by region and time period</li><li>Find related topics and queries to research</li></ul><h2>Get started</h2><p>Open Google Trends, enter a topic or search term, then adjust the region, date range and category. Compare related terms using the same filters.</p><p><strong>Free access:</strong> Google Trends is a free web-based research tool.</p>$detail$,
      'A current web browser and an internet connection. Some views and features may vary by region.',
      'Open Google Trends, enter a topic or search term, then adjust the region, date range and category. Compare related terms using the same filters.'
    ),
    (
      'pexels-free-stock-media',
      'https://www.pexels.com/',
      $detail$<p>Pexels is a searchable library of stock photographs and videos contributed by its community. It can help creators find visual material for presentations, social posts and video projects.</p><p>Free availability does not mean every use is unrestricted. Read the current Pexels license, check for identifiable people, trademarks or other rights, and do not redistribute the media as a standalone stock collection.</p><h2>What you can do</h2><ul><li>Search and download stock photographs and videos</li><li>Find visual material for creative projects</li><li>Review contributor and license details before publishing</li></ul><h2>Get started</h2><p>Search the official Pexels library and download the asset size you need. Review the current license and any additional rights relevant to your project before publishing.</p><p><strong>Free access:</strong> Use is subject to the current Pexels license and restrictions.</p>$detail$,
      'A current web browser and an internet connection.',
      'Search the official Pexels library and download the asset size you need. Review the current license and any additional rights relevant to your project before publishing.'
    )
)
UPDATE free_download_items AS item
SET description_html = curated.detail_html,
    system_requirements = CASE
      WHEN COALESCE(item.system_requirements, '') = '' THEN curated.system_requirements
      ELSE item.system_requirements
    END,
    installation_instructions = CASE
      WHEN item.installation_instructions = 'Open the official website to use the tool or download its installer. Free plans, software requirements and licenses can change, so check the provider''s current terms before use.'
        THEN curated.installation_instructions
      ELSE item.installation_instructions
    END,
    updated_at = NOW()
FROM curated
WHERE item.slug = curated.slug
  AND item.external_download_url = curated.official_url
  AND item.external_demo_url = curated.official_url
  AND item.tags @> ARRAY['free', 'creator tools']::text[]
  AND item.description_html = '<p>' || item.short_description || '</p>';
