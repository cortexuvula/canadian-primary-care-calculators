// SDK boundary double; React and production plugin bytes are real.
// Optional controls come from the pinned public SDK fixture. Not a native Desktop load.
import {createElement as h} from '/.browser/runtime.js';
export const ROUTES_AREA='routes',SIDEBAR_NAV_AREA='sidebar.nav',PALETTE_AREA='palette';
export const host={navigate:path=>{window.probe.navigation.push(path);}};
export const Button=({variant,size,...props})=>window.nativeControls?h(window.nativeControls.Button,{variant,size,...props}):h('button',props);
export const Input=props=>window.nativeControls?h(window.nativeControls.Input,props):h('input',props);
