// @format

export const kChunkSize: number = 16300;
export const kMessageStart: string = "BEGIN_FILE";
export const kMessageEnd: string = "END_FILE";

export enum FILE_TRANSFER_STATE {
    None,
    NamePending,
    TypePending,
    SizePending,
    DataPending,
    ReceivingData,
    EndMessagePending,
    Complete,
};


