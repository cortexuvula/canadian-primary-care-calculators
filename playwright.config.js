import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',fullyParallel:false,workers:1,reporter:'list',use:{baseURL:'http://127.0.0.1:43187',headless:true},webServer:{command:'node scripts/harness-server.js',url:'http://127.0.0.1:43187',reuseExistingServer:false},timeout:30000});
