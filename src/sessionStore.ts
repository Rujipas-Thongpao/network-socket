interface Session {
	sessionID: string,
	userID: string,
	username: string,
	connected: boolean
}

/* abstract */ class SessionStore {
	findSession(id: string) { }
	saveSession(id: string, session: Session) { }
	findAllSessions() { }
}


class InMemorySessionStore extends SessionStore {
	sessions: Map<string, Session>;
	constructor() {
		super();
		this.sessions = new Map();
	}

	findSession(id: string) {
		return this.sessions.get(id);
	}

	saveSession(id: string, session: Session) {
		this.sessions.set(id, session);
	}

	findAllSessions() {
		return [...this.sessions.values()];
	}
}
export { InMemorySessionStore, Session }

//module.exports = {
//	InMemorySessionStore
//};
