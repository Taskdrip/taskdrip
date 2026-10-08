import { nanoid } from "nanoid";
import type { EbookDesignDocument, EbookDesignPage } from "@shared/ebook-design";
import { DEFAULT_EBOOK_THEME } from "@shared/ebook-design";

type Story = {
  title: string;
  reference: string;
  scene: string;
  story: string;
  parentGuide: string;
  coloringPrompt: string;
};

const stories: Story[] = [
  {
    title: "God Makes a Wonderful World",
    reference: "Genesis 1:1–2:3",
    scene: "creation",
    story: "Before the world had a sunrise or a song, God began creating. Light filled the darkness. God made the wide sky, dry land, sparkling seas, green plants, and fruit trees. The sun warmed the day, and the moon and stars brightened the night. Birds flew overhead and fish swam below. Animals of every kind walked, hopped, and crawled across the land. God made people, too, and gave them a beautiful world to care for. When creation was finished, God looked at it all and called it good. Every flower, creature, and person mattered.",
    parentGuide: "Tell your child that creation is the Bible’s way of describing the beginning of the world and our responsibility to care for it. Ask: Which part of nature makes you curious? How can our family care for a living thing this week?",
    coloringPrompt: "Color the sun, garden, fish, and growing plants.",
  },
  {
    title: "Noah Builds an Ark",
    reference: "Genesis 6:9–9:17",
    scene: "noah",
    story: "Noah listened carefully when God asked him to build a very large boat called an ark. His family helped gather food and make room for animals. Soon pairs of animals came aboard—some waddled, some trotted, and some flew. Rain fell for many days, but the ark carried everyone safely over the water. At last the rain stopped. Noah sent out a bird, and later it returned with a fresh leaf. The family stepped onto dry land and thanked God. A rainbow appeared in the sky as a sign of God’s promise. Noah’s story reminds families to listen, help one another, and keep hope.",
    parentGuide: "Point to the rainbow and explain that the story remembers God’s promise to Noah. Ask: Which animal would you have liked to welcome aboard? What is one promise our family works hard to keep?",
    coloringPrompt: "Add colors to the ark, the animal friends, and the rainbow.",
  },
  {
    title: "Moses Leads the People to Freedom",
    reference: "Exodus 14:5–31",
    scene: "moses",
    story: "Moses led the Israelites away from slavery in Egypt. Their journey brought them to the sea, and the people were frightened when they saw the Egyptians coming behind them. Moses told them to be brave and trust God. The sea opened, making a path through the water. The people crossed together on dry ground, with water standing on each side like tall walls. When everyone reached safety, they celebrated that they were free. Moses had helped his people move toward a new beginning. The story is about courage, hope, and staying together when a difficult journey feels long.",
    parentGuide: "Explain that this Bible story is about the Israelites escaping slavery and finding freedom. Ask: What helps you feel brave when something is hard? Who can help our family when we need support?",
    coloringPrompt: "Color the safe path, the tall waves, and Moses’ robe.",
  },
  {
    title: "David Cares for His Sheep",
    reference: "1 Samuel 16:1–13; 17:32–50",
    scene: "david",
    story: "David was a young shepherd who spent long days caring for his family’s sheep. He led them to grass, watched over them, and played music on his harp. One day, David heard a boastful warrior frightening the people of Israel. David remembered how God had helped him while he cared for his sheep. Instead of wearing heavy armor, he went forward with a sling and great courage. David trusted God, and the frightened people found hope again. The story shows that being young does not mean you are unable to help. Care, courage, and faithfulness can make a real difference.",
    parentGuide: "The Bible’s David and Goliath story is about courage and trust, not celebrating violence. Ask: When have you helped someone who felt afraid? Which small act of care can you do today?",
    coloringPrompt: "Color David, his sheep, and the rolling hills.",
  },
  {
    title: "Daniel and the Lions",
    reference: "Daniel 6:1–28",
    scene: "daniel",
    story: "Daniel worked as a trusted helper in the king’s court. Some people were jealous and tried to get him into trouble because he prayed to God. Daniel kept praying, even when the king’s new rule made it difficult. He was placed in a den with lions. The king worried through the night, but in the morning Daniel was safe. Daniel explained that God had protected him. The king was amazed and praised God. This story remembers Daniel’s steady faith and the comfort he found in prayer. It also reminds us to treat others fairly, even when it would be easier to follow an unkind crowd.",
    parentGuide: "Some Bible stories describe danger in a way that may feel intense to young children. Emphasize that Daniel was safe in this story and that children should tell a trusted adult when they feel afraid. Ask: What makes you feel peaceful?",
    coloringPrompt: "Color Daniel and the gentle lions beside the den.",
  },
  {
    title: "Jonah Learns to Listen",
    reference: "Jonah 1:1–4:11",
    scene: "jonah",
    story: "God asked Jonah to take a message to the people of Nineveh. Jonah did not want to go, so he boarded a boat traveling the other way. A great storm shook the boat, and Jonah was thrown into the sea. God sent a large fish to keep him safe. Jonah prayed from inside the fish and had time to think. After three days, the fish brought him to dry land. This time Jonah went to Nineveh and shared God’s message. The people listened and chose a better way. Jonah learned that God cared for all kinds of people—and Jonah still had more to learn about showing mercy.",
    parentGuide: "The book of Jonah invites readers to think about second chances and compassion. Ask: Have you ever changed your mind and tried again? How can we show kindness to someone who is different from us?",
    coloringPrompt: "Color Jonah, the friendly-looking great fish, and the waves.",
  },
  {
    title: "Ruth and Naomi Stay Together",
    reference: "Ruth 1:1–4:17",
    scene: "ruth",
    story: "Ruth and her mother-in-law Naomi faced a very difficult time after losing people they loved. Naomi planned to return to her home in Bethlehem, but Ruth chose to go with her. In Bethlehem, Ruth gathered leftover grain so the two of them would have food. Boaz, the owner of the field, noticed Ruth’s hard work and made sure she was safe. Naomi helped Ruth understand what was happening, and the family began to find hope again. Ruth’s story celebrates loyalty, generosity, and the way people can care for one another. It also reminds us that small acts of kindness can help someone through a hard season.",
    parentGuide: "Families grieve in different ways; let your child guide this conversation. Ask: Who helps you when you miss someone? What is one generous thing we could do together for a neighbor?",
    coloringPrompt: "Color Ruth and Naomi among the grain plants.",
  },
  {
    title: "Esther Speaks Up",
    reference: "Esther 2:5–8:17",
    scene: "esther",
    story: "Esther became queen in a faraway kingdom. When she learned that her people were in danger, she felt afraid—but she also knew she could try to help. Esther asked her friends and family to pray, then she made a careful plan to speak with the king. She told him honestly what was happening and asked him to protect her people. The king listened. Esther’s courage helped save many lives. Her story reminds readers that speaking up for someone who is being treated unfairly matters. Brave actions do not always feel easy; sometimes courage means asking trusted people for help before taking the next step.",
    parentGuide: "Talk about using a safe voice and seeking trusted adult help when someone may be in danger. Ask: Who are the adults you trust? How can you stand up kindly when someone is left out?",
    coloringPrompt: "Color Esther’s crown, the palace, and the bright stars.",
  },
  {
    title: "A Night in Bethlehem",
    reference: "Luke 2:1–20; Matthew 1:18–25",
    scene: "nativity",
    story: "Mary and Joseph traveled to Bethlehem, where Jesus was born. They wrapped the baby warmly and laid him in a manger because there was no guest room for them. Nearby, shepherds were watching their sheep at night. Angels brought them good news, and the shepherds hurried to find the family. They saw Mary, Joseph, and the baby just as they had been told. Then the shepherds shared the news with others. The Christmas story begins in a humble place, with a newborn welcomed by ordinary people. Christians celebrate Jesus’ birth as a sign of hope, peace, and God’s love for the world.",
    parentGuide: "Families tell the Christmas story in different ways. Name each person in the picture together. Ask: How can we welcome a new person into our family, school, or community?",
    coloringPrompt: "Color the Bethlehem star, manger, shepherds, and animals.",
  },
  {
    title: "Lunch for a Very Big Crowd",
    reference: "Matthew 14:13–21; Mark 6:30–44; Luke 9:10–17; John 6:1–14",
    scene: "feeding",
    story: "A huge crowd came to hear Jesus teach. When evening arrived, the people were hungry and far from home. A child had five small loaves of bread and two fish. Jesus thanked God for the food and asked the helpers to share it. The disciples began passing the bread and fish from person to person. Everyone ate until they were full, and there was still food left over. The disciples gathered the extra pieces in baskets. The story shows a small lunch becoming a generous meal when people share. It reminds readers that everyone, including children, can offer something helpful to a community.",
    parentGuide: "Ask what sharing looks like when there is not enough for everyone. Talk about sharing fairly, and include a practical example such as preparing food or supplies for someone in your community.",
    coloringPrompt: "Color the baskets, loaves, fish, and the people sharing a meal.",
  },
  {
    title: "The Good Samaritan Helps",
    reference: "Luke 10:25–37",
    scene: "samaritan",
    story: "Jesus told a story about a traveler who was hurt on the road. A priest and another traveler passed by, but neither stopped. Then a Samaritan—a person from a group often treated as an outsider—paused to help. He cared for the injured traveler, lifted him onto his animal, and took him somewhere safe. He even paid for the traveler’s care. Jesus asked which person had acted like a neighbor. The answer was the one who showed mercy. The story teaches that a neighbor is someone we choose to treat with kindness. It encourages us to notice people who need help and to find a safe way to help them.",
    parentGuide: "Make safety part of the lesson: children should get a trusted adult instead of approaching an unsafe situation alone. Ask: Who could you tell if someone nearby needed help?",
    coloringPrompt: "Color the travelers, donkey, and the road to safety.",
  },
  {
    title: "A New Morning",
    reference: "Luke 23:44–24:12; John 20:1–18",
    scene: "resurrection",
    story: "The friends of Jesus were very sad after he died. Early one morning, some women went to the tomb where he had been laid. The stone at the entrance had been moved, and the tomb was empty. They heard the good news that Jesus was alive. The women hurried to tell the others. At first, some people did not understand what had happened, but hope began to grow as they shared the news. Christians remember this as the story of Jesus’ resurrection and celebrate it at Easter. The empty tomb is a sign of new life and hope. When sadness feels heavy, families can remember that it is okay to seek comfort and support.",
    parentGuide: "This story touches on death and grief. Explain it using words that fit your family’s beliefs and your child’s age. Reassure your child they can ask questions or talk about their feelings with a trusted adult.",
    coloringPrompt: "Color the garden, flowers, sunrise, and open tomb.",
  },
];

function text(id: string, role: Extract<EbookDesignPage["blocks"][number], { kind: "text" }>["role"], value: string) {
  return { id, kind: "text" as const, role, text: value };
}

function art(id: string, scene: string, altText: string, artMode: "line" | "color" = "line") {
  return {
    id,
    kind: "art" as const,
    motif: "bible-scene" as const,
    scene,
    artMode,
    altText,
    brief: artMode === "line" ? "Original black-line illustration for young artists to color." : "Original, colorful storybook illustration.",
  };
}

function page(kind: EbookDesignPage["kind"], title: string, blocks: EbookDesignPage["blocks"], chapterId?: string): EbookDesignPage {
  return { id: nanoid(), kind, title, chapterId, blocks };
}

export function createChildrenBibleColoringBook() {
  const chapters = stories.map((story) => ({
    id: nanoid(),
    title: story.title,
    content: `${story.reference}\n\n${story.story}\n\nTalk together\n${story.parentGuide}\n\nColoring invitation\n${story.coloringPrompt}`,
  }));
  const pages: EbookDesignPage[] = [
    page("cover", "Front cover", [
      art("cover-family", "storybook-cover", "A welcoming Bible storybook family with sheep", "color"),
      text("cover-eyebrow", "eyebrow", "A READ-ALOUD AND COLORING COLLECTION"),
      text("cover-title", "title", "God’s Big Story"),
      text("cover-subtitle", "subtitle", "12 Bible Stories to Read, Talk About, and Color"),
      text("cover-author", "caption", "A Family Story and Coloring Book"),
    ]),
    page("title", "Title page", [
      text("title-main", "title", "God’s Big Story"),
      text("title-subtitle", "subtitle", "12 Bible Stories to Read, Talk About, and Color"),
      art("title-art", "storybook-cover", "Children, a lamb, and a bright star", "color"),
      text("title-caption", "caption", "For children and the grown-ups who read with them"),
    ]),
    page("copyright", "Copyright and family note", [
      text("copyright-heading", "heading", "About this book"),
      text("copyright-note", "body", "This book contains original child-friendly retellings and original vector illustrations inspired by Bible stories. Scripture references are included for families who want to read a Bible together; this book does not reproduce a Bible translation. The parent guides are conversation starters, not a replacement for a family’s own faith tradition or trusted spiritual leaders.\n\nCopyright © [year] [author or publisher]. Replace this notice, verify all publication details, and add your ISBN before publishing."),
    ]),
    page("backmatter", "How to use this book", [
      text("how-heading", "heading", "Read. Talk. Color."),
      text("how-body", "body", "Each story has three parts: a short retelling to read together, a parent guide with gentle conversation ideas, and a full-page black-line illustration to color. Read at your child’s pace. Invite questions without rushing to answer them. Children can use crayons, pencils, or washable markers; placing a spare sheet behind the coloring page may help protect the next page.\n\nThis book was designed as a black-ink, no-bleed coloring interior at 8.5 × 11 inches. Check your final PDF in the KDP Print Previewer and update the cover, imprint, copyright, and ISBN details before publication."),
    ]),
    page("contents", "Story index", [
      text("contents-heading", "heading", "The stories"),
      { id: "contents-list", kind: "contents" },
    ]),
  ];

  stories.forEach((story, index) => {
    const chapter = chapters[index];
    pages.push(page("chapter-opening", story.title, [
      text(`story-${index}-label`, "eyebrow", `STORY ${String(index + 1).padStart(2, "0")} · ${story.reference}`),
      art(`story-${index}-small-art`, story.scene, `A black-line illustration for ${story.title}`),
      text(`story-${index}-title`, "title", story.title),
      text(`story-${index}-invitation`, "caption", "Read this story together, then turn the page to talk and color."),
    ], chapter.id));
    pages.push(page("chapter-body", `Read: ${story.title}`, [
      text(`story-${index}-reference`, "eyebrow", `READ ALOUD · ${story.reference}`),
      { id: `story-${index}-manuscript`, kind: "chapter", chapterId: chapter.id },
    ], chapter.id));
    pages.push(page("parent-guide", `Parent guide: ${story.title}`, [
      text(`guide-${index}-eyebrow`, "eyebrow", "GROWN-UP AND CHILD"),
      text(`guide-${index}-title`, "title", "Talk about the story"),
      text(`guide-${index}-body`, "body", story.parentGuide),
      text(`guide-${index}-prompt`, "heading", "Coloring invitation"),
      text(`guide-${index}-activity`, "body", story.coloringPrompt),
      art(`guide-${index}-mini-art`, story.scene, `Small illustration preview for ${story.title}`),
    ], chapter.id));
    pages.push(page("coloring", `Color: ${story.title}`, [
      text(`color-${index}-eyebrow`, "eyebrow", `STORY ${String(index + 1).padStart(2, "0")} · ${story.reference}`),
      text(`color-${index}-title`, "title", story.title),
      text(`color-${index}-instruction`, "caption", story.coloringPrompt),
      art(`color-${index}-page-art`, story.scene, `Full-page line-art illustration: ${story.coloringPrompt}`),
    ], chapter.id));
  });

  pages.push(page("backmatter", "A note to the grown-ups", [
    text("grownups-heading", "heading", "Keep the conversation going"),
    text("grownups-body", "body", "Thank you for reading, wondering, and creating together. Children may ask questions that do not have easy answers. Listening closely, making room for feelings, and exploring a Bible story together can be meaningful ways to keep talking.\n\nBefore this book is published, replace the placeholder copyright details, add accurate author or publisher information and an ISBN if required, and review every page and illustration. Print requirements change; confirm current specifications in the KDP setup and preview tools."),
  ]));

  const designerDocument: EbookDesignDocument = {
    schemaVersion: 1,
    prompt: "Original, age-appropriate Bible story coloring book with 12 short retellings, parent conversation guides, and printable black-line vector scenes. Preserve faithfulness to cited Bible passages; use references rather than lengthy quotations.",
    theme: {
      ...DEFAULT_EBOOK_THEME,
      name: "Bright storybook",
      primary: "#394b83",
      accent: "#d78439",
      paper: "#fffdf7",
      text: "#282a36",
      headingFont: "sans",
      bodyFont: "serif",
    },
    pages,
  };

  return {
    title: "God’s Big Story",
    subtitle: "12 Bible Stories to Read, Talk About, and Color",
    bookType: "children",
    genre: "Bible stories and coloring books",
    trimSize: "8.5x11",
    idea: "Original, child-friendly retellings of 12 Bible stories with parent read-aloud notes and one printable coloring page per story.",
    description: "Read together, talk about the story, and color twelve original Bible-inspired scenes. Each short retelling is paired with a scripture reference, a parent conversation guide, and an original black-line illustration designed for coloring. Trim size: 8.5 × 11 inches. Families should review each page and publication detail before printing.",
    outline: stories.map((story) => `${story.title} — ${story.reference}`),
    chapters,
    kdpKeywords: [
      "Bible stories coloring book for kids",
      "Christian coloring book children",
      "read aloud Bible stories family",
      "faith activities for children",
      "Sunday school coloring pages",
      "parent child Bible activities",
      "Bible story art for kids",
    ],
    designerDocument,
    status: "editing",
  };
}
