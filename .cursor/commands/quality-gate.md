---
description: Run the mandatory production quality gate
---

# 🚨 PRODUCTION QUALITY GATE - MANDATORY PRE-COMMIT CHECK

**This is your LAST CHANCE before production. Zero tolerance. If this fails, DO NOT COMMIT.**

Run this command exactly as written:

```bash
npm run quality-gate
```

**FIX ALL errors, warnings, unused code, and duplicates. NO exceptions.**

## Manual Compliance Check (After Automated Checks Pass)

Verify these critical rules. Each violation is a production blocker:

- ✅ **NO `let` variables** - Use `const` only. Check: `grep -rn "\blet\s+\w+" app/ components/`
- ✅ **NO imperative loops** - Use `map`/`filter`/`reduce`. Check: `grep -rn "\.forEach\|for\s*(\|while\s*(" app/ components/`
- ✅ **NO hex codes or arbitrary Tailwind** - Use standard utilities only. Check: `grep -rn "#[0-9a-fA-F]\{3,6\}\|\[#[0-9a-fA-F]" app/ components/`
- ✅ **Components under 375 lines** - Refactor if over. Check: `find app/ components/ -name "*.tsx" -exec wc -l {} + | awk '$1 > 375'`
- ✅ **Server Actions follow pattern** - Auth → Zod → Transaction → History → revalidatePath → Return
- ✅ **Price fields have billing periods** - Must support monthly/yearly/onetime
- ✅ **No clones or duplicate code** - `find-duplicates` must pass with zero clones. Rework any reported duplicates into shared modules, helpers in `lib/`, or shared components in `components/` / `components/shared/`. Duplicates are NOT acceptable; refactor into manageable modules.
- ✅ **UI is Czech, code is English** - Verify language compliance

**If ANY check fails: STOP. Fix it. Re-run. Only commit when EVERYTHING passes.**