import { io } from 'socket.io-client';

const token = process.argv[2];
const householdId = process.argv[3];

if (!token || !householdId) {
  console.error('Nutzung: node test-ws-client.mjs <JWT_TOKEN> <HOUSEHOLD_ID>');
  process.exit(1);
}

const socket = io('http://localhost:3000', {
  auth: {
    token,
  },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Verbunden:', socket.id);

  socket.emit('household:join', {
    householdId,
  });
});

socket.on('household:joined', (payload) => {
  console.log('Wohnung beigetreten:', payload);
});

socket.on('household:changed', (payload) => {
  console.log('Realtime-Event erhalten:', payload);
});

socket.on('connection:error', (payload) => {
  console.error('Verbindungsfehler:', payload);
});

socket.on('connect_error', (error) => {
  console.error('Socket-Verbindungsfehler:', error.message);
});
