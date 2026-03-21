const fs = require('fs');
const path = require('path');

// Analyzer expects tournament_results.json in the same folder
const RESULTS_FILE = path.join(__dirname, 'tournament_results.json');

function safeReadJson(p){
  if(!fs.existsSync(p)) throw new Error('Results file not found: '+p);
  return JSON.parse(fs.readFileSync(p,'utf8'));
}

try{
  const data = safeReadJson(RESULTS_FILE);
  console.log('Loaded', RESULTS_FILE);
  console.log('Summary:', data.stats);
  // For brevity, re-use the previous analyzer behaviour but minimal for quick checks
  console.log('\nPartidas:', data.partidas.length);
  data.partidas.forEach((p,i)=>{
    console.log(` ${i+1}. ${p.result} - ${p.moves} moves (${p.reason})`);
  });
  console.log('\nRun the original analyzer in the project root for full recommendations.');
} catch(e){
  console.error('Error reading results:', e.message);
  process.exit(1);
}
