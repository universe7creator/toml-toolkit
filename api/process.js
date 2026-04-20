module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { toml, action = 'parse' } = req.body || {};

    if (!toml) {
      return res.status(400).json({ error: 'TOML content required' });
    }

    // Parse TOML
    const lines = toml.split('\n');
    const result = {};
    let currentSection = result;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      if (line.startsWith('[') && line.endsWith(']')) {
        const sectionName = line.slice(1, -1);
        result[sectionName] = result[sectionName] || {};
        currentSection = result[sectionName];
      } else if (line.includes('=')) {
        const eqIndex = line.indexOf('=');
        const key = line.slice(0, eqIndex).trim();
        let value = line.slice(eqIndex + 1).trim();

        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        } else if (value.startsWith('[') && value.endsWith(']')) {
          try { value = JSON.parse(value); } catch {}
        } else if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(value) && value !== '') value = Number(value);

        currentSection[key] = value;
      }
    }

    // Convert based on action
    let output;
    switch (action) {
      case 'json':
        output = { format: 'json', data: result };
        break;
      case 'yaml':
        let yaml = '';
        for (const [key, val] of Object.entries(result)) {
          if (typeof val === 'object' && !Array.isArray(val)) {
            yaml += `${key}:\n`;
            for (const [k, v] of Object.entries(val)) {
              yaml += `  ${k}: ${v}\n`;
            }
          } else if (Array.isArray(val)) {
            yaml += `${key}:\n`;
            val.forEach(item => yaml += `  - ${item}\n`);
          } else {
            yaml += `${key}: ${val}\n`;
          }
        }
        output = { format: 'yaml', data: yaml };
        break;
      case 'validate':
        output = { valid: true, message: 'Valid TOML' };
        break;
      default:
        output = { format: 'parsed', data: result };
    }

    return res.json({
      success: true,
      ...output,
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
