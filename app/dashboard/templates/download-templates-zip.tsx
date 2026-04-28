"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";

type ZipTemplate = {
  accent: string;
  category: string;
  description: string;
  name: string;
  overview: string;
  sections: Array<{
    title: string;
    description: string;
    fields: Array<{
      label: string;
    }>;
  }>;
  slug: string;
};

type DownloadTemplatesZipProps = {
  templates: ZipTemplate[];
};

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "template";
}

async function generateTemplatePdf(template: ZipTemplate) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([612, 792]);
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 740;

  function drawLine(text: string, options: { bold?: boolean; size?: number } = {}) {
    if (y < 72) {
      page = pdf.addPage([612, 792]);
      y = 740;
    }

    page.drawText(text.slice(0, 95), {
      color: rgb(0.06, 0.07, 0.12),
      font: options.bold ? boldFont : regularFont,
      size: options.size ?? 10,
      x: 54,
      y,
    });
    y -= (options.size ?? 10) + 8;
  }

  drawLine(template.name, { bold: true, size: 20 });
  drawLine(template.category, { bold: true, size: 10 });
  y -= 8;
  drawLine(template.overview, { size: 11 });
  drawLine(template.description, { size: 10 });
  y -= 10;

  for (const section of template.sections) {
    drawLine(section.title, { bold: true, size: 13 });
    drawLine(section.description, { size: 10 });

    for (const field of section.fields) {
      drawLine(`- ${field.label}`, { size: 10 });
    }

    y -= 8;
  }

  return pdf.save();
}

export function DownloadTemplatesZip({ templates }: DownloadTemplatesZipProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  async function downloadZip() {
    if (isGenerating || templates.length === 0) {
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const zip = new JSZip();

      for (let index = 0; index < templates.length; index += 1) {
        const template = templates[index];
        const pdfBytes = await generateTemplatePdf(template);
        zip.file(`${safeFilename(template.name)}.pdf`, pdfBytes);
        setProgress(Math.round(((index + 1) / templates.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "myformsvault-templates.zip";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="template-download-panel">
      <button type="button" className="button button-primary" disabled={isGenerating} onClick={downloadZip}>
        {isGenerating ? "Generating ZIP..." : "Download all completed PDFs as ZIP"}
      </button>
      {isGenerating ? (
        <div className="zip-progress" aria-label="ZIP generation progress">
          <span style={{ width: `${progress}%` }} />
          <strong>{progress}%</strong>
        </div>
      ) : null}
    </div>
  );
}
