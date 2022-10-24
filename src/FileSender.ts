// @format

import * as Constants from "./Constants";

export default class FileSender {
    private dc: RTCDataChannel;
    private file: File;
    private filename: string;
    private filesize: number;
    private filetype: string;
    private index: number = 0;
    private remaining_length: number = 0;
    private fragment_count: number = 0;
    private is_buffer_available: boolean = true;
    private buffer!: ArrayBuffer;

    constructor(dc: RTCDataChannel, file: File) {
        this.dc = dc;
        this.file = file;
        this.filename = file.name;
        this.filetype = file.type;
        this.filesize = file.size;
    }

    send = (): void => {
        console.log("Initiating file transfer");
        console.log("File name : ", this.filename);
        console.log("File type : ", this.filetype);
        console.log("File size : ", this.filesize);
        this.remaining_length = this.filesize;

        console.log("Sending meta messages to receiver");
        this.dc.send(Constants.kMessageStart);
        this.dc.send(this.filename);
        this.dc.send(this.filetype);
        this.dc.send(this.filesize.toString());

        console.log("Setting binary type of datachannel to arraybuffer");
        this.dc.binaryType = "arraybuffer";

        console.log("Beginning file read into buffer");
        this.file.arrayBuffer().then(this.processFileBuffer);
    };

    handleBufferAvailableEvent = (): void => {
        this.is_buffer_available = true;
        this.processBufferSlice();
    };

    processFileBuffer = (buffer: ArrayBuffer): void => {
        console.log("Finished reading file into the buffer");
        this.buffer = buffer;
        this.dc.addEventListener(
            "bufferedamountlow",
            this.handleBufferAvailableEvent
        );
        this.processBufferSlice();
    };

    processBufferSlice = (): void => {
        if (this.remaining_length === 0) {
            console.log("Full length of the file processed");
            return;
        }
        if (this.is_buffer_available == false) {
            console.log(
                "Buffer currently unavailable - will resume once queue frees up"
            );
            return;
        }
        try {
            if (this.remaining_length >= Constants.kChunkSize) {
                this.dc.send(
                    this.buffer.slice(
                        this.index,
                        this.index + Constants.kChunkSize
                    )
                );
                this.remaining_length -= Constants.kChunkSize;
                this.index += Constants.kChunkSize;
                this.fragment_count++;
                console.log("Fragment sent : ", this.fragment_count);
                console.log("Bytes remaining : ", this.remaining_length);
                console.log("Index : ", this.index);

                // Recursively process the next slice.
                return this.processBufferSlice();
            } else {
                console.log("Sending last buffer");
                this.dc.send(this.buffer.slice(this.index));
                this.index = this.filesize;
                this.remaining_length = 0;
                this.fragment_count++;

                this.fileBuffersSent();
                return;
            }
        } catch (e: any) {
            console.log("Exception occurred during send, details: ", e);
            this.is_buffer_available = false;
        }
    };

    fileBuffersSent = (): void => {
        this.dc.send(Constants.kMessageEnd);
    };
}
