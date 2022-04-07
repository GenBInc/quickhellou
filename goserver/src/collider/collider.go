// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

// Package collider implements a signaling server based on WebSocket.
package collider

import (
	"crypto/tls"
	"encoding/json"
	"errors"
	"html"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/websocket"
)

const registerTimeoutSec = 5

// This is a temporary solution to avoid holding a zombie connection forever, by
// setting a 1 day timeout on reading from the WebSocket connection.
const wsReadTimeoutSec = 60 * 60 * 24

// Collider type declaration
type Collider struct {
	*roomTable
	dash *dashboard
}

// NewCollider creates new Collider instance
func NewCollider(rs string) *Collider {
	return &Collider{
		roomTable: newRoomTable(time.Second*registerTimeoutSec, rs),
		dash:      newDashboard(),
	}
}

// Run starts the collider server and blocks the thread until the program exits.
func (c *Collider) Run(p int, useTLS bool) {
	http.Handle("/ws", websocket.Handler(c.wsHandler))
	http.HandleFunc("/status", c.httpStatusHandler)
	http.HandleFunc("/", c.httpHandler)

	var e error

	pstr := ":" + strconv.Itoa(p)
	if useTLS {
		config := &tls.Config{
			// Only allow ciphers that support forward secrecy for iOS9 compatibility:
			// https://developer.apple.com/library/prerelease/ios/technotes/App-Transport-Security-Technote/
			CipherSuites: []uint16{
				tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
				tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
				tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
				tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
				tls.TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA,
				tls.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA,
				tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA,
			},
			PreferServerCipherSuites: true,
		}
		server := &http.Server{Addr: pstr, Handler: nil, TLSConfig: config}

		e = server.ListenAndServeTLS("/goserver/ssl/qhellouwild.crt", "/goserver/ssl/qhellouwild.key")
	} else {
		e = http.ListenAndServe(pstr, nil)
	}

	if e != nil {
		log.Fatal("Run: " + e.Error())
	}
}

// httpStatusHandler is a HTTP handler that handles GET requests to get the
// status of collider.
func (c *Collider) httpStatusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Add("Access-Control-Allow-Methods", "GET")

	rp := c.dash.getReport(c.roomTable)
	enc := json.NewEncoder(w)
	if err := enc.Encode(rp); err != nil {
		err = errors.New("Failed to encode to JSON: err=" + err.Error())
		http.Error(w, err.Error(), http.StatusInternalServerError)
		c.dash.onHTTPErr(err)
	}
}

// httpHandler is a HTTP handler that handles GET/POST/DELETE requests.
// POST request to path "/$ROOMID/$CLIENTID" is used to send a message to the other client of the room.
// $CLIENTID is the source client ID.
// The request must have a form value "msg", which is the message to send.
// DELETE request to path "/$ROOMID/$CLIENTID" is used to delete all records of a client, including the queued message from the client.
// "OK" is returned if the request is valid.
func (c *Collider) httpHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Access-Control-Allow-Origin", "*")
	w.Header().Add("Access-Control-Allow-Methods", "POST, DELETE")
	p := strings.Split(r.URL.Path, "/")

	if len(p) != 3 {
		c.httpError("Invalid path: "+html.EscapeString(r.URL.Path), w)
		return
	}

	if r.Method == "POST" && p[1] == "session-update" {
		rid := p[2]
		body, e := ioutil.ReadAll(r.Body)
		if e != nil {
			c.httpError("Failed to read session update body: "+e.Error(), w)
			return
		}
		m := string(body)
		c.roomTable.sessionUpdate(rid, m)
		w.WriteHeader(200)
		return
	}

	rid, cid := p[1], p[2]
	log.Printf("HTTP URL (%s) methos (%s) room (%s) user (%s)", r.URL.Path, r.Method, rid, cid)

	switch r.Method {
	case "POST":
		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			c.httpError("Failed to read request body: "+err.Error(), w)
			return
		}
		m := string(body)
		if m == "" {
			c.httpError("Empty request body", w)
			return
		}
		if m == "DELETE" {
			c.roomTable.remove(rid, cid)
			return
		}
		if err := c.roomTable.send(rid, cid, m, true); err != nil {
			c.httpError("Failed to send the message: "+err.Error(), w)
			return
		}
	case "DELETE":
		c.roomTable.remove(rid, cid)
	default:
		return
	}

	io.WriteString(w, "OK\n")
}

// wsHandler is a WebSocket server that handles requests from the WebSocket client in the form of:
// 1. { 'cmd': 'register', 'roomid': $ROOM, 'roomtype': $ROOM_TYPE 'clientid': $CLIENT', 'clienttype': $CLIENT_TYPE' },
// which binds the WebSocket client to a client ID and room ID.
// A client should send this message only once right after the connection is open.
// or
// 2. { 'cmd': 'send', 'msg': $MSG }, which sends the message to the other client of the room.
// It should be sent to the server only after 'regiser' has been sent.
// The message may be cached by the server if the other client has not joined.
// or
// 3. {cmd:'list-clients','roomid':$ROOM, 'clientid': $CLIENT'}
// get list of clients associated to given room
// or
// 4. {cmd:'send-to-other','roomid':$ROOM, 'clientid': $CLIENT', 'otherid': $OTHER'}
// sends message to other client
// or
// 5. {cmd:'ping','roomid':$ROOM, 'clientid': $CLIENT'}
// or
// 6. {cmd:'session_update','roomid':$ROOM, 'clientid': $CLIENT'}
//
//
// Unexpected messages will cause the WebSocket connection to be closed.
func (c *Collider) wsHandler(ws *websocket.Conn) {
	var rid, cid, ctype string

	registered := false

	var msg wsClientMsg
loop:
	for {
		err := ws.SetReadDeadline(time.Now().Add(time.Duration(wsReadTimeoutSec) * time.Second))
		if err != nil {
			c.wsError("ws.SetReadDeadline error: "+err.Error(), ws)
			break
		}

		err = websocket.JSON.Receive(ws, &msg)
		if err != nil {
			if err.Error() != "EOF" {
				c.wsError("websocket.JSON.Receive error: "+err.Error(), ws)
			}
			break
		}
		switch msg.Cmd {
		case "register":

			if strings.Compare(msg.RoomType, "") == 0 {
				msg.RoomType = "room"
			}

			if registered && strings.Compare(msg.RoomType, "room") == 0 {
				c.wsError("Duplicated register request", ws)
				break loop
			}

			if msg.RoomID == "" || msg.ClientID == "" {
				c.wsError("Invalid register request: missing 'clientid' or 'roomid'", ws)
				break loop
			}

			if err = c.roomTable.register(msg.RoomID, msg.RoomType, msg.ClientID, msg.ClientType, ws); err != nil {
				c.wsError(err.Error(), ws)
				break loop
			}
			registered, rid, cid = true, msg.RoomID, msg.ClientID
			c.dash.incrWs()

			c.roomTable.sendNamedOkResponse(rid, cid, "register")

			defer c.roomTable.deregister(rid, cid)
			break
		case "deregister":
			if strings.Compare(msg.RoomType, "") == 0 {
				msg.RoomType = "room"
			}

			if !registered && strings.Compare(msg.RoomType, "room") == 0 {
				c.wsError("Client is not registered", ws)
				break loop
			}

			if msg.RoomID == "" || msg.ClientID == "" {
				c.wsError("Invalid deregister request: missing 'clientid' or 'roomid'", ws)
				break loop
			}

			c.roomTable.deregister(msg.RoomID, msg.ClientID)
			registered = false
			break
		case "touch":
			if !registered {
				c.wsError("Client not registered", ws)
				break loop
			}
			c.roomTable.touch(rid, cid)
		case "send":
			if !registered {
				c.wsError("Client not registered", ws)
				break loop
			}
			if msg.Msg == "" {
				c.wsError("Invalid send request: missing 'msg'", ws)
				break loop
			}

			var isMessagePersistant = false
			if msg.Persistant == "true" {
				isMessagePersistant = true
			}

			c.roomTable.send(rid, cid, msg.Msg, isMessagePersistant)
			break
		case "send-to-other":
			if msg.Msg == "" {
				c.wsError("Invalid send request: missing 'msg'", ws)
				break loop
			}
			rid, cid = msg.RoomID, msg.ClientID
			c.roomTable.sendToClient(rid, cid, msg.OtherID, msg.Msg)
			break
		case "broadcast":
			if msg.Msg == "" {
				c.wsError("Invalid send request: missing 'msg'", ws)
				break loop
			}
			rid, cid = msg.RoomID, msg.ClientID
			c.roomTable.broadcast(rid, cid, msg.Msg)
			break
		case "list-clients":
			if msg.RoomID == "" || msg.ClientID == "" {
				c.wsError("Invalid register request: missing 'clientid' or 'roomid'", ws)
				break loop
			}
			rid, cid, ctype = msg.RoomID, msg.ClientID, msg.ClientType
			c.roomTable.listRoomClients(rid, cid, ctype)
			break
		case "session-update":
			if msg.RoomID == "" {
				c.wsError("Invalid session update request: missing 'roomid'", ws)
				break loop
			}
			rid = msg.RoomID
			c.roomTable.sessionUpdate(rid, msg.Msg)
			break
		case "ping":
			if msg.RoomID == "" || msg.ClientID == "" {
				c.wsError("Invalid ping request: missing 'clientid' or 'roomid'", ws)
				break loop
			}
			rid, cid, ctype = msg.RoomID, msg.ClientID, msg.ClientType
			c.roomTable.pingResponseHandler(rid, cid, ctype)
			break
		default:
			c.wsError("Invalid message: unexpected 'cmd'", ws)
			break
		}
	}
	// This should be unnecessary but just be safe.
	ws.Close()
}

func (c *Collider) httpError(msg string, w http.ResponseWriter) {
	err := errors.New(msg)
	http.Error(w, err.Error(), http.StatusInternalServerError)
	c.dash.onHTTPErr(err)
}

func (c *Collider) wsError(msg string, ws *websocket.Conn) {
	err := errors.New(msg)
	sendServerErr(ws, msg)
	c.dash.onWsErr(err)
}
