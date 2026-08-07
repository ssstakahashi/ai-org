import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const skewProtectionEnabled = process.env.ENABLE_SKEW_PROTECTION === "1";

const base = defineCloudflareConfig({
	// Uncomment to enable R2 cache,
	// It should be imported as:
	// `import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";`
	// See https://opennext.js.org/cloudflare/caching for more details
	// incrementalCache: r2IncrementalCache,
});

export default {
	...base,
	cloudflare: {
		...base.cloudflare,
		skewProtection: {
			enabled: skewProtectionEnabled,
		},
	},
};
