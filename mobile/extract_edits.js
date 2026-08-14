const fs = require('fs');
const readline = require('readline');

async function extract() {
  const fileStream = fs.createReadStream('C:/Users/arjun/.gemini/antigravity-ide/brain/503369a6-38be-4207-bab8-6343535182be/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const step = JSON.parse(line);
      if (step.tool_calls) {
        for (const tc of step.tool_calls) {
          if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
            const args = typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args;
            if (args.TargetFile && args.TargetFile.includes('App.js')) {
              console.log(`=== STEP ${step.step_index} (${tc.name}) ===`);
              console.log(`Description: ${args.Description || args.description}`);
              console.log(`Instruction: ${args.Instruction || args.instruction}`);
              if (args.ReplacementChunks) {
                console.log(JSON.stringify(args.ReplacementChunks, null, 2));
              } else {
                console.log(`StartLine: ${args.StartLine}, EndLine: ${args.EndLine}`);
                console.log(`TargetContent:\n${args.TargetContent}`);
                console.log(`ReplacementContent:\n${args.ReplacementContent}`);
              }
              console.log('\n=====================================\n');
            }
          }
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }
}

extract();
