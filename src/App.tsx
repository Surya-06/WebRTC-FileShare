import React from "react";
import { EnumDeclaration } from "typescript";
import "./App.css";

/*
https://jsfiddle.net/jib1/nnc13tw2/
*/

const CHUNK_SIZE: number = 16300;

const kMessageStart: string = "BEGIN_FILE";
const kMessageEnd: string = "END_FILE";

enum FILE_TRANSFER_STATE {
    None,
    NamePending,
    TypePending,
    SizePending,
    DataPending,
    EndMessagePending,
    Complete,
}

export default class App extends React.Component<any, any> {
    // data channel
    private dc: any = new RTCPeerConnection();

    // p2p channel
    private pc: RTCPeerConnection = new RTCPeerConnection();

    private status: FILE_TRANSFER_STATE = FILE_TRANSFER_STATE.None;
    private filename: string = "";
    private filetype: string = "";
    private filesize: number = 0;

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

    showIncomingMessage = (msg: string): void => {
        console.log("message received : ", msg);

        let msg_display: HTMLTextAreaElement = document.getElementById(
            "latest_message"
        ) as HTMLTextAreaElement;

        msg_display.value = msg;
    };

    handleIceStateChange = (_: Event) => {
        console.log("ICE state change : ", this.pc.iceConnectionState);
    };

    initializeDataChannel = (): void => {
        console.log("initializing data channel");
        this.dc.onopen = () => console.log("data channel opened!");
        this.dc.onmessage = this.handleIncomingMessage;
    };

    handleIncomingMessage = (e: MessageEvent<any>) => {
        let msg: any = e.data;
        console.log("messge received, type : ", typeof msg);
        if (typeof msg === "string") {
            let is_meta_msg: boolean = this.handleIfFileMetaMessages(msg);
            if (!is_meta_msg) this.showIncomingMessage(msg);
        } else {
            if (this.status !== FILE_TRANSFER_STATE.DataPending) {
                console.log(
                    "WARNING : non-string object received with wrong state, current state : ",
                    this.status
                );
            }
            this.receiveFile(msg);
        }
    };

    handleIfFileMetaMessages = (msg: string): boolean => {
        // start -> name -> type -> size -> message -> end

        let is_meta: boolean = true;
        if (msg === kMessageStart) {
            console.log("File transfer started, begin message received");
            this.status = FILE_TRANSFER_STATE.NamePending;
        } else if (msg === kMessageEnd) {
            console.log("File transfer done, end message received");
            this.status = FILE_TRANSFER_STATE.Complete;
        } else if (this.status === FILE_TRANSFER_STATE.NamePending) {
            this.filename = msg;
            this.status = FILE_TRANSFER_STATE.TypePending;
            console.log("received file name : ", this.filename);
        } else if (this.status === FILE_TRANSFER_STATE.TypePending) {
            this.filetype = msg;
            this.status = FILE_TRANSFER_STATE.SizePending;
            console.log("received file type : ", this.filetype);
        } else if (this.status === FILE_TRANSFER_STATE.SizePending) {
            this.filesize = Number(msg);
            this.status = FILE_TRANSFER_STATE.DataPending;
            console.log("received file size : ", this.filesize);
        } else {
            is_meta = false;
        }

        return is_meta;
    };

    private current_buffer: ArrayBuffer[] = [];
    private current_size: number = 0;

    receiveFile = (buf: ArrayBuffer) => {
        this.current_buffer.push(buf);
        this.current_size += buf.byteLength;

        if (this.current_size !== this.filesize) {
            console.log(
                "file size still less than the expected size, returning in wait of next buffer"
            );
            console.log(
                "current buffer length : ",
                this.current_size,
                "\nexpected buffer length : ",
                this.filesize
            );
            return;
        }

        let obj_url = URL.createObjectURL(
            new Blob(this.current_buffer, { type: this.filetype })
        );
        console.log("created object url : ", obj_url);
        const a = document.createElement("a");
        a.href = obj_url;
        a.download = this.filename;
        a.click();
        console.log("File buffer received, download initialized.");
        this.status = FILE_TRANSFER_STATE.EndMessagePending;
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

    sendTextMessage = () => {
        let msg_element: HTMLInputElement = document.getElementById(
            "input_message"
        ) as HTMLInputElement;

        let msg_value: string = msg_element.value;
        console.log("sending message  : ", msg_value);

        this.dc.send(msg_value);

        msg_element.value = "";
    };

    sendFile = (file: File) => {
        // send name of the file as string
        let filename: string = file.name;
        let size: string = file.size.toString();
        let type: string = file.type;

        this.dc.send(kMessageStart);
        this.dc.send(filename);
        this.dc.send(type);
        this.dc.send(size);

        console.log("file details: ", filename, " ", type, " ", size);

        file.arrayBuffer().then((buf: ArrayBuffer) => {
            console.log("buffer size : ", buf.byteLength);

            // break messagse to fit packet size.
            let index: number = 0;
            let csize: number = Number(size);
            let fragment_count: number = 0;
            while (csize >= CHUNK_SIZE) {
                this.dc.send(buf.slice(index, index + CHUNK_SIZE));
                csize -= CHUNK_SIZE;
                index += CHUNK_SIZE;
                fragment_count++;
                console.log("sent message fragment - ", fragment_count);
                console.log("size remaining : ", csize);
            }

            console.log("csize after all buffers : ", csize);
            console.log("size sent so far : ", buf.byteLength - csize);

            if (csize > 0) {
                this.dc.send(buf.slice(index, index + csize));
                console.log("size of last buffer : ", csize);
            }

            this.dc.send(kMessageEnd);
        });
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
                        <div style={{ display: "block" }}>
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

                    <div id="chat_section">
                        <h3>Chat Section</h3>
                        <textarea id="latest_message" readOnly={true} />
                        <input
                            type={"text"}
                            id="input_message"
                            placeholder={"Type your message here"}
                        />
                        <button onClick={this.sendTextMessage}>Send</button>
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
