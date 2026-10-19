const fs = require('fs');
const path = require('path');

const candidates = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      path.join(process.cwd(), 'src', 'navigation', 'AppNavigator.js'),
      path.join(process.cwd(), 'src', 'navigation', 'AppNavigator.jsx'),
      path.join(process.cwd(), 'src', 'navigations', 'AppNavigator.js'),
      path.join(process.cwd(), 'AppNavigator.js'),
    ];
const file = candidates.find((candidate) => fs.existsSync(candidate));
if (!file) {
  console.error('Could not find AppNavigator.js. Run from your project root or pass its path.');
  process.exit(1);
}

let source = fs.readFileSync(file, 'utf8');
const original = source;
const fail = (message) => {
  console.error(`Patch stopped safely: ${message}\nNo changes have been saved.`);
  process.exit(1);
};

// Work with either Windows or Unix line endings without changing the original convention.
const newline = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');

// 1. Import the game screen.
if (!source.includes("from '../screens/VocabularyGameScreen'")) {
  const importPattern = /^import TutorChatScreen from ['"]\.\.\/screens\/TutorChatScreen['"];?$/m;
  if (!importPattern.test(source)) fail('could not find the TutorChatScreen import');
  source = source.replace(importPattern, (line) => `${line}\nimport VocabularyGameScreen from '../screens/VocabularyGameScreen';`);
}

// 2. Add navigation handlers immediately before the actual back-to-roadmap handler.
if (!source.includes('const handleOpenVocabularyGame')) {
  const handlerPattern = /^[ \t]*const handleBackToRoadmap\s*=\s*\(\)\s*=>\s*\{/m;
  if (!handlerPattern.test(source)) fail('could not find const handleBackToRoadmap = () => {');
  const handlers = `  // FALLING VOCABULARY GAME NAVIGATION\n  const handleOpenVocabularyGame = () => {\n    setCurrentStep('vocabulary-game');\n    setActiveTab('AI Tutor');\n    updateSessionStorage('ai_tutor_current_step', 'vocabulary-game');\n    updateSessionStorage('ai_tutor_active_tab', 'AI Tutor');\n  };\n\n  const handleBackFromVocabularyGame = () => {\n    setCurrentStep('chat');\n    setActiveTab('AI Tutor');\n    updateSessionStorage('ai_tutor_current_step', 'chat');\n    updateSessionStorage('ai_tutor_active_tab', 'AI Tutor');\n  };\n\n`;
  source = source.replace(handlerPattern, `${handlers}  const handleBackToRoadmap = () => {`);
}

// 3. Render the game before the chat branch, so it isn't swallowed by the chat screen.
if (!source.includes("currentStep === 'vocabulary-game'")) {
  const chatCondition = /if\s*\(\s*currentStep\s*===\s*['"]chat['"]\s*\)\s*\{/m;
  if (!chatCondition.test(source)) fail('could not find the currentStep === chat render branch');
  const branch = `if (currentStep === 'vocabulary-game') {\n      return (\n        <VocabularyGameScreen onBack={handleBackFromVocabularyGame} />\n      );\n    }\n\n    `;
  source = source.replace(chatCondition, (match) => `${branch}${match}`);
}

// 4. Add the callback only to the primary TutorChatScreen render branch.
if (!source.includes('onOpenVocabularyGame={handleOpenVocabularyGame}')) {
  const chatCondition = /if\s*\(\s*currentStep\s*===\s*['"]chat['"]\s*\)\s*\{/m;
  const chatMatch = chatCondition.exec(source);
  if (!chatMatch) fail('could not locate the chat render branch for the callback');
  // The actual project formats JSX props across multiple lines and may not
  // have a predictable History branch immediately after Chat. Find the first
  // matching onBack prop after the chat condition instead of relying on that.
  const afterChat = source.slice(chatMatch.index);
  const callbackAnchor = /onBack\s*=\s*\{\s*handleBackToRoadmap\s*\}/m;
  const callbackMatch = callbackAnchor.exec(afterChat);
  if (!callbackMatch) fail('could not find onBack={handleBackToRoadmap} after the main chat branch');
  const absoluteStart = chatMatch.index + callbackMatch.index;
  const absoluteEnd = absoluteStart + callbackMatch[0].length;
  source = source.slice(0, absoluteStart)
    + `${callbackMatch[0]}\n          onOpenVocabularyGame={handleOpenVocabularyGame}`
    + source.slice(absoluteEnd);
}

// Convert back to the file's original newline style.
source = source.replace(/\n/g, newline);

if (source === original) {
  console.log('Vocabulary Game navigation integration already appears to be installed. No changes made.');
  process.exit(0);
}

for (const [label, ok] of [
  ['screen import', source.includes("from '../screens/VocabularyGameScreen'")],
  ['open handler', source.includes('const handleOpenVocabularyGame')],
  ['back handler', source.includes('const handleBackFromVocabularyGame')],
  ['render branch', source.includes("currentStep === 'vocabulary-game'")],
  ['chat callback', source.includes('onOpenVocabularyGame={handleOpenVocabularyGame}')],
]) {
  if (!ok) fail(`validation failed for ${label}`);
}

const backup = `${file}.before-vocabulary-game.bak`;
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
fs.writeFileSync(file, source, 'utf8');
console.log(`Updated ${file}`);
console.log(`Backup saved to ${backup}`);
console.log('Verified: screen import, navigation handlers, game render branch, and chat callback.');
