import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Only this copy's tests, not those of worktrees under .claude/.
  test: { dir: 'tests' },
})
