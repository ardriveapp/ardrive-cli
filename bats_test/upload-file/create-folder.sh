#!/bin/bash

cd /home/node

mkdir root_folder
cd root_folder
yes "1 chunk test"  | head -c 262144 > 1Chunk.txt

mkdir parent_folder
cd parent_folder
yes "5 chunk test"  | head -c 1310720 > 5Chunk.txt

mkdir child_folder
cd child_folder
yes "20 chunk test"  | head -c 5242880 > 20Chunk.txt

# exit 0
