// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree.

package collider

import (
	"io"
)

type console struct {
	rwc io.ReadWriteCloser
}

func newConsole() *console {
	return &console{}
}

func (c *console) send(msg string) error {
	return sendServerMsg(c.rwc, msg)
}
