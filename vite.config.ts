import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const localFixturePlugin: Plugin = {
  name: 'local-bootstrap-fixture',
  configureServer(server) {
    server.middlewares.use('/__local-mocks/bootstrap.json', async (request, response, next) => {
      if (request.method !== 'GET') {
        next()
        return
      }

      try {
        const fixture = await readFile(resolve(process.cwd(), '.local/mocks/bootstrap.json'))
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(fixture)
      } catch {
        response.statusCode = 404
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(JSON.stringify({ error: { code: 'DEMO_FIXTURE_NOT_FOUND', message: 'Локальная демо-фикстура не найдена: создайте .local/mocks/bootstrap.json.' } }))
      }
    })
  },
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const mockMode = command === 'serve' && env.VITE_MOCK_MODE === 'true'

  if (command === 'build' && env.VITE_MOCK_MODE === 'true') {
    throw new Error('Production build is disabled while VITE_MOCK_MODE=true.')
  }

  return {
    base: repositoryName ? `/${repositoryName}/` : '/',
    plugins: [react(), ...(mockMode ? [localFixturePlugin] : [])],
  }
})
