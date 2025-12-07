export interface LiveConfig {
  model: string;
  systemInstruction: string;
  voiceName: string;
}

export enum SessionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioStreamConfig {
  sampleRate: number;
}
