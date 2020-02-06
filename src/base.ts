


/** Common interface for Block and Realm */
export interface BaseObj {
	// This is the vdev.system
	system: string;
	__version__: string;

	/** imageTag to be used (with the starting ':' (default to "latest") */
	imageTag?: string;
}