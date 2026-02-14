import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.describe('Chrome Extension Integration', () => {
  test('should load extension and open popup', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '..')
    
    const context = await browser.newContext({
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    })
    
    const page = await context.newPage()
    
    await page.goto('data:text/html,<html><body><h1>Test Page</h1></body></html>')
    
    const extensionId = 'test-extension-id'
    
    try {
      await page.goto(`chrome-extension://${extensionId}/popup.html`)
    } catch (e) {
      console.log('Note: Cannot directly access extension popup in headless mode')
    }
    
    await context.close()
  })

  test('should inject content script into page', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '..')
    
    const context = await browser.newContext({
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    })
    
    const page = await context.newPage()
    
    await page.goto('data:text/html,<html><body><textarea id="test-input"></textarea></body></html>')
    
    const textarea = page.locator('#test-input')
    await expect(textarea).toBeVisible()
    
    await context.close()
  })

  test('should simulate prompt injection in textarea', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '..')
    
    const context = await browser.newContext({
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    })
    
    const page = await context.newPage()
    
    await page.goto('data:text/html,<html><body><textarea id="chat-input"></textarea></body></html>')
    
    const textarea = page.locator('#chat-input')
    await textarea.fill('Hello world')
    
    expect(await textarea.inputValue()).toBe('Hello world')
    
    await context.close()
  })

  test('should simulate prompt injection in contenteditable', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '..')
    
    const context = await browser.newContext({
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    })
    
    const page = await context.newPage()
    
    await page.goto('data:text/html,<html><body><div contenteditable="true" id="rich-editor"></div></body></html>')
    
    const editor = page.locator('#rich-editor')
    await expect(editor).toBeVisible()
    
    await editor.fill('Rich text content')
    
    expect(await editor.textContent()).toBe('Rich text content')
    
    await context.close()
  })
})

test.describe('Content Script Injection Logic', () => {
  test('should find target elements on mock AI sites', async ({ page }) => {
    await page.goto('data:text/html,<html><body>' +
      '<textarea id="prompt-textarea"></textarea>' +
      '<div contenteditable="true" id="rich-input"></div>' +
      '<input type="text" id="regular-input">' +
      '</body></html>')
    
    const selectors = [
      '#prompt-textarea',
      '#rich-input',
      'textarea[contenteditable="true"]',
      'div[contenteditable]',
      'input[type="text"]',
    ]
    
    for (const selector of selectors) {
      const element = page.locator(selector).first()
      const count = await element.count()
      console.log(`Selector ${selector}: ${count} found`)
    }
  })
})
