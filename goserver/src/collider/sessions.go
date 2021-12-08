package collider

import "log"

// Sessions type declaration
type Sessions struct {
	sessionMap map[string]*Session
}

func newSessions() *Sessions {
	return &Sessions{sessionMap: make(map[string]*Session)}
}

func (sessions *Sessions) addSession(clientID string, sessionID string) {
	if _, exists := sessions.sessionMap[clientID]; !exists {
		sessions.sessionMap[clientID] = newSession(clientID)
	}

	sessions.sessionMap[clientID].add(sessionID)
	log.Printf("Add session %s for client %s", sessionID, clientID)
	log.Printf("%v", sessions.sessionMap[clientID])
}

func (sessions *Sessions) removeSession(clientID string, sessionID string) {
	if _, exists := sessions.sessionMap[clientID]; exists {
		sessions.sessionMap[clientID].remove(sessionID)
	}

	log.Printf("Remove session %s for client %s", sessionID, clientID)
	log.Printf("%v", sessions.sessionMap[clientID])
}

func (sessions *Sessions) exists(clientID string) bool {
	return sessions.sessionMap[clientID] != nil
}
