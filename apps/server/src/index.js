const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const routes = require('./routes');
const consoleRouter = require('./console');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// API v1 router
app.use('/v1', routes);

// Judge Control Console
app.use('/console', consoleRouter);

// Contract & Docs
app.get('/v1/openapi.json', (req, res) => {
  const contractPath = path.resolve(__dirname, '../../../contract/openapi.yaml');
  if (fs.existsSync(contractPath)) {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(fs.readFileSync(contractPath, 'utf8'));
  } else {
    res.json({ message: 'OpenAPI contract specification' });
  }
});

app.get('/docs', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Medicub API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/v1/openapi.json',
      dom_id: '#swagger-ui',
    });
  </script>
</body>
</html>`);
});

// Root redirects to /console
app.get('/', (req, res) => {
  res.redirect('/console');
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Medicub Server] Listening on http://localhost:${PORT}`);
    console.log(`[Medicub Server] Control Console at http://localhost:${PORT}/console`);
    console.log(`[Medicub Server] API Base at http://localhost:${PORT}/v1`);
  });
}

module.exports = app;
