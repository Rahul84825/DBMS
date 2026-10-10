"""
Convert docs/project_report.md into an editable document for Microsoft Word.
Outputs:
  - docs/project_report.html (Opens directly in Microsoft Word with complete styling & tables)
"""

import html
from pathlib import Path


def generate_word_compatible_html():
    md_path = Path("docs/project_report.md")
    html_path = Path("docs/project_report.html")

    if not md_path.exists():
        print("docs/project_report.md not found.")
        return

    text = md_path.read_text(encoding="utf-8")
    lines = text.splitlines()

    html_lines = [
        "<!DOCTYPE html>",
        '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
        "<head>",
        '<meta charset="utf-8">',
        "<title>Smart Farm DBMS — Final Project Report</title>",
        "<style>",
        "  body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; margin: 1in; color: #1a202c; }",
        "  h1 { font-size: 22pt; color: #1a365d; border-bottom: 2pt solid #2b6cb0; padding-bottom: 4pt; margin-top: 18pt; }",
        "  h2 { font-size: 15pt; color: #2b6cb0; border-bottom: 1pt solid #cbd5e0; padding-bottom: 3pt; margin-top: 16pt; }",
        "  h3 { font-size: 12pt; color: #2d3748; margin-top: 12pt; }",
        "  table { border-collapse: collapse; width: 100%; margin: 12pt 0; font-size: 10pt; }",
        "  th, td { border: 1pt solid #a0aec0; padding: 6pt 8pt; text-align: left; }",
        "  th { background-color: #edf2f7; font-weight: bold; color: #2d3748; }",
        "  pre { background-color: #f7fafc; border: 1pt solid #e2e8f0; padding: 8pt; font-family: 'Consolas', monospace; font-size: 9pt; }",
        "  code { font-family: 'Consolas', monospace; font-size: 9.5pt; color: #c53030; }",
        "  hr { border: none; border-top: 1pt solid #cbd5e0; margin: 16pt 0; }",
        "  p { margin: 6pt 0; }",
        "  li { margin: 3pt 0; }",
        "</style>",
        "</head>",
        "<body>",
    ]

    in_code = False
    code_buf = []
    in_table = False
    table_buf = []

    for line in lines:
        # Code blocks
        if line.startswith("```"):
            if in_code:
                html_lines.append(
                    "<pre><code>"
                    + html.escape("\n".join(code_buf))
                    + "</code></pre>"
                )
                code_buf = []
                in_code = False
            else:
                in_code = True
            continue

        if in_code:
            code_buf.append(line)
            continue

        # Tables
        if line.strip().startswith("|") and line.strip().endswith("|"):
            if not in_table:
                in_table = True
                table_buf = []
            table_buf.append(line.strip())
            continue
        else:
            if in_table:
                html_lines.append("<table>")
                for idx, tline in enumerate(table_buf):
                    raw_cells = [c.strip() for c in tline.strip("|").split("|")]
                    if idx == 1 and all(
                        set(c).issubset({"-", ":", " "}) for c in raw_cells
                    ):
                        continue
                    tag = "th" if idx == 0 else "td"
                    row_html = (
                        "<tr>"
                        + "".join(
                            f"<{tag}>{html.escape(c)}</{tag}>" for c in raw_cells
                        )
                        + "</tr>"
                    )
                    html_lines.append(row_html)
                html_lines.append("</table>")
                in_table = False
                table_buf = []

        # Headings & text
        if line.startswith("# "):
            html_lines.append(f"<h1>{html.escape(line[2:])}</h1>")
        elif line.startswith("## "):
            html_lines.append(f"<h2>{html.escape(line[3:])}</h2>")
        elif line.startswith("### "):
            html_lines.append(f"<h3>{html.escape(line[4:])}</h3>")
        elif line.startswith("- "):
            html_lines.append(f"<li>{html.escape(line[2:])}</li>")
        elif line.strip() == "---":
            html_lines.append("<hr/>")
        elif line.strip():
            html_lines.append(f"<p>{html.escape(line)}</p>")

    html_lines.append("</body></html>")
    html_path.write_text("\n".join(html_lines), encoding="utf-8")
    print(f"Generated Word-compatible document: {html_path.resolve()}")


if __name__ == "__main__":
    generate_word_compatible_html()
