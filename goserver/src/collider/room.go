// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

const maxRoomCapacity = 64

const monitorTimeoutSec = 30

type room struct {
	parent   *roomTable
	id       string
	roomType string
	// A mapping from the client ID to the client object.
	clients                    map[string]*client
	activeClientIds            []string
	isActivitityMonitorRunning bool
	monitorTimer               *time.Timer
	registerTimeout            time.Duration
	roomSrvURL                 string
}

func newRoom(p *roomTable, id string, roomType string, to time.Duration, rs string) *room {
	return &room{parent: p, id: id, roomType: roomType, clients: make(map[string]*client), isActivitityMonitorRunning: false, registerTimeout: to, roomSrvURL: rs}
}

// client returns the client, or creates it if it does not exist and the room is not full.
func (rm *room) client(clientID string, clientType string) (*client, error) {
	if c, ok := rm.clients[clientID]; ok {
		return c, nil
	}

	if len(rm.clients) >= maxRoomCapacity && rm.isRoom() {
		log.Printf("Room %s is full, not adding client %s", rm.id, clientID)
		return nil, errors.New("Max room capacity reached")
	}

	var timer *time.Timer
	if rm.parent != nil {
		timer = time.AfterFunc(rm.registerTimeout, func() {
			if c := rm.clients[clientID]; c != nil {
				rm.parent.removeIfUnregistered(rm.id, c)
			}
		})
	}

	rm.clients[clientID] = newClient(clientID, clientType, timer)

	if !rm.isSupport() {
		log.Printf("Added client %s to room %s", clientID, rm.id)
		log.Printf("ROOM %s: %v", rm.id, rm.clients)
	}

	return rm.clients[clientID], nil
}

// register binds a client to the ReadWriteCloser.
func (rm *room) register(clientID string, clientType string, rwc io.ReadWriteCloser) error {
	c, err := rm.client(clientID, clientType)
	if err != nil {
		return err
	}
	if err = c.register(rwc); err != nil {
		return err
	}

	if !rm.isSupport() {
		log.Printf("Client %s registered in room %s", clientID, rm.id)
		log.Printf("ROOM %s: %v", rm.id, rm.clients)
	}

	// Sends the queued messages from the other client of the room.
	if len(rm.clients) > 1 && (rm.isRoom() || rm.isClientBoard()) {
		for _, otherClient := range rm.clients {
			log.Printf("++++++ room: register sendQueued %s => %s", c.id, otherClient.id)
			otherClient.sendQueued(c)
		}
	}

	// if the room is app room, flush client list
	if rm.isApp() || rm.isClientBoard() {
		err = rm.flushClientList(clientType)

		if err != nil {
			return err
		}
	}
	if rm.isRoom() {
		err = rm.runMonitor()
	}
	return nil
}

func (rm *room) touch(srcClientID string) error {
	client, err := rm.client(srcClientID, "")
	if err != nil {
		return err
	}

	if len(rm.clients) > 1 && rm.isRoom() {
		for _, otherClient := range rm.clients {
			log.Printf("++++++ touch sendQueued %s => %s", srcClientID, otherClient.id)
			otherClient.sendQueued(client)
		}
	}

	return nil
}

// send sends the message to the other client of the room, or queues the message if the other client has not joined.
func (rm *room) send(srcClientID string, msg string, isMessagePersistant bool) error {
	// Queue the message if the other client has not joined.
	if (rm.isRoom() || rm.isClientBoard()) && isMessagePersistant {
		src, err := rm.client(srcClientID, "")
		if err != nil {
			return err
		}
		return src.enqueue(msg)
	}

	// The room must be corrupted.
	//return fmt.Errorf("Corrupted room %+v", rm)
	return nil
}

// sendToClient sends the message to the other client of the room specified by id, or queues the message if the other client has not joined.
func (rm *room) sendToClient(srcClientID string, otherClientID string, msg string) error {
	src, err := rm.client(srcClientID, "")
	if err != nil {
		return err
	}

	other, err := rm.client(otherClientID, "")
	if err != nil {
		return err
	}

	// Queue the message if the other client has not joined.
	if other == nil {
		log.Printf("ENQ sendToClient")
		return rm.clients[srcClientID].enqueue(msg)
	}

	// Send the message to the other client of the room.
	// log.Printf("sendToClient %s => %s %s", src.id, other.id, msg)
	err = src.send(other, msg)

	if err != nil {
		return err
	}

	// The room must be corrupted.
	return fmt.Errorf("Corrupted room %+v", rm)
}

// send sends the message to the other client of the room, or queues the message if the other client has not joined.
func (rm *room) respond(srcClientID string, msg string) error {
	src, err := rm.client(srcClientID, "")
	if err != nil {
		return err
	}

	// Send the response to the client.
	err = src.respond(msg)

	if err != nil {
		return err
	}

	// The room must be corrupted.
	return fmt.Errorf("Corrupted room %+v", rm)
}

// broadcast sends the message to all clients of the room, or queues the message if the other client has not joined.
func (rm *room) broadcast(clientID string, msg string) error {

	// Send the message to the all client of the room.
	for _, oc := range rm.clients {
		if clientID != oc.id {
			rm.push(oc, msg)
		}
	}

	// The room must be corrupted.
	return fmt.Errorf("Corrupted room %+v", rm)
}

// remove closes the client connection and removes the client specified by the |clientID|.
func (rm *room) remove(clientID string) {
	log.Printf("Removed client %s isEmpty %t", clientID, clientID == "")
	if c, ok := rm.clients[clientID]; ok {
		c.deregister()
		delete(rm.clients, clientID)
		if !rm.isSupport() {
			log.Printf("Removed client %s from room %s", clientID, rm.id)
			log.Printf("ROOM %s: %v", rm.id, rm.clients)
		}
		// Send bye to the room Server.
		if rm.isRoom() && clientID != ""  {
			log.Printf("Send bye from %s to room %s.", clientID, rm.id)
			resp, err := http.Post(rm.roomSrvURL+"/bye/"+rm.id+"/"+clientID, "text", nil)

			if err != nil {
				log.Printf("Failed to post BYE to room server %s: %v", rm.roomSrvURL, err)
			}

			if resp != nil && resp.Body != nil {
				resp.Body.Close()
			}
		} else {
			rm.flushClientList(c.clientType)
		}
	}
}

// empty returns true if there is no client in the room.
func (rm *room) empty() bool {
	return len(rm.clients) == 0
}

func (rm *room) wsCount() int {
	count := 0
	for _, c := range rm.clients {
		if c.registered() {
			count++
		}
	}
	return count
}

// isRoom return true if room is a video room
func (rm *room) isRoom() bool {
	return strings.Compare(rm.roomType, "room") == 0
}

// isRoom return true if room is a support room
func (rm *room) isSupport() bool {
	return strings.Compare(rm.id, "support") == 0
}

// isApp return true if room is a widget application
func (rm *room) isApp() bool {
	return strings.Compare(rm.roomType, "app") == 0
}

// isClientBoard return true if room is a client board application
func (rm *room) isClientBoard() bool {
	return strings.Compare(rm.roomType, "client_board") == 0
}

// flushClientList flushes client list for all registered clients
func (rm *room) flushClientList(clientType string) error {
	for _, c := range rm.clients {
		run := true //c.clientType == "" || (clientType != "" && c.clientType != clientType)
		if run {
			msg := rm.getClientListsMsg(c.id, c.clientType)
			err := c.respond(msg)

			if err != nil {
				return err
			}
		}
	}

	return nil
}

// getClientListsMsg returns message containing list of all other registered client
func (rm *room) getClientListsMsg(cid string, ctype string) string {
	cids := []string{}
	for _, oc := range rm.clients {
		// run when other client than the user, and type is not set or is set but have a different type
		// the user doesn't receive messages about users of the same type, unless the type is not set
		run := oc.id != cid && (ctype == "" || (ctype != "" && strings.Compare(oc.clientType, ctype) != 0))
		if run {
			cids = append(cids, oc.id)
		}
	}
	chunk := map[string]interface{}{"type": "list-clients", "body": cids}
	msg, _ := json.Marshal(chunk)
	return string(msg)
}

func (rm *room) getClientPingMsg(cid string, ctype string) string {
	cids := []string{}
	for _, oc := range rm.clients {
		// run when other client than the user, and type is not set or is set but have a different type
		// the user doesn't receive messages about users of the same type, unless the type is not set
		run := oc.id != cid && (ctype == "" || (ctype != "" && strings.Compare(oc.clientType, ctype) != 0))
		if run {
			cids = append(cids, oc.id)
		}
	}
	chunk := map[string]interface{}{"type": "ping"}
	msg, _ := json.Marshal(chunk)
	return string(msg)
}

// push sends the message to the client if the other client has registered,
// or queues the message otherwise.
func (rm *room) push(client *client, msg string) error {
	if client.rwc != nil {
		return sendServerMsg(client.rwc, msg)
	}

	if rm.isRoom() {
		return client.enqueue(msg)
	}

	return nil
}

// clears all references to non existant sessions in the pyapp
func (rm *room) sessionUpdate(msg string) {
	msg = strings.Replace(msg, "'", "\"", -1)
	var sessions []string
	_ = json.Unmarshal([]byte(msg), &sessions)
	for _, c := range rm.clients {
		c.removeSessionRefs(sessions)
	}
}

func (rm *room) runMonitor() error {
	log.Printf("Run client reachability monitor.")
	rm.isActivitityMonitorRunning = true
	err := rm.runMonitorCycle()
	if err != nil {
		return err
	}
	return nil
}

func (rm *room) stopMonitor() {
	if !rm.isActivitityMonitorRunning {
		// log.Printf("Monitor currently not active.")
		return
	}

	rm.isActivitityMonitorRunning = false
	if rm.monitorTimer != nil {
		rm.monitorTimer.Stop()
	}
}

func (rm *room) runMonitorCycle() error {
	if !rm.isActivitityMonitorRunning {
		// clear timeouts
		rm.monitorTimer.Stop()
	}

	rm.activeClientIds = []string{}
	if len(rm.clients) == 0 {
		log.Printf("STOP Monitor stop, no clients.")
		rm.isActivitityMonitorRunning = false
		return nil
	}

	for _, c := range rm.clients {
		run := true
		if run {
			msg := rm.getClientPingMsg(c.id, c.clientType)
			err := c.respond(msg)

			if err != nil {
				return err
			}
		}
	}
	rm.monitorTimer = time.AfterFunc(monitorTimeoutSec*time.Second, func() {
		rm.checkClientReachability()
	})

	return nil
}

func (rm *room) respondOnPingRequest(srcID string, clientType string) {
	rm.activeClientIds = append(rm.activeClientIds, srcID)
}

func (rm *room) checkClientReachability() {
	rm.stopMonitor()
	// if len(rm.activeClientIds) != len(rm.clients) {
	for _, c := range rm.clients {
		isClientResponsive := contains(rm.activeClientIds, c.id)
		if !isClientResponsive {
			log.Printf("REMOVE Client %s is not reachable. Removing from the room.", c.id)
			rm.remove(c.id)
			if rm.isRoom() {
				chunk := map[string]interface{}{"type": "unreachable_client", "body": c.id}
				msg, _ := json.Marshal(chunk)
				for _, oc := range rm.clients {
					rm.push(oc, string(msg))
				}
				resp, err := http.Post(rm.roomSrvURL+"/leave/"+rm.id+"/"+c.id, "text", nil)
				log.Printf("POSTED Posted leave for client %s. Removing him from the room.", c.id)
				if err != nil {
					log.Printf("FAILURE Failed to post LEAVE to room server %s: %v", rm.roomSrvURL, err)
				}

				if resp != nil && resp.Body != nil {
					resp.Body.Close()
				}
			} else {
				rm.flushClientList(c.clientType)
			}

		}
	}
	//}
	rm.runMonitorCycle()
}

func contains(arr []string, str string) bool {
	for _, a := range arr {
		if a == str {
			return true
		}
	}
	return false
}
