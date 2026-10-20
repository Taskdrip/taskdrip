const images = {
  research: "/images/free-downloads/resources/ai-research.jpg",
  design: "/images/free-downloads/resources/design-studio.jpg",
  media: "/images/free-downloads/resources/media-tools.jpg",
  productivity: "/images/free-downloads/resources/writing-planning.jpg",
  writing: "/images/free-downloads/resources/writing-planning.jpg",
  software: "/images/free-downloads/resources/software-workspace.jpg",
} as const;

export function getFreeDownloadFeaturedImage(
  title = "",
  format = "",
  category = "",
  tags: string[] = [],
) {
  const value = `${title} ${format} ${category} ${tags.join(" ")}`.toLowerCase();

  if (/\b(ai|artificial intelligence|chatgpt|gemini|claude|notebooklm|research|trends|search)\b/.test(value)) {
    return images.research;
  }
  if (/\b(design|illustrat|paint|draw|graphic|font|typography|canva|penpot|inkscape|krita|gimp|photopea|blender)\b/.test(value)) {
    return images.design;
  }
  if (/\b(video|film|audio|sound|music|media|stock|photo|camera|vlc|shotcut|obs studio|resolve|audacity|pexels)\b/.test(value)) {
    return images.media;
  }
  if (/\b(task|project|productivity|planner|calendar|time tracking|office|spreadsheet|document|presentation)\b/.test(value)) {
    return images.productivity;
  }
  if (/\b(writing|writer|book|ebook|reading|lesson|study|education|pdf|resource)\b/.test(value)) {
    return images.writing;
  }
  return images.software;
}
