#!/bin/bash

yes "10 chunk test"  | head -c 2621440 > /home/node/10Chunks.txt
yes "1 chunk test"  | head -c 262144 > /home/node/1Chunk.txt

exit 0
