import { getFileExtensionLabel, isImageAttachment } from "../../utils/attachmentHelpers";

export default function AttachmentChip({ file, onRemove }) {
  const isImage = isImageAttachment(file.type);

  return (
    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs text-gray-600">
      {isImage ? (
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      ) : (
        <span className="shrink-0 px-1 py-0.5 rounded bg-gray-200 text-[9px] font-bold text-gray-500 leading-none">
          {getFileExtensionLabel(file.name)}
        </span>
      )}
      <span className="truncate max-w-[120px]">{file.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-300 hover:text-gray-500 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
