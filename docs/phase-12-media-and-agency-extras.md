# Phase 12: Media and agency extras

**Status: Later · Size: M–L (pick items by demand)**

Each item is independent; schedule them based on customer requests and churn reasons from Phases 2 and 5.

## 1. Video and voice comments
- Record screen, camera or voice in the comment composer (`MediaRecorder`, max 3 minutes, WebM/MP4), upload as an attachment (counts against storage).
- Transcribe on upload (speech-to-text) and show the transcript under the player; feed it into Phase 9 summaries.
- Guests can record too when comments are allowed.
- Why: MarkUp.io (Loom-style recording) and Userback (video feedback with AI summaries) offer it.

## 2. Video file review
- New project type `video`: upload MP4/MOV, frame-accurate pins (`timecode` + x/y), comments on a timeline, playback speed, compare versions.
- Transcoding to web-friendly MP4 and a poster image (ffmpeg worker); storage limits per plan.
- Why: MarkUp.io, Ziflow and Filestage review video; agencies doing campaigns need one tool.

## 3. Side-by-side breakpoints
- A "Compare" mode that shows desktop, tablet and mobile iframes next to each other with pins on each.
- Why: Huddlekit's Canvas View compares breakpoints side by side.

## 4. White-label review links (Pro, Enterprise)
- Custom domain for review links (`review.client-agency.com` via CNAME + automatic TLS), agency logo and colors on the guest pages and emails, "Powered by Kommently" removable on Enterprise.
- Requires moving review/proxy traffic to a separate sandbox domain first (see Known issues in `CLAUDE.md`).

## 5. Session replay (optional)
- Last 60 seconds of DOM events around a pin on proxied sites (rrweb), masked inputs, viewable by members only.
- Why: Marker.io records the last three minutes; heavy on storage and privacy, so only if developers ask.

## Sources
- [MarkUp partners with Loom](https://cxtoday.com/visual-feedback-platform-markup-partners-with-loom)
- [AI features in Userback – video summaries](https://support.userback.io/en/articles/13265550-ai-features-in-userback)
- [Huddlekit – breakpoints side by side](https://alternativeto.net/software/huddlekit/about)
- [Marker.io session replay](https://marker.io/features/session-replay)
- [Top online proofing tools 2026 – Filestage](https://filestage.io/blog/online-proofing-tools/)
