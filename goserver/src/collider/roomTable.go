// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

// A thread-safe map of rooms.
type roomTable struct {
	lock            sync.Mutex
	rooms           map[string]*room
	registerTimeout time.Duration
	roomSrvURL      string
}

func newRoomTable(to time.Duration, rs string) *roomTable {
	return &roomTable{rooms: make(map[string]*room), registerTimeout: to, roomSrvURL: rs}
}

// room returns the room specified by |id|, or creates the room if it does not exist.
func (rt *roomTable) room(id string) *room {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	return rt.roomLocked(id)
}

// roomTyped returns the typed room specified by |id|, or creates the room if it does not exist.
func (rt *roomTable) roomTyped(id string, roomType string) *room {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	return rt.roomLockedTyped(id, roomType)
}

// roomLocked gets or creates the room without acquiring the lock. Used when the caller already acquired the lock.
func (rt *roomTable) roomLocked(id string) *room {
	if r, ok := rt.rooms[id]; ok {
		return r
	}
	log.Printf("WARN: auto-typed room created")
	rt.rooms[id] = newRoom(rt, id, "room", rt.registerTimeout, rt.roomSrvURL)
	if !rt.rooms[id].isSupport() {
		log.Printf("Created room %s", id)
	}
	return rt.rooms[id]
}

// roomLockedTyped gets or creates the room without acquiring the lock. Used when the caller already acquired the lock.
func (rt *roomTable) roomLockedTyped(id string, roomType string) *room {
	if r, ok := rt.rooms[id]; ok {
		return r
	}
	rt.rooms[id] = newRoom(rt, id, roomType, rt.registerTimeout, rt.roomSrvURL)
	log.Printf("Created room %s", id)

	return rt.rooms[id]
}

// remove removes the client. If the room becomes empty, it also removes the room.
func (rt *roomTable) remove(rid string, cid string) {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	rt.removeLocked(rid, cid)
}

// removeLocked removes the client without acquiring the lock. Used when the caller already acquired the lock.
func (rt *roomTable) removeLocked(rid string, cid string) {
	if r := rt.rooms[rid]; r != nil {
		log.Printf("Removing locked client %s", cid)
		r.remove(cid)
		if r.empty() {
			r.stopMonitor()
			delete(rt.rooms, rid)
			resp, err := http.Post(r.roomSrvURL+"/removeRoom/"+r.id, "text", nil)
			log.Printf("POSTED ROOM CLEANUP %s. [%v]", r.id, resp)
			if err != nil {
				log.Printf("POST ROOM CLEAN FAILURE %s: %v", r.roomSrvURL, err)
			}
			if !r.isSupport() {
				log.Printf("Removed room %s", rid)
			}
		}
	}
}

func (rt *roomTable) touch(rid string, srcID string) error {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLocked(rid)
	return r.touch(srcID)
}

// send forwards the message to the room. If the room does not exist, it will create one.
func (rt *roomTable) send(rid string, srcID string, msg string, isMessagePersistant bool) error {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLocked(rid)
	return r.send(srcID, msg, isMessagePersistant)
}

// send forwards the message to the other client of the room specified by id. If the room does not exist, it will create one.
func (rt *roomTable) sendToClient(rid string, srcID string, otherID string, msg string) error {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLocked(rid)
	return r.sendToClient(srcID, otherID, msg)
}

func (rt *roomTable) broadcast(rid string, srcID string, body string) error {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLocked(rid)

	chunk := map[string]interface{}{"type": "broadcast", "body": body}
	msg, _ := json.Marshal(chunk)

	return r.broadcast(srcID, string(msg))
}

func (rt *roomTable) sessionUpdate(rid string, msg string) {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLocked(rid)
	r.sessionUpdate(msg)
}

func (rt *roomTable) pingResponseHandler(rid string, srcID string, clientType string) {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLocked(rid)

	r.respondOnPingRequest(srcID, clientType)
}

// list room clients. If the room does not exist, it will create one.
func (rt *roomTable) listRoomClients(rid string, srcID string, clientType string) error {
	log.Printf("listRoomClients %s", srcID)

	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLocked(rid)

	cids := []string{}
	for _, oc := range r.clients {
		var isType bool
		if oc.clientType == "" {
			isType = oc.id != srcID
		} else {
			isType = oc.id != srcID && oc.clientType == clientType
		}
		if isType {
			cids = append(cids, oc.id)
		}
	}

	chunk := map[string]interface{}{"type": "list-clients", "body": cids}
	msg, _ := json.Marshal(chunk)
	return r.respond(srcID, string(msg))
}

func (rt *roomTable) sendNamedOkResponse(rid string, cid string, name string) error {
	chunk := map[string]interface{}{"name": name, "status": "ok"}
	msg, _ := json.Marshal(chunk)

	return rt.sendResponse(rid, cid, string(msg))
}

func (rt *roomTable) sendResponse(rid string, cid string, body string) error {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLocked(rid)

	chunk := map[string]interface{}{"type": "response", "body": body}
	msg, _ := json.Marshal(chunk)
	return r.respond(cid, string(msg))
}

// register forwards the register request to the room. If the room does not exist, it will create one.
func (rt *roomTable) register(rid string, rtype string, cid string, ctype string, rwc io.ReadWriteCloser) error {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	r := rt.roomLockedTyped(rid, rtype)
	return r.register(cid, ctype, rwc)
}

// deregister clears the client's websocket registration.
// We keep the client around until after a timeout, so that users roaming between networks can seamlessly reconnect.
func (rt *roomTable) deregister(rid string, cid string) {
	rt.lock.Lock()
	defer rt.lock.Unlock()
	if r := rt.rooms[rid]; r != nil {
		if c := r.clients[cid]; c != nil {
			if c.registered() {
				c.deregister()

				c.setTimer(time.AfterFunc(rt.registerTimeout, func() {
					rt.removeIfUnregistered(rid, c)
				}))
				if !r.isSupport() {
					log.Printf("Deregistered client %s from room %s", c.id, rid)
				}
				return
			}
		}
	}
}

// removeIfUnregistered removes the client if it has not registered.
func (rt *roomTable) removeIfUnregistered(rid string, c *client) {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	if r := rt.rooms[rid]; r != nil {
		if c == r.clients[c.id] {
			log.Printf("Removing client %s %v", c.id == "")
			if !c.registered() {
				rt.removeLocked(rid, c.id)
				if !r.isSupport() {
					log.Printf("Removing client %s from room %s due to timeout", c.id, rid)
				}
				return
			}
		}
	}
}

func (rt *roomTable) wsCount() int {
	rt.lock.Lock()
	defer rt.lock.Unlock()

	count := 0
	for _, r := range rt.rooms {
		count = count + r.wsCount()
	}
	return count
}
