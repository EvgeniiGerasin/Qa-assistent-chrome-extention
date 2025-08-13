# QA-ассистент расширение для Chrome

- Перед сборкой в каталоге `src` создать  файл `keys.json`:
  ```
  {
        "openrouter_api_key": "твой api ключ"
  }
  ```
- Для сборки команда ```npm run build```
- Все импорты после сборки должны кончаться на .js (`import { getPrompt, formatPrompt } from "./prompts.js";`)