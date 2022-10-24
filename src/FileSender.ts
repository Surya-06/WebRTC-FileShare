// @format


export default class FileSender {
    send = (dc: RTCDataChannel, msg: string) => {
        dc.send(msg);
        return;
    }
};
