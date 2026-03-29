import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Force native modules to be external regardless of SSR noExternal setting
function nativeModulesPlugin(modules: string[]): Plugin {
  return {
    name: 'native-modules-external',
    enforce: 'pre',
    resolveId(id) {
      if (modules.includes(id)) {
        return { id, external: true }
      }
    }
  }
}

export default defineConfig({
  main: {
    plugins: [
      nativeModulesPlugin(['better-sqlite3']),
      externalizeDepsPlugin()
    ]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
