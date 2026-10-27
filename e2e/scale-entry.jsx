// Isolated scale entry: actual production Library, navigation-only fictional data.
import {jsx} from 'react/jsx-runtime';
import {Library} from '../src/plugin.jsx';
import {fictionalCatalog} from '../tests/fixtures/fictional-catalog.js';
import {registry} from '../src/registry.js';
export function scaleView(ctx,size,includeReal=false){return jsx(Library,{ctx,catalog:includeReal?[...registry,...fictionalCatalog(size-registry.length)]:fictionalCatalog(size)});}
