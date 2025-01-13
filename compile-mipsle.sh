#!/bin/sh

GOOS=linux GOARCH=mipsle GOMIPS=softfloat go build #-ldflags="-s -w"
