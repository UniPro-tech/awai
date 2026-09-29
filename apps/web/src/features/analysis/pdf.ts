import type { AnalysisRunResponse } from "@private-polis/contracts";
import { groupColors } from "./palette";

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const PAGE_MARGIN = 92;

type ReportLabels = {
  title: string;
  generatedAt: string;
  participants: string;
  statements: string;
  groups: string;
  map: string;
  commonOpinions: string;
  groupOpinions: (number: number) => string;
  agree: string;
  disagree: string;
  score: (value: string) => string;
  noRanked: string;
  privacy: string;
};

type PdfImage = { bytes: Uint8Array; width: number; height: number };

function ascii(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function joinBytes(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function buildPdfFromJpegs(images: PdfImage[]): Uint8Array {
  const objectCount = 2 + images.length * 3;
  const objects = new Map<number, Uint8Array>();
  objects.set(1, ascii("<< /Type /Catalog /Pages 2 0 R >>"));
  const pageReferences = images.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  objects.set(
    2,
    ascii(`<< /Type /Pages /Count ${images.length} /Kids [${pageReferences}] >>`),
  );

  images.forEach((image, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const imageName = `Im${index + 1}`;
    const content = ascii(
      `q\n595 0 0 842 0 0 cm\n/${imageName} Do\nQ\n`,
    );
    objects.set(
      pageId,
      ascii(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
    objects.set(
      imageId,
      joinBytes([
        ascii(
          `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
        ),
        image.bytes,
        ascii("\nendstream"),
      ]),
    );
    objects.set(
      contentId,
      joinBytes([
        ascii(`<< /Length ${content.length} >>\nstream\n`),
        content,
        ascii("endstream"),
      ]),
    );
  });

  const chunks = [ascii("%PDF-1.4\n%\u00ff\u00ff\u00ff\u00ff\n")];
  const offsets = [0];
  let byteOffset = chunks[0]!.length;
  for (let id = 1; id <= objectCount; id += 1) {
    offsets[id] = byteOffset;
    const object = joinBytes([
      ascii(`${id} 0 obj\n`),
      objects.get(id)!,
      ascii("\nendobj\n"),
    ]);
    chunks.push(object);
    byteOffset += object.length;
  }
  const xrefOffset = byteOffset;
  const xref = [
    `xref\n0 ${objectCount + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  ].join("");
  chunks.push(ascii(xref));
  return joinBytes(chunks);
}

function dataUrlBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(",")[1] ?? "";
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function safeFilename(value: string): string {
  const reserved = new Set(["\\", "/", ":", "*", "?", '"', "<", ">", "|"]);
  const normalized = Array.from(value.normalize("NFKC"), (character) =>
    character.charCodeAt(0) < 32 || reserved.has(character) ? "-" : character,
  ).join("");
  return normalized.trim().slice(0, 80) || "analysis";
}

export async function downloadAnalysisPdf(input: {
  topicTitle: string;
  analysis: AnalysisRunResponse;
  labels: ReportLabels;
}): Promise<void> {
  const canvases: HTMLCanvasElement[] = [];
  let canvas!: HTMLCanvasElement;
  let context!: CanvasRenderingContext2D;
  let y = PAGE_MARGIN;

  const newPage = () => {
    canvas = document.createElement("canvas");
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const nextContext = canvas.getContext("2d");
    if (!nextContext) throw new Error("Canvas is unavailable.");
    context = nextContext;
    context.fillStyle = "#f8faf8";
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    context.fillStyle = "#17271f";
    context.textBaseline = "top";
    canvases.push(canvas);
    y = PAGE_MARGIN;
  };
  const ensureSpace = (height: number) => {
    if (y + height > PAGE_HEIGHT - PAGE_MARGIN) newPage();
  };
  const linesFor = (text: string, maxWidth: number) => {
    const lines: string[] = [];
    let line = "";
    for (const character of Array.from(text)) {
      const candidate = `${line}${character}`;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  const text = (
    value: string,
    options: { size?: number; weight?: number; color?: string; gap?: number } = {},
  ) => {
    const size = options.size ?? 30;
    const gap = options.gap ?? 12;
    const font = `${options.weight ?? 400} ${size}px Inter, "Noto Sans JP", sans-serif`;
    context.font = font;
    const lines = linesFor(value, PAGE_WIDTH - PAGE_MARGIN * 2);
    const height = lines.length * size * 1.45 + gap;
    ensureSpace(height);
    context.font = font;
    context.fillStyle = options.color ?? "#17271f";
    for (const line of lines) {
      context.fillText(line, PAGE_MARGIN, y);
      y += size * 1.45;
    }
    y += gap;
  };
  const section = (value: string) => {
    ensureSpace(90);
    y += 24;
    text(value, { size: 36, weight: 700, color: "#265f49", gap: 22 });
  };
  const statement = (body: string, direction: string, score: number) => {
    ensureSpace(130);
    context.fillStyle = "#e8f0eb";
    context.fillRect(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN * 2, 4);
    y += 18;
    text(direction, { size: 22, weight: 700, color: "#53635a", gap: 8 });
    text(body, { size: 28, weight: 500, gap: 6 });
    text(input.labels.score(score.toFixed(3)), {
      size: 20,
      color: "#66756c",
      gap: 18,
    });
  };

  newPage();
  text(input.labels.title, { size: 24, weight: 700, color: "#2a7f62", gap: 18 });
  text(input.topicTitle, { size: 52, weight: 700, gap: 12 });
  text(input.labels.generatedAt, { size: 22, color: "#66756c", gap: 28 });
  text(
    `${input.analysis.participantCount} ${input.labels.participants}   ·   ${input.analysis.statementCount} ${input.labels.statements}   ·   ${input.analysis.groups.length} ${input.labels.groups}`,
    { size: 27, weight: 600, gap: 14 },
  );
  text(input.labels.privacy, { size: 20, color: "#66756c", gap: 24 });

  section(input.labels.map);
  ensureSpace(500);
  const mapX = PAGE_MARGIN;
  const mapY = y;
  const mapSize = 460;
  context.fillStyle = "#ffffff";
  context.fillRect(mapX, mapY, mapSize, mapSize);
  const allPoints = input.analysis.viewerPoint
    ? [...input.analysis.points, input.analysis.viewerPoint]
    : input.analysis.points;
  if (allPoints.length > 0) {
    const xs = allPoints.map((point) => point.x);
    const ys = allPoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const scale = (value: number, min: number, max: number) =>
      max === min ? mapSize / 2 : 30 + ((value - min) / (max - min)) * (mapSize - 60);
    context.strokeStyle = "#dce6df";
    context.beginPath();
    context.moveTo(mapX + 20, mapY + mapSize / 2);
    context.lineTo(mapX + mapSize - 20, mapY + mapSize / 2);
    context.moveTo(mapX + mapSize / 2, mapY + 20);
    context.lineTo(mapX + mapSize / 2, mapY + mapSize - 20);
    context.stroke();
    for (const point of input.analysis.points) {
      context.fillStyle =
        point.groupOrdinal === null
          ? "#8b968e"
          : groupColors[point.groupOrdinal % groupColors.length]!;
      context.globalAlpha = 0.6;
      context.beginPath();
      context.arc(
        mapX + scale(point.x, minX, maxX),
        mapY + mapSize - scale(point.y, minY, maxY),
        9,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.globalAlpha = 1;
    if (input.analysis.viewerPoint) {
      const viewer = input.analysis.viewerPoint;
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#17271f";
      context.lineWidth = 6;
      context.beginPath();
      context.arc(
        mapX + scale(viewer.x, minX, maxX),
        mapY + mapSize - scale(viewer.y, minY, maxY),
        17,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }
  }
  y += mapSize + 24;

  const common = input.analysis.statementResults.filter(
    (result) => result.groupOrdinal === null,
  );
  section(input.labels.commonOpinions);
  if (common.length === 0) text(input.labels.noRanked, { size: 26 });
  for (const result of common) {
    statement(
      result.statement.body,
      result.kind.endsWith("_AGREE") ? input.labels.agree : input.labels.disagree,
      result.score,
    );
  }

  for (const group of input.analysis.groups) {
    section(input.labels.groupOpinions(group.ordinal + 1));
    const groupResults = input.analysis.statementResults.filter(
      (result) => result.groupOrdinal === group.ordinal,
    );
    if (groupResults.length === 0) text(input.labels.noRanked, { size: 26 });
    for (const result of groupResults) {
      statement(
        result.statement.body,
        result.kind.endsWith("_AGREE") ? input.labels.agree : input.labels.disagree,
        result.score,
      );
    }
  }

  canvases.forEach((page, index) => {
    const pageContext = page.getContext("2d")!;
    pageContext.fillStyle = "#66756c";
    pageContext.font = '400 18px Inter, "Noto Sans JP", sans-serif';
    pageContext.textAlign = "right";
    pageContext.fillText(
      `${index + 1} / ${canvases.length}`,
      PAGE_WIDTH - PAGE_MARGIN,
      PAGE_HEIGHT - 54,
    );
  });
  const images = canvases.map((page) => ({
    bytes: dataUrlBytes(page.toDataURL("image/jpeg", 0.9)),
    width: page.width,
    height: page.height,
  }));
  const pdf = buildPdfFromJpegs(images);
  const blob = new Blob([pdf.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(input.topicTitle)}-analysis.pdf`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
