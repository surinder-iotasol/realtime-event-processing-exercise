const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const events = [];
const seenEventIds = new Set();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/webhook', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

app.get('/wallboard', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

app.get('/metrics/:source', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

app.delete('/events/:eventId', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server listening on http://localhost:${port}`);
});

module.exports = { app, events, seenEventIds };

