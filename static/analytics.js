// Comprehensive Website Analytics with Google Sheets Integration
// Google Apps Script URL - Update with your deployment URL

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzXsRaGw1T7NKUcc7Nht9ojCXpOEKhM5kS4ZZ0Mw28NrUMgXBlNncd0K696wwlrJaufg/exec';

console.log('� Analytics script loaded');
console.log('📍 Script URL:', GOOGLE_SCRIPT_URL);

class DebugWebsiteAnalytics {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
    console.log('✅ Analytics class initialized');
    this.init();
  }

  async init() {
    console.log('🚀 Starting data collection...');
    
    try {
      const visitorData = await this.collectAllData();
      console.log('📊 Data collected successfully:', visitorData);
      
      await this.sendToGoogleSheets(visitorData);
      console.log('✅ Analytics sent to Google Sheets!');
      
    } catch (error) {
      console.error('❌ ERROR in init():', error);
    }
  }

  async collectAllData() {
    console.log('📦 Collecting visitor data...');
    
    const geolocation = await this.getGeolocation();
    console.log('🌍 Geolocation data:', geolocation);
    
    const data = {
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      page: this.getPageInfo(),
      browser: this.getBrowserInfo(),
      device: this.getDeviceInfo(),
      screen: this.getScreenInfo(),
      os: this.getOSInfo(),
      connection: this.getConnectionInfo(),
      geolocation: geolocation,
      locale: this.getLocaleInfo(),
      keyboard: this.getKeyboardLayout(),
      performance: this.getPerformanceMetrics(),
      battery: await this.getBatteryInfo(),
      media: this.getMediaCapabilities(),
      graphics: this.getGraphicsInfo(),
      plugins: this.getPluginsInfo(),
      storage: this.getStorageInfo(),
      security: this.getSecurityInfo(),
      timeInfo: this.getTimeInfo(),
      userAgentDetails: this.getUserAgentDetails(),
      canvasFingerprint: this.getCanvasFingerprint(),
      webrtc: await this.getWebRTCInfo(),
      fonts: this.getInstalledFonts(),
      audioFingerprint: await this.getAudioFingerprint(),
      sensors: await this.getSensorInfo()
    };

    console.log('✅ All data collected');
    return data;
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getPageInfo() {
    return {
      url: window.location.href,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      title: document.title,
      referrer: document.referrer || 'Direct',
      characterSet: document.characterSet,
      contentType: document.contentType,
      documentMode: document.documentMode,
      readyState: document.readyState,
      cookie: navigator.cookieEnabled,
      lastModified: document.lastModified,
      domain: document.domain,
      viewport: {
        width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
        height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
      }
    };
  }

  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';

    if (ua.indexOf('Firefox') > -1) {
      browser = 'Firefox';
      version = ua.match(/Firefox\/(\d+\.\d+)/)?.[1];
      engine = 'Gecko';
    } else if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
      browser = 'Chrome';
      version = ua.match(/Chrome\/(\d+\.\d+)/)?.[1];
      engine = 'Blink';
    } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
      browser = 'Safari';
      version = ua.match(/Version\/(\d+\.\d+)/)?.[1];
      engine = 'WebKit';
    } else if (ua.indexOf('Edg') > -1) {
      browser = 'Edge';
      version = ua.match(/Edg\/(\d+\.\d+)/)?.[1];
      engine = 'Blink';
    }

    return {
      name: browser,
      version: version,
      engine: engine,
      userAgent: ua,
      appName: navigator.appName,
      appVersion: navigator.appVersion,
      vendor: navigator.vendor,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || 'Not set',
      onLine: navigator.onLine,
      javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false
    };
  }

  getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'Desktop';

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      deviceType = 'Tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry/.test(ua)) {
      deviceType = 'Mobile';
    }

    return {
      type: deviceType,
      vendor: navigator.vendor || 'Unknown',
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
      deviceMemory: navigator.deviceMemory || 'Unknown',
      devicePixelRatio: window.devicePixelRatio || 1,
      touchSupport: 'ontouchstart' in window,
      orientation: screen.orientation?.type || window.orientation || 'Unknown'
    };
  }

  getScreenInfo() {
    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      orientation: screen.orientation?.type || 'Unknown',
      orientationAngle: screen.orientation?.angle || window.orientation || 0,
      windowSize: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight
      },
      screenX: window.screenX || window.screenLeft,
      screenY: window.screenY || window.screenTop,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  getOSInfo() {
    const ua = navigator.userAgent;
    let os = 'Unknown';
    let version = 'Unknown';
    let architecture = 'Unknown';

    if (ua.indexOf('Win') > -1) {
      os = 'Windows';
      if (ua.indexOf('Windows NT 10.0') > -1) version = '10/11';
      if (ua.indexOf('WOW64') > -1 || ua.indexOf('Win64') > -1) architecture = 'x64';
    } else if (ua.indexOf('Mac') > -1) {
      os = 'MacOS';
      version = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1].replace('_', '.') || 'Unknown';
    } else if (ua.indexOf('Linux') > -1) {
      os = 'Linux';
    } else if (ua.indexOf('Android') > -1) {
      os = 'Android';
      version = ua.match(/Android (\d+\.\d+)/)?.[1] || 'Unknown';
    }

    return { name: os, version: version, platform: navigator.platform, architecture: architecture };
  }

  getConnectionInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      return {
        effectiveType: conn.effectiveType || 'Unknown',
        downlink: conn.downlink || 'Unknown',
        rtt: conn.rtt || 'Unknown',
        saveData: conn.saveData || false
      };
    }
    return { available: false };
  }

  async getGeolocation() {
    console.log('📍 Fetching geolocation...');
    try {
      const response = await fetch('https://ipapi.co/json/');
      console.log('📡 Geolocation response status:', response.status);
      
      const data = await response.json();
      console.log('✅ Geolocation fetched:', data);
      
      return {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_name,
        countryCode: data.country_code,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org,
        asn: data.asn,
        currency: data.currency
      };
    } catch (error) {
      console.error('❌ Geolocation error:', error);
      return { error: 'Unable to fetch' };
    }
  }

  getLocaleInfo() {
    return {
      language: navigator.language,
      languages: navigator.languages || [navigator.language],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timeZoneOffset: new Date().getTimezoneOffset()
    };
  }

  getKeyboardLayout() {
    const layouts = { 'en': 'QWERTY', 'fr': 'AZERTY', 'de': 'QWERTZ' };
    const lang = (navigator.language || 'en').split('-')[0];
    return { detected: layouts[lang] || 'QWERTY', language: navigator.language };
  }

  getPerformanceMetrics() {
    if (!window.performance) return { available: false };
    const perf = window.performance;
    const timing = perf.timing;
    return {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
      navigationType: perf.navigation?.type || 'Unknown'
    };
  }

  async getBatteryInfo() {
    if (!navigator.getBattery) return { available: false };
    try {
      const battery = await navigator.getBattery();
      return {
        level: (battery.level * 100).toFixed(0) + '%',
        charging: battery.charging
      };
    } catch (error) {
      return { available: false };
    }
  }

  getMediaCapabilities() {
    return {
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      webrtc: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
      videoFormats: {
        h264: document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"'),
        webm: document.createElement('video').canPlayType('video/webm')
      }
    };
  }

  getGraphicsInfo() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { webgl: false };

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      webgl: true,
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown',
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown',
      version: gl.getParameter(gl.VERSION)
    };
  }

  getPluginsInfo() {
    const plugins = [];
    for (let i = 0; i < navigator.plugins.length && i < 10; i++) {
      plugins.push({ name: navigator.plugins[i].name });
    }
    return { count: navigator.plugins.length, plugins: plugins };
  }

  getStorageInfo() {
    return {
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      indexedDB: !!window.indexedDB,
      cookiesEnabled: navigator.cookieEnabled,
      serviceWorker: 'serviceWorker' in navigator
    };
  }

  getSecurityInfo() {
    return {
      https: window.location.protocol === 'https:',
      doNotTrack: navigator.doNotTrack || 'Not set',
      webdriver: navigator.webdriver || false
    };
  }

  getTimeInfo() {
    const now = new Date();
    return {
      localTime: now.toLocaleString(),
      utcTime: now.toUTCString(),
      timestamp: now.getTime(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: now.getTimezoneOffset()
    };
  }

  getUserAgentDetails() {
    const ua = navigator.userAgent;
    return {
      isMobile: /Mobile|Android|iP(hone|od)/.test(ua),
      isTablet: /(tablet|ipad)/i.test(ua),
      isDesktop: !/Mobile|Android|iP(hone|od)|tablet|ipad/i.test(ua),
      isBot: /bot|crawler|spider/i.test(ua)
    };
  }

  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Analytics', 2, 2);
      return canvas.toDataURL().substring(0, 50);
    } catch (error) {
      return 'Unable to generate';
    }
  }

  async getWebRTCInfo() {
    try {
      const localIPs = [];
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      
      await pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pc.close();
          resolve({ localIPs: localIPs });
        }, 2000);
        
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) return;
          const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
          if (ipMatch && !localIPs.includes(ipMatch[1])) {
            localIPs.push(ipMatch[1]);
          }
        };
      });
    } catch (error) {
      return { localIPs: [] };
    }
  }

  getInstalledFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New',
      'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Arial Black', 'Palatino',
      'Garamond', 'Bookman', 'Tahoma', 'Lucida Console', 'Monaco'
    ];
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    
    const baseWidths = {};
    baseFonts.forEach(baseFont => {
      context.font = `${testSize} ${baseFont}`;
      baseWidths[baseFont] = context.measureText(testString).width;
    });
    
    const installedFonts = testFonts.filter(font => {
      return baseFonts.some(baseFont => {
        context.font = `${testSize} ${font}, ${baseFont}`;
        const width = context.measureText(testString).width;
        return width !== baseWidths[baseFont];
      });
    });
    
    return { installed: installedFonts, count: installedFonts.length };
  }

  async getAudioFingerprint() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      
      gainNode.gain.value = 0;
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(0);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          oscillator.disconnect();
          scriptProcessor.disconnect();
          audioContext.close();
          resolve({ fingerprint: 'timeout' });
        }, 500);
        
        scriptProcessor.onaudioprocess = (event) => {
          clearTimeout(timeout);
          const output = event.outputBuffer.getChannelData(0);
          const hash = Array.from(output.slice(0, 30))
            .reduce((acc, val) => acc + Math.abs(val), 0)
            .toString(36)
            .substring(0, 10);
          
          oscillator.disconnect();
          scriptProcessor.disconnect();
          audioContext.close();
          
          resolve({ fingerprint: hash });
        };
      });
    } catch (error) {
      return { fingerprint: 'unavailable' };
    }
  }

  async getSensorInfo() {
    return {
      accelerometer: !!window.Accelerometer,
      gyroscope: !!window.Gyroscope,
      magnetometer: !!window.Magnetometer,
      deviceMotion: !!window.DeviceMotionEvent,
      deviceOrientation: !!window.DeviceOrientationEvent,
      ambientLight: !!window.AmbientLightSensor
    };
  }

  async sendToGoogleSheets(data) {
    console.log('📤 Sending data to Google Sheets...');
    console.log('📍 Target URL:', this.scriptUrl);
    console.log('📦 Data to send:', JSON.stringify(data).substring(0, 200) + '...');
    
    try {
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      console.log('✅ Request sent successfully (no-cors mode)');
      console.log('ℹ️ Note: With no-cors, we cannot read the response, but the request was sent');
      return true;
      
    } catch (error) {
      console.error('❌ ERROR sending to Google Sheets:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      throw error;
    }
  }
}

// Initialize analytics on page load
window.addEventListener('DOMContentLoaded', () => {
  console.log('🎬 Initializing comprehensive analytics...');
  
  if (GOOGLE_SCRIPT_URL && !GOOGLE_SCRIPT_URL.includes('YOUR_SCRIPT_URL')) {
    const analytics = new DebugWebsiteAnalytics(GOOGLE_SCRIPT_URL);
    console.log('✅ Analytics initialized successfully');
  } else {
    console.warn('⚠️ Analytics URL not configured. Please update GOOGLE_SCRIPT_URL');
  }
});