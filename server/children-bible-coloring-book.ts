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
  {
    title: "Abraham Counts the Stars",
    reference: "Genesis 12:1–9; 15:1–6",
    scene: "abraham",
    story: "God called Abraham to leave his home and travel to a new land. Abraham and Sarah packed for a long journey, though the Bible does not tell us whether they argued about who packed the tent ropes. God promised Abraham a family as numerous as the stars. One night Abraham looked up at the dark sky and tried to count them. He soon had far too many stars to keep track of. Abraham trusted God's promise, even while he was still waiting. His story invites us to be hopeful, patient, and ready to take a brave next step.",
    parentGuide: "Explain that Abraham and Sarah trusted God during a long journey and a long wait. Ask: What helps you when you have to be patient? What is one brave new thing you would like to try with a grown-up?",
    coloringPrompt: "Color Abraham, the tent, and the night sky full of stars.",
  },
  {
    title: "Joseph Chooses Forgiveness",
    reference: "Genesis 37; 45:1–15; 50:15–21",
    scene: "joseph",
    story: "Joseph's brothers treated him unfairly and sent him far from home. Years later, Joseph became a leader in Egypt and helped store food before a famine. When his brothers arrived looking for food, Joseph recognized them. They were frightened, but Joseph chose to forgive them and help the whole family. Forgiving did not mean pretending the hurt never happened; it meant choosing a path toward safety and a new beginning. Joseph's story has twists worthy of a whole stack of scrolls, and it reminds us that people can change and families can repair relationships.",
    parentGuide: "Forgiveness can take time and does not mean a child must stay near someone unsafe. Ask: How can we repair a small hurt? Which trusted grown-up can help when a problem is too big to solve alone?",
    coloringPrompt: "Color Joseph's coat, the grain baskets, and the family meeting again.",
  },
  {
    title: "Samuel Hears a Call",
    reference: "1 Samuel 3:1–21",
    scene: "samuel",
    story: "Samuel was a boy helping Eli at the place of worship. One night Samuel heard someone call his name. He hurried to Eli, who said he had not called. It happened again—and again—until Eli realized that God was calling Samuel. Eli helped Samuel listen and answer. Samuel learned that listening carefully can be the first step toward helping others. It was a very busy night for a boy who probably thought bedtime had already been settled!",
    parentGuide: "Tell the story as a lesson about listening, not as a frightening voice in the dark. Ask: When is listening important? Which kind adults help you make sense of a difficult situation?",
    coloringPrompt: "Color Samuel's lamp, the quiet room, and Eli helping him listen.",
  },
  {
    title: "Zacchaeus Finds a Better Way",
    reference: "Luke 19:1–10",
    scene: "zacchaeus",
    story: "Zacchaeus was a tax collector who had treated people unfairly. When Jesus came to town, Zacchaeus was too short to see over the crowd, so he climbed a tree. Jesus spotted him and invited himself to Zacchaeus's house. The crowd grumbled, but Zacchaeus listened. He promised to repay people he had cheated and to share what he had. His choices showed that he wanted to make things right. Zacchaeus came down from the tree with more than a good view: he had a chance to begin again.",
    parentGuide: "Focus on taking responsibility and making harm right with help from a trusted adult. Ask: What can we do after making a mistake? How can we share fairly?",
    coloringPrompt: "Color Zacchaeus in the tree, the welcoming crowd, and Jesus nearby.",
  },
];

const storyWinks = [
  "The birds had front-row seats, and every one of them seemed to have an opinion.",
  "Two-by-two boarding is easier when the penguins remember to take turns.",
  "That was one sea crossing with absolutely no bridge toll.",
  "David's sheep may have been his smallest—and fluffiest—cheering section.",
  "The lions were impressive, but Daniel stayed calm and kept praying.",
  "That was quite a fish story, and Jonah had the sea-splashed details.",
  "Ruth gathered grain one careful handful at a time; no combine harvester required.",
  "Esther planned her words carefully—no royal speech written on a napkin at the last minute.",
  "The shepherds made a night visit that was much more exciting than counting sheep.",
  "The baskets went home fuller than the lunch bags had started.",
  "The Samaritan was a neighbor in action, with excellent roadside manners.",
  "The early morning garden visit brought news bigger than the sunrise.",
  "Abraham soon discovered that counting stars is a very long bedtime activity.",
  "Joseph's story had so many turns it could fill a whole shelf of scrolls.",
  "Samuel made several nighttime trips before the message finally made sense.",
  "Zacchaeus found a high seat in the tree and a fresh start on the ground.",
];

const storyQuestions = [
  ["What did God make first in the story?", "Which part of creation would you most like to explore?", "How can your family care for plants or animals?"],
  ["Who helped Noah get the ark ready?", "What sign appeared after the rain?", "How can we help someone who is preparing for a big job?"],
  ["How did the people cross the sea?", "What helped them keep going when they felt afraid?", "Who can help you when a challenge feels too big?"],
  ["What kind of work did David do before meeting Goliath?", "What gave David courage?", "Name one small way a child can help today."],
  ["What did Daniel keep doing even when it was difficult?", "How did the king feel when he learned Daniel was safe?", "What helps you feel calm when you are worried?"],
  ["Where did Jonah go when he tried to travel the other way?", "What did Jonah do while he was inside the great fish?", "When have you tried again after a mistake?"],
  ["Why did Ruth travel with Naomi?", "How did Ruth help her family?", "What is one generous thing you can do this week?"],
  ["What did Esther do when her people needed help?", "Who helped Esther prepare?", "How can you safely speak up for someone?"],
  ["Who heard the good news about Jesus' birth?", "Where did the shepherds go?", "How can you welcome someone new?"],
  ["What food did the child share?", "What did the disciples do with the food?", "What can you share fairly with others?"],
  ["Who stopped to help the injured traveler?", "What did the Samaritan do to care for him?", "Who should a child ask for help in an unsafe situation?"],
  ["Who visited the tomb early in the morning?", "What hopeful news did they hear?", "Who can comfort you when you feel sad?"],
  ["What promise did God make to Abraham?", "What did Abraham see when he looked up at night?", "What helps you while you wait for something important?"],
  ["What did Joseph do when his brothers came to Egypt?", "How did Joseph help his family?", "What can help people repair a hurt?"],
  ["Who helped Samuel understand the call?", "What did Samuel learn to do?", "How can careful listening help someone else?"],
  ["Where did Zacchaeus climb to see Jesus?", "What did Zacchaeus promise to change?", "What is one way to make something right after a mistake?"],
];

const familyActivities = [
  "Take a short nature walk and draw one living thing you want to care for.",
  "Make a paper ark and draw two favorite animal friends beside it.",
  "Create a safe-path picture using blue paper and talk about a time you felt brave.",
  "Draw a sheep and write one kind or courageous thing you can do.",
  "Practice a calm breathing count together, then draw what helps you feel peaceful.",
  "Make a three-part picture: a wrong turn, a second chance, and a kind choice.",
  "Draw two hands helping someone and choose one small helpful action for today.",
  "Make a paper crown and write the name of a trusted adult you can ask for help.",
  "Draw a welcome card for someone new to your family, class, or community.",
  "Draw a basket and fill it with pictures of things people can share.",
  "Make a neighbor-helping plan with a trusted grown-up.",
  "Draw a sunrise and name one person who can comfort you when you feel sad.",
  "Make a star map with five stars and tell a grown-up one thing you are patiently waiting for.",
  "Draw a bridge between two people and write one safe way they could begin to make peace.",
  "Play a listening game: take turns repeating one kind thing the other person said.",
  "Draw a tree with a ladder and write one fair choice Zacchaeus could make today.",
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
    content: `${story.reference}\n\n${story.story}\n\n${storyWinks[stories.indexOf(story)]}`,
  }));
  const pages: EbookDesignPage[] = [
    page("cover", "Front cover", [
      art("cover-family", "storybook-cover", "A welcoming Bible storybook family with sheep", "color"),
      text("cover-eyebrow", "eyebrow", "A READ-ALOUD AND COLORING ADVENTURE"),
      text("cover-title", "title", "God’s Big Story"),
      text("cover-subtitle", "subtitle", "16 Bible Stories to Read, Talk About, and Color"),
      text("cover-author", "caption", "A Family Story and Coloring Book"),
    ]),
    page("title", "Title page", [
      text("title-main", "title", "God’s Big Story"),
      text("title-subtitle", "subtitle", "16 Bible Stories to Read, Talk About, and Color"),
      art("title-art", "storybook-cover", "Children, a lamb, and a bright star", "color"),
      text("title-caption", "caption", "For children and the grown-ups who read with them"),
    ]),
    page("copyright", "Copyright and family note", [
      text("copyright-heading", "heading", "About this book"),
      text("copyright-note", "body", "This book contains original child-friendly retellings and original vector illustrations inspired by Bible stories. Scripture references are included for families who want to read a Bible together; this book does not reproduce a Bible translation. The parent guides are conversation starters, not a replacement for a family’s own faith tradition or trusted spiritual leaders.\n\nCopyright © [year] [author or publisher]. Replace this notice, verify all publication details, and add your ISBN before publishing."),
    ]),
    page("backmatter", "How to use this book", [
      text("how-heading", "heading", "Read. Talk. Color."),
      text("how-body", "body", "Every story has a lively read-aloud retelling, a Bible passage reference, a grown-up guide, questions, a hands-on activity, a bright color example, and an original black-line coloring page. Read at your child’s pace. Invite questions without rushing to answer them. Children can use crayons, pencils, or washable markers; place a spare sheet behind the coloring page when using markers.\n\nThe designed interior is 8.5 × 11 inches with no bleed. Because it includes full-color examples, select a KDP color-interior option; a black-and-white edition requires removing or converting those example pages and rechecking the exported file. Before publication, replace author and copyright placeholders, add a valid ISBN if needed, create a separate full-wrap cover using the final page count and paper choice, and inspect the PDF in KDP Print Previewer. Store specifications can change; no automated export guarantees acceptance."),
    ]),
    page("contents", "Story index", [
      text("contents-heading", "heading", "The stories"),
      { id: "contents-list", kind: "contents" },
    ]),
  ];

  stories.forEach((story, index) => {
    const chapter = chapters[index];
    const storyNumber = String(index + 1).padStart(2, "0");
    pages.push(page("chapter-opening", story.title, [
      text(`story-${index}-label`, "eyebrow", `STORY ${storyNumber} · ${story.reference}`),
      art(`story-${index}-small-art`, story.scene, `A black-line illustration for ${story.title}`),
      text(`story-${index}-title`, "title", story.title),
      text(`story-${index}-invitation`, "caption", "Read, explore, answer, and color this story together."),
    ], chapter.id));
    pages.push(page("chapter-body", `Read: ${story.title}`, [
      text(`story-${index}-reference`, "eyebrow", `READ ALOUD · ${story.reference}`),
      { id: `story-${index}-manuscript`, kind: "chapter", chapterId: chapter.id },
    ], chapter.id));
    pages.push(page("parent-guide", `Parent guide: ${story.title}`, [
      text(`scripture-${index}-eyebrow`, "eyebrow", `OPEN THE BIBLE · STORY ${storyNumber}`),
      text(`scripture-${index}-title`, "title", "Scripture explorer"),
      text(`scripture-${index}-reference`, "heading", story.reference),
      text(`scripture-${index}-body`, "body", "Read this passage in the Bible translation your family uses. This book retells the story in original words; it does not reproduce a Bible translation. Look for a detail that matches the picture and a detail you had not noticed before."),
      text(`scripture-${index}-note`, "caption", "Grown-ups: check the retelling against your preferred Bible translation before sharing."),
    ], chapter.id));
    pages.push(page("parent-guide", `Talk together: ${story.title}`, [
      text(`guide-${index}-eyebrow`, "eyebrow", "GROWN-UP AND CHILD"),
      text(`guide-${index}-title`, "title", "Talk about the story"),
      text(`guide-${index}-body`, "body", story.parentGuide),
      text(`guide-${index}-prompt`, "heading", "Wonder together"),
      { id: `guide-${index}-questions`, kind: "list", items: storyQuestions[index] },
    ], chapter.id));
    pages.push(page("coloring", `Color: ${story.title}`, [
      text(`example-${index}-eyebrow`, "eyebrow", `COLOR GUIDE · STORY ${storyNumber}`),
      text(`example-${index}-title`, "title", "A bright example"),
      text(`example-${index}-instruction`, "caption", `${story.coloringPrompt} Try your own colors on the next page.`),
      art(`example-${index}-art`, story.scene, `Colored storybook example for ${story.title}`, "color"),
      text(`example-${index}-tip`, "caption", "Notice the warm highlights and cool shadows, then make the scene your own."),
    ], chapter.id));
    pages.push(page("coloring", `Coloring page: ${story.title}`, [
      text(`color-${index}-eyebrow`, "eyebrow", `YOUR TURN · STORY ${storyNumber}`),
      text(`color-${index}-title`, "title", story.title),
      text(`color-${index}-instruction`, "caption", story.coloringPrompt),
      art(`color-${index}-page-art`, story.scene, `Full-page black-line coloring illustration: ${story.coloringPrompt}`),
    ], chapter.id));
    pages.push(page("parent-guide", `Story quest: ${story.title}`, [
      text(`quest-${index}-eyebrow`, "eyebrow", "STORY CHECK AND ACTIVITY"),
      text(`quest-${index}-title`, "title", "Can you remember?"),
      { id: `quest-${index}-questions`, kind: "list", items: storyQuestions[index] },
      text(`quest-${index}-activity-heading`, "heading", "Try this together"),
      text(`quest-${index}-activity`, "body", familyActivities[index]),
      text(`quest-${index}-note`, "caption", "A grown-up can read the questions aloud and write down the child’s answers."),
    ], chapter.id));
    pages.push(page("backmatter", `My story response: ${story.title}`, [
      text(`response-${index}-eyebrow`, "eyebrow", `MY STORYBOOK · STORY ${storyNumber}`),
      text(`response-${index}-title`, "title", "My story response"),
      text(`response-${index}-prompt`, "body", `Draw your favorite part of ${story.title} in the space below. Then tell a grown-up one thing you learned or wondered about.`),
      text(`response-${index}-lines`, "body", "My favorite part:\n\n________________________________________________\n\nOne kind or brave thing I can try:\n\n________________________________________________"),
    ], chapter.id));
  });

  pages.push(page("backmatter", "Story map", [
    text("story-map-heading", "heading", "Keep exploring"),
    text("story-map-body", "body", "These stories span creation, courage, kindness, forgiveness, hope, and new beginnings. Use the scripture references to read the passages in the Bible translation your family prefers. The retellings are original summaries, not quotations."),
    { id: "story-map-list", kind: "list", items: stories.map((story) => `${story.title} · ${story.reference}`) },
  ]));
  pages.push(page("backmatter", "A note to the grown-ups", [
    text("grownups-heading", "heading", "Keep the conversation going"),
    text("grownups-body", "body", "Thank you for reading, wondering, and creating together. Children may ask questions that do not have easy answers. Listening closely, making room for feelings, and exploring a Bible story together can be meaningful ways to keep talking.\n\nBefore this book is published, replace the placeholder copyright details, add accurate author or publisher information and an ISBN if required, and review every page and illustration. Print requirements change; confirm current specifications in the KDP setup and preview tools."),
  ]));
  pages.push(page("backmatter", "My storybook notes", [
    text("notes-heading", "heading", "My favorite story"),
    text("notes-body", "body", "The story I want to remember is:\n\n________________________________________________\n\nMy favorite character is:\n\n________________________________________________\n\nOne kind or brave thing I can try:\n\n________________________________________________"),
  ]));

  const designerDocument: EbookDesignDocument = {
    schemaVersion: 1,
    prompt: "Original, age-appropriate Bible story coloring book with 16 short retellings, scripture references, parent conversation guides, story questions, family activities, colored examples, and printable black-line vector scenes. Preserve faithfulness to cited Bible passages; use references rather than lengthy quotations.",
    theme: {
      ...DEFAULT_EBOOK_THEME,
      name: "Bright storybook",
      primary: "#167f83",
      accent: "#f0a23b",
      paper: "#f0fcf9",
      text: "#173a40",
      headingFont: "sans",
      bodyFont: "sans",
    },
    pages,
  };

  return {
    title: "God’s Big Story: A Read-Aloud Bible Coloring Adventure",
    subtitle: "16 Bible Stories to Read, Talk About, and Color",
    bookType: "children",
    genre: "Bible stories and coloring books",
    trimSize: "8.5x11",
    idea: "Original, child-friendly retellings of 16 Bible stories with scripture references, parent read-aloud notes, questions, activities, color guides, and printable illustrations.",
    description: "Read together, talk about the story, and color sixteen original Bible-inspired scenes. Each short retelling is paired with a scripture reference, a parent conversation guide, story questions, a family activity, a colored example, and an original black-line illustration. Trim size: 8.5 × 11 inches. Review the editable draft and all publication details before printing.",
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
