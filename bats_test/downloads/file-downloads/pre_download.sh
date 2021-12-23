#!/bin/bash

myFiles=(
    "290a3f9a-37b2-4f0f-a899-6fac983833b3"
    "0dc95148-ac62-4a35-bb91-3e6ac74a54a9"
    "fa86007b-5534-4ab3-b21c-5b6ce77acb0f"
    "d3399761-ece8-4404-b560-6822472c9f62"
    "366b951f-c3cd-4136-b086-faecd7872394"
    "1571ccbd-7be8-4040-98df-0e36f8ffacc9"
    "438f4c26-0e0d-42d1-b821-11109170a794"
)

for publicFile in ${myFiles[@]}; do
    yarn ardrive download-file -f $publicFile --local-path /home/node/tmp
done
exit 0
