from pathlib import Path
import fitz

source = Path("attached_assets/Bright_Colorful_Dinosaur_Coloring_Book_Document_1791502356277.pdf")
output_dir = Path(".agents/outputs")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print(f"Pages: {len(document)}")
print(f"Metadata: {document.metadata}")

sample_pages = sorted({0, 1, 2, 3, 4, 5, len(document) - 1})
for page_index in sample_pages:
    if page_index >= len(document):
        continue
    page = document[page_index]
    output_path = output_dir / f"dinosaur-reference-page-{page_index + 1}.png"
    page.get_pixmap(matrix=fitz.Matrix(1.2, 1.2), alpha=False).save(output_path)
    print(
        f"Page {page_index + 1}: {page.rect.width:.0f}x{page.rect.height:.0f} pt, "
        f"{len(page.get_images(full=True))} embedded images, "
        f"{len(page.get_text().strip())} text characters -> {output_path}"
    )
