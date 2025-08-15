// Wrapper pour rendre le module content.js testable sans modification
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Lire le fichier content.js original
const contentCode = fs.readFileSync(path.resolve(__dirname, '../../content.js'), 'utf-8')

// Créer un contexte d'exécution avec les globals nécessaires
const createContentModule = () => {
  // Mock global pour browser si pas déjà défini
  if (typeof global.browser === 'undefined') {
    global.browser = {
      runtime: {
        onMessage: {
          addListener: () => {}
        }
      }
    }
  }

  // Variables globales pour l'exécution du script
  const moduleContext = {
    AI_PROMPT_INJECTOR_NS: 'ai_prompt_injector',
    PromptInjector: null,
    showNotification: null
  }

  // Créer une fonction qui exécute le code dans un contexte contrôlé
  const executeModule = () => {
    // Exécuter le code avec le contexte approprié
    const func = new Function('global', 'window', 'document', 'browser', 'console', contentCode)
    func(global, global.window || {}, global.document || {}, global.browser, global.console)
    
    // Récupérer les objets exportés
    return {
      PromptInjector: global.PromptInjector,
      showNotification: global.showNotification,
      AI_PROMPT_INJECTOR_NS: global.AI_PROMPT_INJECTOR_NS
    }
  }

  return executeModule()
}

// Export par défaut
export default createContentModule