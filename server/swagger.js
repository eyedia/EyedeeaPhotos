import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Eyedeea Photos API',
    description: 'Eyedeea Photos is an app designed to bring forgotten memories back to life. It integrates with Synology Photos & any USB, HDD, SDD to display random photos from the collection'
  },
  host: 'localhost:3000'
};

const outputFile = './swagger-output.json';
const routes = ['./api/routers/view_filter_router.js','./api/routers/view_router.js','./api/routers/source_router.js','./api/routers/source_scan_router.js','./api/routers/source_browser_router.js','./api/routers/system_router.js'];

swaggerAutogen()(outputFile, routes, doc);