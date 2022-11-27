# WebRTC-FileShare

## Summary:
This project uses the WebRTC protocol to establish a peer-to-peer connection and provide a quick utility for sharing files between offline devices 
which can communicate with each other (i.e., the devices are network reachable).

## Tech Stack:
- create-react-app: Bootstrap code to setup the UI
- React: To setup the UI structure and elements
- JS APIs: WebRTC API provided by in-browser JS engine (tested on Safari)
- GitHub actions for Continuous Build & Deployment


## Working model:
- The app tries to connect with other machines via the ICE protocol.
- In order to do this, both machine generate the configuration which needs to shared externally.
- Once the key/ configuration of the each machine is entered into the other, a connection is established between the machines.
- After the connection is established, a file can be chosen via the File Picker in the webpage.
- The file is then read into the memory as byte array and transmitted via the peer-to-peer connection established earlier.
- Finally, the receiver recombines all the received byte arrays and triggers a download by hosting the received file as an in-memory blob.

