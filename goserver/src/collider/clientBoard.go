// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"io"
)

type clientBoard struct {
	rwc io.ReadWriteCloser
}

func newClientBoard() *clientBoard {
	return &clientBoard{}
}

func (c *clientBoard) register(cbid string, cid string, rwc io.ReadWriteCloser) error {
	c.rwc = rwc
	return nil
}

func (c *clientBoard) send(msg string) error {
	return sendServerMsg(c.rwc, msg)
}
