from pathlib import Path
import fitz

source = Path("attached_assets/Curriculum_Vitae_-_Owoeye_Olajumoke_Oluwatosin_1791068473047.pdf")
output_dir = Path(".agents/outputs/olajumoke-cv")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print(f"pages={document.page_count}")
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    output = output_dir / f"page-{index + 1}.png"
    pixmap.save(output)
    print(output)