export interface WebBundle {

	name: string;
	/** The entries, support wild cards, to be compiled */
	entries: string | string[];

	/** To specify glob/files to watch in place of the entries (only used in watch mode, and not for .js/.ts) */
	watch?: string | string[];

	rollupOptions?: any;
	dist: string; // distribution file path (from .dir)


	type?: string; // set in the buildWebBundles
	dir?: string; // set in the initWebBundle
}