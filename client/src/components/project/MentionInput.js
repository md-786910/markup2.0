import { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * MentionInput — textarea/input with @mention support.
 *
 * The textarea shows clean display text (e.g. "@ASHIF").
 * On submit, call ref.getEncodedValue() to get the encoded form "@[ASHIF](id)".
 *
 * Props:
 *   value       - controlled display text value
 *   onChange    - called with new display string on every change
 *   members     - array of { _id, name, email }
 *   placeholder
 *   multiline   - renders <textarea> if true, <input> otherwise
 *   rows        - rows for textarea (default 3)
 *   className
 *   onSubmit    - called on Enter in single-line mode (no dropdown open)
 *   disabled
 *
 * Ref methods:
 *   getEncodedValue() - returns value with @Name replaced by @[Name](id)
 */
const MentionInput = forwardRef(function MentionInput({
  value,
  onChange,
  members = [],
  placeholder = '',
  multiline = false,
  rows = 3,
  className = '',
  onSubmit,
  disabled = false,
}, ref) {
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // Map of display name → _id for all @mentions inserted this session
  const [mentionMap, setMentionMap] = useState({});
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState(null);

  // Expose getEncodedValue() to parent via ref
  useImperativeHandle(ref, () => ({
    getEncodedValue: () => {
      // Replace every @Name occurrence (followed by space/end) with @[Name](id)
      let encoded = value;
      Object.entries(mentionMap).forEach(([name, id]) => {
        // Match @Name followed by space, punctuation, or end of string
        const regex = new RegExp(`@${escapeRegex(name)}(?=\\s|$|[^\\w])`, 'g');
        encoded = encoded.replace(regex, `@[${name}](${id})`);
      });
      return encoded;
    },
    focus: () => inputRef.current?.focus(),
  }));

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const filtered = mentionQuery !== null
    ? members.filter((m) =>
        m.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const dropdownOpen = mentionQuery !== null && filtered.length > 0;

  useEffect(() => {
    if (dropdownOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownPos({ left: rect.left, top: rect.top, width: rect.width });
    } else {
      setDropdownPos(null);
    }
  }, [dropdownOpen, mentionQuery]);

  const detectMention = useCallback((text, cursorPos) => {
    const textBefore = text.slice(0, cursorPos);
    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex === -1) return null;
    const fragment = textBefore.slice(atIndex + 1);
    if (fragment.includes(' ')) return null;
    return { query: fragment, start: atIndex };
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    const cursor = e.target.selectionStart;
    const result = detectMention(newValue, cursor);
    if (result) {
      setMentionQuery(result.query);
      setMentionStart(result.start);
      setHighlightedIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const selectMember = (member) => {
    // Insert display token @Name (no ID) into the visible text
    const displayToken = `@${member.name} `;
    const cursorPos = inputRef.current?.selectionStart ?? mentionStart;
    const newValue = value.slice(0, mentionStart) + displayToken + value.slice(cursorPos);
    onChange(newValue);
    // Store mapping so getEncodedValue() can encode it later
    setMentionMap((prev) => ({ ...prev, [member.name]: member._id }));
    setMentionQuery(null);
    setTimeout(() => {
      if (inputRef.current) {
        const pos = mentionStart + displayToken.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (dropdownOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMember(filtered[highlightedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
    if (!multiline && e.key === 'Enter' && !dropdownOpen && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const sharedProps = {
    ref: inputRef,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    placeholder,
    disabled,
    className,
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {multiline ? (
        <textarea {...sharedProps} rows={rows} />
      ) : (
        <input type="text" {...sharedProps} />
      )}

      {dropdownOpen && dropdownPos && createPortal(
        <div
          className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{
            position: 'fixed',
            left: dropdownPos.left,
            top: dropdownPos.top - 4,
            width: dropdownPos.width,
            transform: 'translateY(-100%)',
            zIndex: 99999,
          }}
        >
          {filtered.map((member, idx) => (
            <button
              key={member._id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectMember(member); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                idx === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                {(member.name || '?')[0].toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-gray-900 truncate">{member.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{member.email}</p>
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
});

export default MentionInput;
