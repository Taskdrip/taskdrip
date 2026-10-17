from pathlib import Path
import pymupdf as fitz

source = Path("attached_assets/taskdrip_2027_Notebook_Journal_1792270834126.pdf")
output = Path(".agents/outputs/taskdrip_journal_reference")
output.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
columns = 4
cell_width = 220
cell_height = 300
rows = (document.page_count + columns - 1) // columns
sheet = fitz.open()
contact = sheet.new_page(width=columns * cell_width, height=rows * cell_height)

for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(0.30, 0.30), alpha=False)
    image = pixmap.tobytes("png")
    column = index % columns
    row = index // columns
    x = column * cell_width + 10
    y = row * cell_height + 22
    contact.insert_image(fitz.Rect(x, y, x + 200, y + 260), stream=image, keep_proportion=True)
    contact.insert_text((x, y - 6), f"Page {index + 1}", fontsize=9, color=(0.2, 0.2, 0.2))
contact.get_pixmap(matrix=fitz.Matrix(1, 1), alpha=False).save(output / "contact-sheet.png")

for page_number in (1, 2, 3, 4, 5, 6, 31, 32, 33):
    if page_number <= document.page_count:
        page = document.load_page(page_number - 1)
        page.get_pixmap(matrix=fitz.Matrix(1.4, 1.4), alpha=False).save(output / f"page-{page_number:02}.png")

print(f"pages={document.page_count}; page_size={document[0].rect}; metadata={document.metadata}")
for page_number in range(min(document.page_count, 8)):
    page = document.load_page(page_number)
    text = " ".join(page.get_text().split())
    print(f"{page_number + 1}: {text[:220]}")
