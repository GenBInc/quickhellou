package collider

// Session type declaration
type Session struct {
	id   string
	keys map[string]bool
	it   int
}

func newSession(id string) *Session {
	return &Session{id: id, keys: make(map[string]bool)}
}

func (s *Session) add(key string) {
	s.keys[key] = true
}

func (s *Session) remove(key string) {
	delete(s.keys, key)
}

func (s *Session) getNext() string {
	for k := range s.keys {
		return k
	}

	return ""
}
