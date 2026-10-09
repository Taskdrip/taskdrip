from pathlib import Path
import fitz

source = Path("attached_assets/Bright_Colorful_Dinosaur_Coloring_Book_Document_1791507743183.pdf")
output = Path(".agents/outputs/god-story-reference")
output.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print(f"pages={document.page_count}")
print(f"metadata={document.metadata}")
sample_pages = sorted({0, 1, 2, 3, 4, 5, document.page_count - 1})
for index in sample_pages:
    page = document[index]
    path = output / f"page-{index + 1:02}.png"
    page.get_pixmap(matrix=fitz.Matrix(1.2, 1.2), alpha=False).save(path)
    print(
        f"page={index + 1} size={page.rect.width:.1f}x{page.rect.height:.1f}pt "
        f"images={len(page.get_images(full=True))} text={page.get_text()[:200]!r} -> {path}"
    )
