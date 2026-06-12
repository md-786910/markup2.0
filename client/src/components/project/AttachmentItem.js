import { getFileExtensionLabel, isImageAttachment } from "../../utils/attachmentHelpers";

export default function AttachmentItem({ attachment, src, onImageClick }) {
  const url = src || `/${attachment.path}`;

  if (isImageAttachment(attachment.mimetype)) {
    return (
      <img
        src={url}
        alt={attachment.originalName}
        className="w-16 h-16 object-cover rounded-md border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() =>
          onImageClick ? onImageClick(url) : window.open(url, "_blank")
        }
      />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={attachment.originalName}
      className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors"
    >
      <span className="shrink-0 px-1 py-0.5 rounded bg-gray-200 text-[9px] font-bold text-gray-500 leading-none">
        {getFileExtensionLabel(attachment.originalName)}
      </span>
      <span className="truncate max-w-[140px]">{attachment.originalName}</span>
    </a>
  );
}
