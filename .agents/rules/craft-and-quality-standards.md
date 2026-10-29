# Craft, Design & Quality Standards

Strict guidelines governing visual design, copywriting, integrity, and release readiness.

## 1. Visual & UI Guidelines (No "Vibe-Coded" Aesthetics)
- **Zero Purple/Violet Hype Gradients:** Avoid generic AI/crypto/vibe gradients (e.g., `from-purple-600 to-indigo-600` or violet blurs). Use disciplined, intentional palettes (e.g., neutral slate/zinc paired with a dedicated brand accent like blue, emerald, or amber).
- **No Pill-Shaped Buttons:** Interactive buttons must never use `rounded-full`. Use clean geometric rounding (`rounded-md`, `rounded-lg`, or crisp corners `rounded-sm`).
- **No Emoji Icons:** Do not use emoji symbols as UI icons or bullet points. Use clean SVG icon sets (Lucide, Heroicons, or dedicated SVGs).
- **No Over-The-Top Animations:** Avoid gratuitous scroll-jacking, heavy 3D tilt cards, cursor trails, floating particles, and jarring marquee loops. Transitions must be subtle, fast (150-200ms), and functional.
- **No Cursor Animations:** Custom animated cursors or trailing magnetic dots are strictly banned.
- **No AI-Slop Imagery:** Never use synthetic AI stock imagery (plastic-looking AI portraits, glowing wireframe hands, generic futuristic robot concepts). Use clean SVG diagrams, crisp product screenshots, real asset previews, or authentic photography.

## 2. Copywriting & Content Integrity
- **No Em Dashes:** Never use em dashes anywhere in copy, page titles, comments, or UI text. Use standard hyphens (`-`), colons (`:`), or commas.
- **No Vague Hero Text:** Avoid hollow buzzwords. State directly and plainly what the product does, who it is for, and how it works.
- **Zero Fake Metrics:** Never generate artificial counter stats. Show real numbers or omit stat counters entirely until verified.
- **Zero Fake Reviews:** Never generate fabricated customer testimonials, fake quotes, or synthetic avatars.
- **No AI Slop Copy:** Write copy that is human, practical, concise, and technically accurate.

## 3. Pre-Launch Gate (Must Be Met Before Launch)
No site or application is considered ready to launch until all 5 items are satisfied:
1. **Custom Domain:** Connected and properly configured in DNS/hosting settings.
2. **Dedicated Favicon:** Custom SVG/PNG/ICO favicon added, replacing default framework favicons.
3. **No AI Badges:** Remove any "Made with AI", "Built with v0", or generative watermarks.
4. **Privacy Policy Page:** Live at `/privacy` detailing data handling, file storage, and user rights.
5. **Terms & Conditions Page:** Live at `/terms` covering acceptable use, payments, and liability.

## 4. Execution Standard
- Verify all implementations thoroughly before concluding tasks. Make zero avoidable errors.
