export const ACCEPTED_ATTACHMENT_TYPES =
  "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

export function isImageAttachment(mimetype) {
  return !!mimetype && mimetype.startsWith("image/");
}

export function getFileExtensionLabel(filename) {
  if (!filename) return "FILE";
  const parts = filename.split(".");
  if (parts.length < 2) return "FILE";
  return parts[parts.length - 1].toUpperCase();
}
