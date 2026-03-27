const { useSingleFileAuthState, makeWASocket, DisconnectReason, stateChunk, useMultiFileAuthState, makeCacheableSignalKeyStore, BufferJSON } = require('@adiwajshing/baileys');
const { state, saveState } = useMultiFileAuthState(`./auth`);
const store = makeInMemoryStore({ logger: console });
const msgRetryCounterCache = {};
const { Boom } = require('@hapi/boom');

const camaraNoir = async () => {
 const conn = makeWASocket({
 auth: state,
 printQRInTerminal: true,
 browser: ['CamaraNoir', 'Chrome', '1.0'],
 version: [2, 2128, 14]
 });

 store.bind(conn.ev);

 conn.ev.on('creds.update', saveState);
 conn.ev.on('connection.update', async (update) => {
 const { connection, lastDisconnect, qr } = update;
 if (qr) {
 console.log('Scan the QR code, that was sent to you!');
 }
 if (connection === 'close') {
 const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
 console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
 if (shouldReconnect) {
 camaraNoir();
 }
 } else if (connection === 'open') {
 console.log('opened connection');
 }
 });

 conn.ev.on('messages.upsert', async ({ messages, type }) => {
 if (type === 'notify') {
 for (const msg of messages) {
 if (msg.key.fromMe) {
 continue;
 }
 const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
 if (!content) {
 continue;
 }
 if (content.toLowerCase() === '!help') {
 await conn.sendMessage(msg.key.remoteJid, { text: 'Commandes disponibles:\n!help - Affiche cette aide\n!version - Affiche la version du bot' });
 } else if (content.toLowerCase() === '!version') {
 await conn.sendMessage(msg.key.remoteJid, { text: 'CamaraNoir v1.0' });
 } else {
 await conn.sendMessage(msg.key.remoteJid, { text: `Commande ${content} non reconnue` });
 }
 }
 }
 });

 conn.ev.on('group-participants.update', async (update) => {
 const { id, participants, action } = update;
 if (action === 'add' || action === 'remove') {
 const user = participants[0];
 const message = `Un utilisateur a été ${action === 'add' ? 'ajouté' : 'retiré'} du groupe`;
 await conn.sendMessage(id, { text: message });
 }
 });
};

camaraNoir().catch(console.error);
