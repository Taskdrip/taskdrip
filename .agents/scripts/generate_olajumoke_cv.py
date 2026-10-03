from pathlib import Path
import fitz

OUT = Path("client/public/portfolio/olajumoke-owoeye-cv.pdf")
PHOTO = Path("client/public/portfolio/olajumoke-owoeye.jpg")
PREVIEW_DIR = Path(".agents/outputs/olajumoke-cv-final")
OUT.parent.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = 595, 842
MARGIN = 44
CONTENT_W = PAGE_W - MARGIN * 2

INK = (0.12, 0.16, 0.11)
GREEN = (0.15, 0.20, 0.11)
MUTED = (0.39, 0.42, 0.37)
SOFT = (0.92, 0.94, 0.89)
ACCENT = (0.84, 0.91, 0.47)
WHITE = (1, 1, 1)

doc = fitz.open()


def add_page():
    page = doc.new_page(width=PAGE_W, height=PAGE_H)
    page.draw_rect(fitz.Rect(0, 0, PAGE_W, PAGE_H), color=None, fill=WHITE)
    return page


def measure(text, size, font="helv"):
    return fitz.get_text_length(text, fontname=font, fontsize=size)


def wrap(text, max_width, size, font="helv"):
    lines = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if current and measure(candidate, size, font) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def write(page, x, y, text, size=9, color=INK, font="helv"):
    page.insert_text((x, y), text, fontname=font, fontsize=size, color=color)
    return measure(text, size, font)


def paragraph(page, x, y, text, width, size=8.5, color=MUTED, leading=None, font="helv"):
    leading = leading or size * 1.45
    lines = wrap(text, width, size, font)
    for index, line in enumerate(lines):
        write(page, x, y + index * leading, line, size, color, font)
    return y + max(1, len(lines)) * leading


def section(page, title, y):
    write(page, MARGIN, y, title.upper(), 9, GREEN, "hebo")
    page.draw_line(
        fitz.Point(MARGIN + 150, y - 3),
        fitz.Point(PAGE_W - MARGIN, y - 3),
        color=(0.85, 0.88, 0.82),
        width=0.7,
    )


def add_link(page, rect, uri):
    page.insert_link({"kind": fitz.LINK_URI, "from": rect, "uri": uri})


def footer(page, page_number):
    page.draw_line(
        fitz.Point(MARGIN, 807),
        fitz.Point(PAGE_W - MARGIN, 807),
        color=(0.86, 0.88, 0.84),
        width=0.65,
    )
    write(page, MARGIN, 824, "OLAJUMOKE OWOEYE  |  CONTENT & SOCIAL MEDIA", 7, MUTED)
    write(page, PAGE_W - MARGIN - 32, 824, f"{page_number} / 2", 7, MUTED)


def experience(page, role, company, dates, detail, y):
    title = f"{role}  |  {company}"
    write(page, MARGIN, y, title, 9, INK, "hebo")
    date_width = measure(dates, 7.5, "hebo")
    write(page, PAGE_W - MARGIN - date_width, y, dates, 7.5, MUTED, "hebo")
    paragraph(page, MARGIN, y + 14, detail, CONTENT_W, 8.2, MUTED, 11.5)


page = add_page()
page.draw_rect(fitz.Rect(0, 0, PAGE_W, 161), color=None, fill=GREEN)

write(page, MARGIN, 42, "CONTENT CREATOR  |  SOCIAL MEDIA MANAGER", 8, ACCENT, "hebo")
write(page, MARGIN, 75, "OWOEYE OLAJUMOKE", 24, WHITE, "hebo")
write(page, MARGIN, 103, "OLUWATOSIN", 18, WHITE, "hebo")
write(page, MARGIN, 124, "Content, social media and marketing support for growing brands.", 9, (0.88, 0.91, 0.84))

if PHOTO.exists():
    page.insert_image(fitz.Rect(462, 25, 551, 114), filename=str(PHOTO), keep_proportion=True)
    page.draw_rect(fitz.Rect(462, 25, 551, 114), color=(0.79, 0.86, 0.63), width=1.2)

contact_y = 148
write(page, MARGIN, contact_y, "owoeyeolajumokeoluwatosin@gmail.com", 7.2, WHITE)
write(page, 277, contact_y, "+234 810 112 6365", 7.2, WHITE)
portfolio_text = "taskdrip.online/olajumoke-owoeye"
portfolio_x = 399
write(page, portfolio_x, contact_y, portfolio_text, 7.1, ACCENT, "hebo")
add_link(
    page,
    fitz.Rect(portfolio_x, contact_y - 9, portfolio_x + measure(portfolio_text, 7.1, "hebo"), contact_y + 2),
    "https://taskdrip.online/olajumoke-owoeye",
)
add_link(page, fitz.Rect(MARGIN, 137, 253, 155), "mailto:owoeyeolajumokeoluwatosin@gmail.com")
add_link(page, fitz.Rect(277, 137, 390, 155), "https://wa.me/2348101126365")

section(page, "Profile", 190)
paragraph(
    page,
    MARGIN,
    210,
    "Content creator, social media manager and marketing professional with a background in Mass Communication, customer service and front desk operations. Experienced in developing content, supporting social channels and contributing to digital projects across education, creator marketing, property, logistics and lifestyle.",
    CONTENT_W,
    8.7,
    MUTED,
    12.3,
)

section(page, "Core strengths", 261)
strengths = [
    "Social media planning",
    "Content development",
    "Brand messaging",
    "Marketing research",
    "Community engagement",
    "Client communication",
    "Customer service",
    "Web content support",
]
chip_y = 280
chip_w = (CONTENT_W - 10) / 2
for index, skill in enumerate(strengths):
    col, row = index % 2, index // 2
    x = MARGIN + col * (chip_w + 10)
    y = chip_y + row * 23
    page.draw_rect(fitz.Rect(x, y - 12, x + chip_w, y + 5), color=None, fill=SOFT)
    write(page, x + 8, y, skill, 7.8, GREEN, "hebo")

section(page, "Professional experience", 375)
experience(
    page,
    "Content Developer & Social Media Manager",
    "Breedskool Galaxy (Remote)",
    "2020 - Present",
    "Developing content, managing social channels and supporting projects delivered for Breedskool clients.",
    397,
)
experience(
    page,
    "Receptionist / Front Desk Officer",
    "Westgate Hotel",
    "Jun 2023 - Present",
    "Welcoming visitors, sharing hotel information, responding to enquiries and coordinating clear communication across teams.",
    451,
)
experience(
    page,
    "Front Desk / Customer Service Officer",
    "Best Drivers Services",
    "Dec 2022 - May 2023",
    "Supporting daily front desk operations, maintaining client records and resolving customer concerns.",
    505,
)
experience(
    page,
    "Sales & Marketing Officer",
    "Nigerian Breweries Plc",
    "2020 - 2021",
    "Conducting market research, contributing to marketing strategy and building relationships with clients and stakeholders.",
    559,
)

section(page, "Education", 632)
write(page, MARGIN, 653, "Higher National Diploma (HND) - Mass Communication", 8.7, INK, "hebo")
write(page, MARGIN, 667, "Adeseun Ogundoyin Polytechnic  |  2021", 8, MUTED)
write(page, MARGIN, 690, "National Diploma (ND) - Mass Communication", 8.7, INK, "hebo")
write(page, MARGIN, 704, "The Polytechnic, Ibadan  |  2017", 8, MUTED)

section(page, "Additional capabilities", 741)
paragraph(
    page,
    MARGIN,
    760,
    "Public relations  |  Written and verbal communication  |  Record keeping  |  Problem solving  |  Team collaboration",
    CONTENT_W,
    8,
    MUTED,
    11,
)
footer(page, 1)

page = add_page()
page.draw_rect(fitz.Rect(0, 0, PAGE_W, 104), color=None, fill=GREEN)
write(page, MARGIN, 40, "SELECTED PROJECTS", 8, ACCENT, "hebo")
write(page, MARGIN, 70, "Content & social media portfolio", 21, WHITE, "hebo")
write(page, MARGIN, 89, "Platforms and teams supported across several industries.", 8.5, (0.88, 0.91, 0.84))

portfolio_projects = [
    (
        "Breedskool Galaxy",
        "Content developer and social media manager  |  2020 - Present",
        "Developing content and managing social channels for an online learning business, including projects for its clients.",
        "https://breedskool.com",
    ),
    (
        "The Industry Miner",
        "Content and social media support  |  Project work",
        "Supporting a platform focused on training, mentoring and empowering entrepreneurs with skills and resources.",
        "https://theindustryminer.com/",
    ),
    (
        "Taskdrip",
        "Content creator and social media manager  |  Project work",
        "Creating content for an influencer marketplace connecting brands with creators for targeted campaigns.",
        "https://taskdrip.online/",
    ),
    (
        "Beagvs Marine",
        "Social media manager and content creator  |  2025 - Present",
        "Creating content and managing social media for a shipping, logistics and marketplace platform.",
        "https://beagvsmarine.com/",
    ),
    (
        "Proprenty",
        "Web management and social media team  |  Current",
        "Supporting web management and social channels for a property platform serving landlords, tenants, managers and service professionals.",
        "https://proprenty.online/",
    ),
    (
        "Hernique's Touch Makeover",
        "Social media manager  |  TikTok",
        "Managing social media content for the makeover brand.",
        "https://www.tiktok.com/@muainibadan1",
    ),
    (
        "Hernique's Kiddies Wears",
        "Social media manager  |  TikTok",
        "Managing social media content for the children's clothing brand.",
        "https://www.tiktok.com/@herniquekiddieswears1",
    ),
]

start_y = 139
row_height = 88
for index, (name, role, detail, url) in enumerate(portfolio_projects):
    top = start_y + index * row_height
    if index % 2 == 0:
        page.draw_rect(fitz.Rect(MARGIN, top - 18, PAGE_W - MARGIN, top + 64), color=None, fill=(0.97, 0.98, 0.95))
    page.draw_circle(fitz.Point(MARGIN + 12, top - 1), 11, color=None, fill=ACCENT)
    write(page, MARGIN + 7, top + 2, f"{index + 1:02}", 6.5, GREEN, "hebo")
    write(page, MARGIN + 32, top, name, 10, INK, "hebo")
    link_label = "Open project"
    link_width = measure(link_label, 7, "hebo")
    link_x = PAGE_W - MARGIN - link_width
    write(page, link_x, top, link_label, 7, GREEN, "hebo")
    add_link(page, fitz.Rect(link_x - 2, top - 10, PAGE_W - MARGIN, top + 4), url)
    write(page, MARGIN + 32, top + 15, role, 7.6, MUTED, "hebo")
    paragraph(page, MARGIN + 32, top + 29, detail, CONTENT_W - 40, 7.8, MUTED, 10.5)
    page.draw_line(
        fitz.Point(MARGIN + 32, top + 72),
        fitz.Point(PAGE_W - MARGIN, top + 72),
        color=(0.88, 0.90, 0.85),
        width=0.55,
    )

callout_top = start_y + len(portfolio_projects) * row_height + 1
page.draw_rect(
    fitz.Rect(MARGIN, callout_top, PAGE_W - MARGIN, callout_top + 54),
    color=None,
    fill=GREEN,
)
write(page, MARGIN + 15, callout_top + 21, "Interested in working together?", 9.3, WHITE, "hebo")
write(page, MARGIN + 15, callout_top + 39, "Email Olajumoke or start a WhatsApp conversation.", 7.8, (0.89, 0.92, 0.85))
email_x = 370
write(page, email_x, callout_top + 22, "Send an email", 8, ACCENT, "hebo")
add_link(page, fitz.Rect(email_x - 2, callout_top + 9, email_x + 82, callout_top + 27), "mailto:owoeyeolajumokeoluwatosin@gmail.com")
write(page, email_x, callout_top + 40, "WhatsApp", 8, ACCENT, "hebo")
add_link(page, fitz.Rect(email_x - 2, callout_top + 27, email_x + 58, callout_top + 45), "https://wa.me/2348101126365")

footer(page, 2)
doc.set_metadata(
    {
        "title": "Olajumoke Owoeye - Professional CV",
        "author": "Olajumoke Owoeye",
        "subject": "Content creation, social media management and marketing portfolio",
        "keywords": "content creator, social media manager, marketing, Ibadan, Nigeria",
    }
)
doc.save(OUT, garbage=4, deflate=True)
print(f"Created {OUT} ({len(doc)} pages)")
for index, page in enumerate(doc):
    preview = PREVIEW_DIR / f"page-{index + 1}.png"
    page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False).save(preview)
    print(f"Rendered {preview}")