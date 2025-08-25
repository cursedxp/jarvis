export const WAKE_WORD = 'hey jarvis';

export const PORTS = {
  CORE: 7777,
  SOCKET: 7778,
  TRAY: 7779
};

export const EVENTS = {
  COMMAND_RECEIVED: 'command:received',
  COMMAND_COMPLETED: 'command:completed',
  COMMAND_FAILED: 'command:failed',
  WAKE_DETECTED: 'wake:detected',
  SPEECH_START: 'speech:start',
  SPEECH_END: 'speech:end',
  MODEL_SWITCHED: 'model:switched'
};

export const TIMEOUTS = {
  COMMAND: 30000,
  WAKE_WORD: 5000,
  SPEECH_RECOGNITION: 10000
};

export const FILE_LIMITS = {
  MAX_FILE_SIZE: 1024 * 1024 * 10,
  MAX_CONTEXT_LENGTH: 100000
};