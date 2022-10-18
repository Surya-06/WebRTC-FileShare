import React from 'react';
import './App.css';

/*
https://jsfiddle.net/jib1/nnc13tw2/
*/

export default class App extends React.Component<any, any> {

  // data channel
  private dc: any = new RTCPeerConnection();

  // p2p channel
  private pc = new RTCPeerConnection();

  addScripts = () => {
    let scripts: string[] = [];
    
  }

  constructor(props: any) {
    super(props);
    this.pc.ondatachannel = (e: RTCDataChannelEvent) => {
      console.log('on data channel event occured');
      this.dc = e.channel;
      this.initializeDataChannel();
    };
    this.pc.oniceconnectionstatechange = this.handleIceStateChange;
    this.addScripts();
  }

  showIncomingMessage = (msg: string): void => {
    console.log("message received : ", msg);

    let msg_display: HTMLTextAreaElement = document.getElementById('latest_message') as HTMLTextAreaElement;

    msg_display.value = msg;
  }

  handleIceStateChange = (_: Event) => {
    console.log("ICE state change : ", this.pc.iceConnectionState);
  }

  initializeDataChannel = (): void => {
    // this.dc = this.dc as RTCDataChannel;
    console.log("initializing data channel");
    this.dc.onopen = () => console.log("data channel opened!");
    this.dc.onmessage = (e: MessageEvent<any>) =>
      this.showIncomingMessage(e.data);
  }

  createConnection = (_: any): void => {
    console.log('trying to create a connection')

    this.dc = this.pc.createDataChannel("data_channel_for_testing");
    this.initializeDataChannel();
    this.pc.createOffer().then(offer => {
      this.pc.setLocalDescription(offer).catch(e => { console.log(e) });
    });

    this.pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
      if (e.candidate) {
        console.log("on candidate event, early returning for whatever reason");
        return;
      }

      let local_sdp: string = this.pc.localDescription ? this.pc.localDescription.sdp : 'No SDP value in local description';

      console.log("value of the key : ", local_sdp);

      let local_offer_element = document.getElementById('current_offer') as HTMLTextAreaElement;

      local_offer_element.value = local_sdp;

      let accept_offer_element = document.getElementById('accept_offer') as HTMLButtonElement;

      accept_offer_element.disabled = true;
    }
  }

  useOffer = () => {
    console.log("using the received offer from a different client");
    let offer_value: string = (document.getElementById('current_offer') as HTMLTextAreaElement).value;

    console.log("offer value : ", offer_value);

    var description: RTCSessionDescription = new RTCSessionDescription({ type: "offer", sdp: offer_value });

    this.pc.setRemoteDescription(description).then(
      () => {
        this.pc.createAnswer().then(
          (d: RTCSessionDescriptionInit) => {
            this.pc.setLocalDescription(d);
          }
        );
      }
    );

    this.pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
      if (e.candidate) {
        console.log("returning early when using provided offer");
        return;
      }
      let answer_element = document.getElementById("read_offer") as HTMLTextAreaElement;

      answer_element.value = this.pc.localDescription ? this.pc.localDescription.sdp : "Key Generation Failed!";

      (document.getElementById('accept_key') as HTMLButtonElement).disabled = true;
    }

  }

  acceptKey = () => {
    if (this.pc.signalingState !== 'have-local-offer') {
      console.log('returning since signal state is ', this.pc.signalingState);
      return;
    }

    let answer_element = document.getElementById('read_offer') as HTMLTextAreaElement;

    answer_element.disabled = true;

    let description: RTCSessionDescription = new RTCSessionDescription({ type: 'answer', sdp: answer_element.value });

    this.pc.setRemoteDescription(description).catch((m) => { console.log("failed to set key as remote description : ", m) });
  }

  sendMessage = () => {
    let msg_element: HTMLInputElement = document.getElementById('input_message') as HTMLInputElement;

    let msg_value: string = msg_element.value;
    console.log('sending message  : ', msg_value);

    this.dc.send(msg_value);

    msg_element.value = '';
  }

  render = (): JSX.Element => {
    return (
      <div className="App" style={{ justifyContent: 'center' }}>
        <div id='contents' style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <h3 id='title'> Local RTC Tester </h3>

          <div style={{ display: 'flex', flexDirection: 'row', paddingTop: '20px', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
            <div style={{display: 'block'}}>
              <label htmlFor='current_offer'>Key</label>
              <textarea id='current_offer' placeholder={'Current Key'} />
            </div>
            <button id='generate_offer' onClick={this.createConnection} >Generate Offer</button>
            <button id='accept_offer' onClick={this.useOffer}>Accept Offer</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', paddingTop: '20px', width: '100%' }}>
            <label htmlFor='read_offer'>Counter-generated key</label>
            <textarea id='read_offer' placeholder={'Enter the opposing offer'} onSubmit={this.useOffer} />
            <button id='accept_key' onClick={this.acceptKey}>Accept Key</button>
          </div>


          <div>
            <h3>Chat Section</h3>
            <textarea id='latest_message' readOnly={true} />
            <input type={'text'} id='input_message' placeholder={'Type your message here'} />
            <button onClick={this.sendMessage}>Send</button>
          </div>

        </div>
      </div>
    )
  }

}
