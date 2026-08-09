## 2024-05-24 - Shadcn Form Control Wrapping
**Learning:** `NumericFormat` and other custom input components used directly inside `FormItem` without `FormControl` wrapping do not receive the `id` prop, causing labels to lose association with the input.
**Action:** When using custom inputs in Shadcn forms, verify they are wrapped in `FormControl` to ensure correct `id` passing and accessibility.
