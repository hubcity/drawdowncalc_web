## 2024-03-01 - Add ARIA Labels to TooltipTriggers
**Learning:** Icon-only buttons using Radix UI `TooltipTrigger` (e.g., wrapping `Info` or `AlertTriangle` from `lucide-react`) lack accessible names by default and require explicit `aria-label` attributes for screen reader compatibility.
**Action:** Always add descriptive `aria-label`s to `TooltipTrigger` or generic icon-only `<button>`s when adding or modifying them in this design system.
