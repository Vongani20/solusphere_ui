import { blobToBase64 } from "./faceCapture";

export const HELPDESK_MAX_FILES = 5;
export const HELPDESK_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "pdf",
  "txt",
  "csv",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
]);

export const HELPDESK_ACCEPT = [...ALLOWED].map((ext) => `.${ext}`).join(",");

function extension(name) {
  return (name?.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
}

export function addHelpdeskFiles(current, incoming) {
  const next = [...current];
  for (const file of incoming) {
    if (next.length >= HELPDESK_MAX_FILES) {
      throw new Error("A ticket can have up to 5 attachments.");
    }
    if (file.size > HELPDESK_MAX_BYTES) {
      throw new Error(`${file.name} is larger than 8 MB.`);
    }
    if (!ALLOWED.has(extension(file.name))) {
      throw new Error(`${file.name} must be an image, PDF, Office file, text, CSV, or ZIP.`);
    }
    next.push(file);
  }
  return next;
}

export async function filesToHelpdeskAttachments(files) {
  return Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      data: await blobToBase64(file),
    }))
  );
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
