// Minimal type stub for @capacitor/core
// Replaced by the real package after `npm install`
declare module '@capacitor/core' {
  export const Capacitor: {
    isNativePlatform(): boolean;
    getPlatform(): 'android' | 'ios' | 'web';
  };
}
