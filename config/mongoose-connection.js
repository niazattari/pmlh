const mongoose = require('mongoose')

// Optional Mongoose debug via env var
if (String(process.env.MONGODB_DEBUG || '').toLowerCase() === 'true') {
	mongoose.set('debug', true);
}

// Prefer environment variable, fallback to provided Atlas URI (password URL-encoded)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://niazattari:Pakistan%40786@cluster0.mrodwfv.mongodb.net/pmlh?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
	serverSelectionTimeoutMS: 10000,
	socketTimeoutMS: 45000,
	bufferCommands: false,
	maxPoolSize: 10,
	minPoolSize: 2,
})
	.then(() => {
		const name = mongoose.connection?.name || mongoose.connection?.db?.databaseName;
		const host = mongoose.connection?.host || mongoose.connection?.client?.s?.options?.hosts?.[0]?.host;
		console.log(`connected to mongodb (Atlas) db=${name || 'unknown'} host=${host || 'cluster'}`);
	})
	.catch((err) => {
		console.error('mongodb connection error:', err?.message || err);
	});

module.exports = mongoose.connection;