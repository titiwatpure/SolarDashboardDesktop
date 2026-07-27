const sqlite3 = require('./backend/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('C:\\Users\\titiw\\.local\\share\\mimocode\\mimocode.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) { console.error(err); process.exit(1); }

  // Get assistant messages from the most recent Dashboard session (ses_0b384bda9ffePEw3xK5u7oteYh - July 10)
  db.all(`
    SELECT m.id, m.agent_id, m.time_created,
           json_extract(m.data, '$.role') as role,
           m.data as raw_data
    FROM message m
    WHERE m.session_id = 'ses_0b384bda9ffePEw3xK5u7oteYh'
      AND json_extract(m.data, '$.role') = 'assistant'
    ORDER BY m.time_created
  `, [], (err, rows) => {
    if (err) { console.error(err); db.close(); return; }
    console.log(`Found ${rows.length} assistant messages in ses_0b384bda9ffePEw3xK5u7oteYh`);
    
    // Get parts for each message
    let pending = rows.length;
    if (pending === 0) { db.close(); return; }
    
    rows.forEach(row => {
      db.all(`
        SELECT id, data FROM part
        WHERE message_id = ?
        ORDER BY time_created
      `, [row.id], (err, parts) => {
        const data = JSON.parse(row.raw_data || '{}');
        const agentId = row.agent_id || '(main)';
        console.log(`\n--- Message ${row.id} [${agentId}] ---`);
        if (parts) {
          parts.forEach(p => {
            const pData = JSON.parse(p.data || '{}');
            if (pData.type === 'text' && pData.text) {
              console.log(`TEXT: ${pData.text.substring(0, 500)}`);
            } else if (pData.type === 'tool') {
              const input = JSON.stringify(pData.state?.input || '').substring(0, 200);
              const output = JSON.stringify(pData.state?.output || '').substring(0, 300);
              console.log(`TOOL: ${pData.tool} | INPUT: ${input} | OUTPUT: ${output}`);
            } else if (pData.type === 'step-finish') {
              console.log(`STEP-FINISH tokens: ${pData.tokens}`);
            }
          });
        }
        if (--pending === 0) db.close();
      });
    });
  });
});
