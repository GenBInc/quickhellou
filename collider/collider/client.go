// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"time"
)

const maxQueuedMsgCount = 1024

type client struct {
	id         string
	clientType string
	// rwc is the interface to access the websocket connection.
	// It is set after the client registers with the server.
	rwc io.ReadWriteCloser
	// msgs is the queued messages sent from this client.
	msgs []string
	// timer is used to remove this client if unregistered after a timeout.
	timer *time.Timer
}

// MessageBody JSON message body
type MessageBody struct {
	Name      string `json:"name"`
	ClientID  string `json:"clientId"`
	SessionID string `json:"sessionId"`
	Type      string `json:"type"`
	UUID      string `json:"uuid"`
}

// Message JSON message
type Message struct {
	Type string `json:"name"`
	Body MessageBody
}

func newClient(id string, clientType string, t *time.Timer) *client {
	c := client{id: id, clientType: clientType, timer: t}
	return &c
}

func (c *client) setTimer(t *time.Timer) {
	if c.timer != nil {
		c.timer.Stop()
	}
	c.timer = t
}

// register binds the ReadWriteCloser to the client if it's not done yet.
func (c *client) register(rwc io.ReadWriteCloser) error {
	c.setTimer(nil)
	c.rwc = rwc
	return nil
}

// deregister closes the ReadWriteCloser if it exists.
func (c *client) deregister() {
	if c.rwc != nil {
		c.rwc.Close()
		c.rwc = nil
	}
}

// registered returns true if the client has registered.
func (c *client) registered() bool {
	return c.rwc != nil
}

// enqueue adds a message to the client's message queue.
func (c *client) enqueue(msg string) error {
	if len(c.msgs) >= maxQueuedMsgCount {
		return errors.New("Too many messages queued for the client")
	}
	log.Printf("++++++ ENQUEUE message for <%s> ==> [%s]", c.id, msg)
	c.msgs = append(c.msgs, msg)
	return nil
}

func (c *client) removeSessionRefs(sessions []string) {
	tmp := c.msgs[:0]
	for _, m := range c.msgs {
		var message Message
		err := json.Unmarshal([]byte(m), &message)
		if err != nil {
			log.Printf("Message error %v", err)
		}
		hasRef := c.stringInSlice(message.Body.SessionID, sessions)
		if message.Body.Name == "remoteClientRegistered" && !hasRef {
			log.Printf("Message has no session %s reference. Removing.", message.Body.SessionID)
		} else {
			tmp = append(tmp, m)
		}
		c.msgs = tmp
	}
}

func (c *client) stringInSlice(a string, list []string) bool {
	for _, b := range list {
		if b == a {
			return true
		}
	}
	return false
}

// sendQueued the queued messages to the other client.
func (c *client) sendQueued(other *client) error {
	if c.id == other.id || other.rwc == nil {
		return errors.New("Invalid client")
	}
	log.Printf("++++++ sending queued messages %v", len(c.msgs))
	for _, m := range c.msgs {
		sendServerMsg(other.rwc, m)
		log.Printf("++++++ sent queued messages from %s to %s", c.id, other.id)
	}
	c.msgs = nil
	return nil
}

// send sends the message to the other client if the other client has registered,
// or queues the message otherwise.
func (c *client) send(other *client, msg string) error {
	if c.id == other.id {
		return errors.New("Invalid client")
	}
	if other.rwc != nil {
		return sendServerMsg(other.rwc, msg)
	}
	return c.enqueue(msg)
}

// respond sends the return message to the client
func (c *client) respond(msg string) error {
	if c.rwc != nil {
		return sendServerMsg(c.rwc, msg)
	}
	return c.enqueue(msg)
}
