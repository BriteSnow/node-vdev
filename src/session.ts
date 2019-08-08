
/**
 * Static session for a command session. This can be static as it is for a command line. 
 * 
 * Note: When vdev used as an API (not main use-case for now) command session will need to be redesigned.
 */
type SessionState = 'NO_LOCAL_REGISTRY';


const currentStates = new Set<SessionState>();

export function addSessionState(state: SessionState) {
	currentStates.add(state);
}

export function hasSessionState(state: SessionState) {
	return currentStates.has(state);
}