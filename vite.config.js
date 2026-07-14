import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
export default defineConfig({
    plugins: [
        react(),
        legacy({
            targets: [
                'defaults',
                'not IE 11',
                'iOS >= 10',
                'Safari >= 10',
                'Chrome >= 49',
                'Android >= 5',
            ],
        }),
    ],
    server: {
        port: 5173,
        host: true,
    },
    preview: {
        port: 4173,
        host: true,
    },
});
