import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('<h1>Hello Railway - TEST</h1>');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;