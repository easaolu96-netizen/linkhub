import { z } from "zod";

// Zod probes `Function("")` once to see whether it may compile faster
// validators. The strict CSP (no 'unsafe-eval') blocks that, which shows up
// as a CSP violation in the browser console. Our schemas are tiny, so skip
// the probe. Browser-side code imports `z` from here instead of "zod".
z.config({ jitless: true });

export { z };
