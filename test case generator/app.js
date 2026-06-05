const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const testRoutes = require('./routes/testRoutes');

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', testRoutes);

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.send({ status: 'ok', message: 'JIRA test case generator is running.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
