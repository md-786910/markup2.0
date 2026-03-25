/**
 * Feedbackly Design Palette — Source of Truth
 *
 * This file documents the design conventions used across the app.
 * It is NOT imported at runtime (Tailwind utility classes handle styling).
 * Reference this file when building or modifying UI components to stay consistent.
 *
 * ─── COLORS ────────────────────────────────────────────────────────────
 *
 * Primary:        blue-600 (#2563EB)         — buttons, links, focus rings
 * Primary Hover:  blue-700 (#1D4ED8)         — button hover states
 * Primary Light:  blue-50  (#EFF6FF)         — active nav bg, badges
 *
 * Sidebar:        gray-900 (#111827)         — sidebar background
 * Sidebar Active: gray-800 (#1F2937)         — active nav item bg
 * Sidebar Text:   gray-400 (#9CA3AF)         — inactive nav text
 * Sidebar Border: gray-800 (#1F2937)         — sidebar dividers
 *
 * Background:     gray-50  (#F9FAFB)         — page/app background
 * Card:           white    (#FFFFFF)         — card backgrounds
 * Card Border:    gray-200 (#E5E7EB)         — card borders
 * Card Hover Bdr: gray-300 (#D1D5DB)         — card border on hover
 *
 * Text Primary:   gray-900 (#111827)         — headings, card titles
 * Text Secondary: gray-500 (#6B7280)         — descriptions, subtitles
 * Text Muted:     gray-400 (#9CA3AF)         — timestamps, metadata
 *
 * Success:        green-600 (#16A34A)        — success states, active badges
 * Danger:         red-500  (#EF4444)         — delete buttons, error states
 * Warning:        amber-500 (#F59E0B)        — owner badges, pending states
 *
 * Brand Gradient: from-blue-500 to-indigo-600   — logo, brand accents
 * Avatar Gradient: from-violet-500 to-purple-600 — workspace avatar
 * User Gradient:   from-blue-500 to-cyan-500     — user avatar (sidebar bottom)
 *
 * ─── AVATAR PALETTE ────────────────────────────────────────────────────
 *
 * Each member gets a deterministic color based on name hash:
 *   blue-100/blue-700, emerald-100/emerald-700, violet-100/violet-700,
 *   amber-100/amber-700, rose-100/rose-700, cyan-100/cyan-700,
 *   indigo-100/indigo-700, teal-100/teal-700
 *
 * ─── BORDER RADIUS ─────────────────────────────────────────────────────
 *
 * Inputs/Buttons:  rounded-lg  (8px)
 * Cards:           rounded-xl  (12px)
 * Modals:          rounded-2xl (16px)
 * Avatars:         rounded-full
 * Badges/Pills:    rounded-full
 * Logo icon:       rounded-lg  (8px)
 *
 * ─── SPACING ───────────────────────────────────────────────────────────
 *
 * Page padding:    px-6 lg:px-8 py-6 lg:py-8
 * Card padding:    p-4
 * Modal padding:   p-6 (body), px-6 py-4 (header)
 * Section gap:     mb-8 (between header and content)
 * Card grid gap:   gap-4
 * Input padding:   px-3.5 py-2.5
 * Button padding:  px-4 py-2.5
 *
 * ─── SHADOWS ───────────────────────────────────────────────────────────
 *
 * Card default:    (none — border only)
 * Card hover:      shadow-lg
 * Modal:           shadow-xl
 * Button:          shadow-sm
 * Dropdown:        shadow-xl
 *
 * ─── ANIMATIONS ────────────────────────────────────────────────────────
 *
 * fade-in:   opacity 0→1, 0.2s ease-out     — modal backdrop
 * scale-in:  scale 0.95→1 + fade, 0.15s     — modal content, dropdowns
 * slide-in:  translateX -100→0, 0.2s         — sidebar mobile
 *
 * ─── TYPOGRAPHY ────────────────────────────────────────────────────────
 *
 * Font Family:     Inter, system-ui stack
 * Page Title:      text-2xl font-bold text-gray-900
 * Card Title:      text-sm font-semibold text-gray-900
 * Body Text:       text-sm text-gray-500
 * Metadata:        text-xs text-gray-400
 * Badge:           text-[10px] or text-[11px] font-medium/font-semibold
 * Input Label:     text-sm font-medium text-gray-700
 */

// This file is intentionally documentation-only.
// All styling is applied via Tailwind utility classes in components.
