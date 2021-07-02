export interface EncodeBuffer {
  buffer: Buffer;
  offset: number;
}

export interface BACNetAddress {
  type?: number;
  net?: number;
  adr?: number[];
}

export interface TransportSettings {
  port?: number;
  interface?: string;
  broadcastAddress?: string;
}

export interface BACNetObjectID {
  type: number;
  instance: number;
}

export interface BACNetPropertyID {
  id: number;
  index: number;
}

export interface BACNetReadAccessSpecification {
  objectId: BACNetObjectID;
  properties: BACNetPropertyID[];
}

export interface BACNetBitString {
  bitsUsed: number;
  value: number[];
}

export interface BACNetCovSubscription {
  recipient: {
    network: number;
    address: number[];
  };
  subscriptionProcessId: number;
  monitoredObjectId: BACNetObjectID;
  monitoredProperty: BACNetPropertyID;
  issueConfirmedNotifications: boolean;
  timeRemaining: number;
  covIncrement: number;
}

export interface BACNetAlarm {
  objectId: BACNetObjectID;
  alarmState: number;
  acknowledgedTransitions: BACNetBitString;
}

export interface BACNetEvent {
  objectId: BACNetObjectID;
  eventState: number;
  acknowledgedTransitions: BACNetBitString;
  eventTimeStamps: Date[];
  notifyType: number;
  eventEnable: BACNetBitString;
  eventPriorities: number[];
}

export interface BACNetDevObjRef {
  id: number;
  arrayIndex: number;
  objectId: BACNetObjectID;
  deviceIndentifier: BACNetObjectID;
}

export interface BACNetAppData {
  type: number;
  value: any;
  encoding?: number;
}

export interface BACNetPropertyState {
  type: number;
  state: number;
}

export interface BACNetEventInformation {
  objectId: BACNetObjectID;
  eventState: number;
  acknowledgedTransitions: BACNetBitString;
  eventTimeStamps: any[];
  notifyType: number;
  eventEnable: BACNetBitString;
  eventPriorities: number[];
}
