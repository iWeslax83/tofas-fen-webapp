const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Homework routes
app.get('/api/homeworks', (req, res) => {
  res.json({ message: 'Homework endpoint is working!' });
});

app.post('/api/homeworks/create', (req, res) => {
  console.log('Homework create request:', req.body);
  res.status(201).json({
    message: 'Homework created successfully!',
    data: req.body
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📚 Homework endpoint: http://localhost:${PORT}/api/homeworks/create`);
});
