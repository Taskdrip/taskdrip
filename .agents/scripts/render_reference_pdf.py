from pathlib import Path
import fitz

source = Path("attached_assets/Bright_Colorful_Dinosaur_Coloring_Book_Document_1791506646136.pdf")
output = Path(".agents/outputs/dinosaur-reference")
output.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print(f"pages={document.page_count}")
print(f"metadata={document.metadata}")
for index in range(min(4, document.page_count)):
    page = document[index]
    print(f"page={index + 1} size={page.rect.width:.1f}x{page.rect.height:.1f} text={page.get_text()[:240]!r}")
    page.get_pixmap(matrix=fitz.Matrix(1.4, 1.4), alpha=False).save(output / f"page-{index + 1:02}.png")
