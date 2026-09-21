from pathlib import Path

root = Path(r"C:\Users\Admin\Documents\Projects\agriksense")
skip = {"node_modules", ".git", "images"}
exts = {".html", ".js", ".css", ".json", ".md", ".env", ".prisma", ".txt"}

fixed = []
for p in root.rglob("*"):
    if not p.is_file():
        continue
    if any(s in p.parts for s in skip):
        continue
    if p.suffix.lower() not in exts:
        continue
    text = p.read_text(encoding="utf-8")
    new = text.replace("\u2014", " - ").replace("\u2013", "-").replace("\u2012", "-")
    new = new.replace("href=\"login.html\"", "href=\"/login\"").replace("href=\"signup.html\"", "href=\"/signup\"")
    if new != text:
        p.write_text(new, encoding="utf-8", newline="\n")
        fixed.append(str(p.relative_to(root)))

print("fixed:", fixed)

still = []
for p in root.rglob("*"):
    if not p.is_file():
        continue
    if any(s in p.parts for s in skip):
        continue
    if p.suffix.lower() not in exts:
        continue
    text = p.read_text(encoding="utf-8", errors="ignore")
    if "\u2014" in text or "\u2013" in text:
        still.append(str(p.relative_to(root)))
print("still:", still)
