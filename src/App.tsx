import React from "react";
import { EnumDeclaration } from "typescript";
import "./App.css";
import FileSender from "./FileSender";
import FileReceiver from "./FileReceiver";
import * as Constants from "./Constants";

/*
https://jsfiddle.net/jib1/nnc13tw2/
*/

export default class App extends React.Component<any, any> {
    // data channel
    private dc!: RTCDataChannel;

    // p2p channel
    private pc: RTCPeerConnection = new RTCPeerConnection();

    // Message Receiving Handler.
    private receiver!: FileReceiver;

    addScripts = () => {};

    constructor(props: any) {
        super(props);
        this.pc.ondatachannel = (e: RTCDataChannelEvent) => {
            console.log("on data channel event occured");
            this.dc = e.channel;
            this.initializeDataChannel();
        };
        this.pc.oniceconnectionstatechange = this.handleIceStateChange;
        this.addScripts();
    }

    handleIceStateChange = (_: Event) => {
        console.log("ICE state change : ", this.pc.iceConnectionState);
    };

    initializeDataChannel = (): void => {
        console.log("initializing data channel");
        this.receiver = new FileReceiver(this.dc);
        this.dc.onopen = () => console.log("data channel opened!");
        this.dc.onmessage = this.receiver.handleIncomingMessage;
    };

    createConnection = (_: any): void => {
        console.log("trying to create a connection");

        this.dc = this.pc.createDataChannel("data_channel_for_testing");
        this.initializeDataChannel();
        this.pc.createOffer().then((offer) => {
            this.pc.setLocalDescription(offer).catch((e) => {
                console.log(e);
            });
        });

        this.pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
            if (e.candidate) {
                return;
            }

            let local_sdp: string = this.pc.localDescription
                ? this.pc.localDescription.sdp
                : "No SDP value in local description";

            console.log("value of the key : ", local_sdp);

            let local_offer_element = document.getElementById(
                "key"
            ) as HTMLTextAreaElement;

            local_offer_element.value = local_sdp;

            let accept_offer_element = document.getElementById(
                "accept_offer"
            ) as HTMLButtonElement;

            accept_offer_element.disabled = true;
        };
    };

    useOffer = () => {
        console.log("using the received offer from a different client");
        let offer_value: string = (
            document.getElementById("key") as HTMLTextAreaElement
        ).value;

        console.log("offer value : ", offer_value);

        var description: RTCSessionDescription = new RTCSessionDescription({
            type: "offer",
            sdp: offer_value,
        });

        this.pc.setRemoteDescription(description).then(() => {
            this.pc.createAnswer().then((d: RTCSessionDescriptionInit) => {
                this.pc.setLocalDescription(d);
            });
        });

        this.pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
            if (e.candidate) {
                return;
            }
            let answer_element = document.getElementById(
                "answer"
            ) as HTMLTextAreaElement;

            answer_element.value = this.pc.localDescription
                ? this.pc.localDescription.sdp
                : "Key Generation Failed!";

            (
                document.getElementById("accept_answer") as HTMLButtonElement
            ).disabled = true;
        };
    };

    acceptAnswer = () => {
        if (this.pc.signalingState !== "have-local-offer") {
            console.log(
                "returning since signal state is ",
                this.pc.signalingState
            );
            return;
        }

        let answer_element = document.getElementById(
            "answer"
        ) as HTMLTextAreaElement;

        answer_element.disabled = true;

        let description: RTCSessionDescription = new RTCSessionDescription({
            type: "answer",
            sdp: answer_element.value,
        });

        this.pc.setRemoteDescription(description).catch((m) => {
            console.log("failed to set key as remote description : ", m);
        });
    };

    sendFile = (file: File) => {
        console.log("sending new file");
        let file_sender: FileSender = new FileSender(this.dc, file);
        file_sender.send();
    };

    handleException = (e: any) => {
        console.log("exception occured, details : ", e);
    };

    handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) {
            console.log("No files found in the current change event!");
            return;
        }

        let files = e.target.files;
        let file_count = files.length;
        console.log("length of files :", file_count.toString());

        if (file_count !== 1) {
            alert("More than one file incoming. Please try again!");
            console.log(files);
            return;
        }

        this.sendFile(files[0]);
    };

    render = (): JSX.Element => {
        return (
            <div className="App" style={{ justifyContent: "center" }}>
                <div
                    id="contents"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                    }}
                >
                    <h3 id="title"> Local RTC Tester </h3>

                    <div className={"key-section"}>
                        <div>
                            <label htmlFor="key">Key</label>
                            <textarea id="key" placeholder={"Current Key"} />
                        </div>
                        <button
                            id="generate_offer"
                            onClick={this.createConnection}
                        >
                            Generate Offer
                        </button>
                        <button id="accept_offer" onClick={this.useOffer}>
                            Accept Offer
                        </button>
                    </div>

                    <div className={"key-section"}>
                        <label htmlFor="answer">Counter-generated answer</label>
                        <textarea
                            id="answer"
                            placeholder={"Enter the opposing answer"}
                            onSubmit={this.useOffer}
                        />
                        <button id="accept_answer" onClick={this.acceptAnswer}>
                            Accept Answer
                        </button>
                    </div>
                    <div id="file_section">
                        <p>File sending section</p>
                        <input
                            type={"file"}
                            id={"file_selector"}
                            onChange={this.handleFileSelection}
                        />

                        <textarea id="sample_display" disabled={true} />
                    </div>
                </div>
            </div>
        );
    };
}
