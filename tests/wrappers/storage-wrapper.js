// Wrapper pour rendre le module storage.js testable sans modification
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Lire le fichier storage.js original
const storageCode = fs.readFileSync(path.resolve(__dirname, '../../storage.js'), 'utf-8')

// Créer un contexte d'exécution avec les globals nécessaires
const createStorageModule = () => {
  // Mock global pour browser si pas déjà défini
  if (typeof global.browser === 'undefined') {
    global.browser = {
      storage: {
        local: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve(),
          remove: () => Promise.resolve(),
          clear: () => Promise.resolve()
        }
      }
    }
  }

  // Exécuter le code dans le contexte global
  eval(storageCode)
  
  // Retourner la classe PromptStorage
  return global.PromptStorage || PromptStorage
}

// Export par défaut
export default createStorageModule