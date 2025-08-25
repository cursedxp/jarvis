export interface IPCMessage {
  type: string;
  payload: any;
  timestamp: number;
  sender: string;
}

export interface SocketMessage {
  event: string;
  data: any;
  id?: string;
}

export class Protocol {
  static createMessage(type: string, payload: any, sender: string): IPCMessage {
    return {
      type,
      payload,
      timestamp: Date.now(),
      sender
    };
  }
  
  static parseMessage(message: string): IPCMessage | null {
    try {
      return JSON.parse(message);
    } catch {
      return null;
    }
  }
  
  static stringify(message: IPCMessage): string {
    return JSON.stringify(message);
  }
}