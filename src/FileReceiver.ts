// @format

import * as Constants from "./Constants";
import { FILE_TRANSFER_STATE } from "./Constants";

const downloadBuffer = (
    buffers: ArrayBuffer[],
    filetype: string,
    filename: string
): void => {
    let obj_url = URL.createObjectURL(new Blob(buffers, { type: filetype }));
    console.log("created object url : ", obj_url);
    const a = document.createElement("a");
    a.href = obj_url;
    a.download = filename;
    a.click();
    console.log("File buffer received, download initialized.");
    // TODO: Revoke object URL after download is complete.
};

export default class FileReceiver {
    private dc: RTCDataChannel;
    private status: FILE_TRANSFER_STATE = FILE_TRANSFER_STATE.None;
    private filename: string = "";
    private filetype: string = "";
    private filesize: number = 0;
    private received_buffer: ArrayBuffer[] = [];
    private received_length: number = 0;

    constructor(dc: RTCDataChannel) {
        this.dc = dc;
        this.status = FILE_TRANSFER_STATE.NamePending;
    }

    resetFileInfo = (): void => {
        this.filename = "";
        this.filetype = "";
        this.filesize = 0;
        this.received_length = 0;
        this.received_buffer = [];
    };

    handleIncomingMessage = (e: MessageEvent<any>): void => {
        let msg: string = e.data;
        if (typeof msg === "string") {
            this.handleMetaMessage(msg);
        } else {
            this.handleFileMessage(msg);
        }
    };

    handleMetaMessage = (msg: string): void => {
        // start -> name -> type -> size -> message -> end
        if (msg === Constants.kMessageStart) {
            if (this.status != FILE_TRANSFER_STATE.None) {
                console.log("WARNING: status variable indicates error.");
                console.log("Current Status : ", this.status);
                // TODO: Reset in case of incorrect status.
            }
            console.log("File transfer started, begin message received");
            this.status = FILE_TRANSFER_STATE.NamePending;
        } else if (msg === Constants.kMessageEnd) {
            if (this.status != FILE_TRANSFER_STATE.EndMessagePending) {
                console.log("WARNING: status variable indicates error.");
                console.log("Current Status : ", this.status);
                // TODO: Reset in case of incorrect status.
            }
            console.log("File transfer done, end message received");
            this.status = FILE_TRANSFER_STATE.Complete;
            this.resetFileInfo();
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
        }
    };

    handleFileMessage = (buffer: ArrayBuffer): void => {
        this.received_buffer.push(buffer);
        this.received_length += buffer.byteLength;

        if (this.received_length < this.filesize) {
            console.log(
                "Total length of received buffers less than expected size, waiting for more messages"
            );
            console.log("Current buffer size : ", this.received_length);
            console.log("Expected buffer size : ", this.filesize);
            this.status = FILE_TRANSFER_STATE.ReceivingData;
        } else if (this.received_length === this.filesize) {
            console.log("File fully recieved, length of buffers match");
            this.status = FILE_TRANSFER_STATE.EndMessagePending;
            downloadBuffer(this.received_buffer, this.filetype, this.filename);
        } else {
            // Error Scenario.
            console.log(
                "Received data length is greater than the expected length!"
            );
            console.log("Received buffer size : ", this.received_length);
            console.log("Expected buffer size : ", this.filesize);
        }
        return;
    };
}
